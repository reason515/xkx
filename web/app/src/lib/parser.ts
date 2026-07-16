import type {
  ExitInfo,
  InvItem,
  RoomState,
  ScoreAttr,
  ScoreInfo,
  SkillRow,
  SuggestedAction,
  Vitals,
  Entity,
} from "./types";

const DIR_MAP: Record<string, string> = {
  north: "北",
  south: "南",
  east: "东",
  west: "西",
  northeast: "东北",
  northwest: "西北",
  southeast: "东南",
  southwest: "西南",
  up: "上",
  down: "下",
  northup: "北上",
  southup: "南上",
  eastup: "东上",
  westup: "西上",
  northdown: "北下",
  southdown: "南下",
  eastdown: "东下",
  westdown: "西下",
  enter: "进",
  out: "出",
};

const PAD_SLOTS: (string | null)[][] = [
  ["northwest", "north", "northeast"],
  ["west", null, "east"],
  ["southwest", "south", "southeast"],
];

const EXIT_LINE_RE =
  /这里(?:明显的出口|唯一的出口|没有任何明显的出路)/;
const ROOM_TITLE_RE = /^(.+?)\s*-\s*\S*\s*$/;

/** Pull the latest look block out of a noisy buffer (MOTD / login / prior rooms). */
export function extractLookBlock(text: string): string {
  // Prefer the latest exit line (classic look), else the latest room title
  // so rooms without exits (e.g. 挂名处 before exits were set) still update.
  const exitMatches = [...text.matchAll(new RegExp(EXIT_LINE_RE.source, "g"))];
  const lastExit = exitMatches[exitMatches.length - 1];
  const titleMatches = [
    ...text.matchAll(new RegExp(ROOM_TITLE_RE.source, "gm")),
  ];
  const lastTitle = titleMatches[titleMatches.length - 1];

  let start = -1;
  if (lastExit?.index !== undefined) {
    const before = text.slice(0, lastExit.index);
    const titlesBefore = [
      ...before.matchAll(new RegExp(ROOM_TITLE_RE.source, "gm")),
    ];
    const title = titlesBefore[titlesBefore.length - 1];
    start =
      title?.index !== undefined
        ? title.index
        : Math.max(0, lastExit.index - 1200);
    // If a newer title appears after the last exit line, that look has no exits yet
    if (
      lastTitle?.index !== undefined &&
      lastTitle.index > lastExit.index
    ) {
      start = lastTitle.index;
    }
  } else if (lastTitle?.index !== undefined) {
    start = lastTitle.index;
  }

  if (start < 0) {
    return text.length > 4000 ? text.slice(-4000) : text;
  }

  let block = text.slice(start);
  // Drop trailing non-look command echoes / prompts
  const cut = block.search(/\n(?:>\s*|目前权限|上次连线)/);
  if (cut > 0) block = block.slice(0, cut);
  return block;
}

function pushExit(exits: ExitInfo[], dirRaw: string, name?: string) {
  const dir = dirRaw.trim().toLowerCase();
  if (!dir || !/^[a-z]+$/.test(dir)) return;
  const entry: ExitInfo = { dir, label: DIR_MAP[dir] || dir };
  if (name) entry.name = name.trim();
  exits.push(entry);
}

export function parseExits(text: string): ExitInfo[] {
  const exits: ExitInfo[] = [];

  const none = text.match(/这里没有任何明显的出路/);
  if (none) return exits;

  const unique = text.match(/这里唯一的出口是\s*([a-zA-Z]+)/);
  if (unique) {
    pushExit(exits, unique[1]);
    return exits;
  }

  const m = text.match(/这里?明显的出口[是：:]\s*(.+)/);
  if (!m) {
    // legacy fixture: 「明显的出口是 north 北大街」 without「这里」
    const legacy = text.match(/明显的出口[是：:]\s*(.+)/);
    if (!legacy) return exits;
    return parseExitBody(legacy[1]);
  }
  return parseExitBody(m[1]);
}

function parseExitBody(raw: string): ExitInfo[] {
  const exits: ExitInfo[] = [];
  const body = raw
    .replace(/。[\s\S]*$/, "")
    .replace(/\s+和\s+/g, "、")
    .trim();

  // Real look.c: "east、up 和 west" (dirs only) or mixed commas
  const parts = body.split(/[,，、]/).map((p) => p.trim()).filter(Boolean);
  for (const p of parts) {
    const named = p.match(/^([a-zA-Z]+)\s+(\S+)$/);
    if (named) {
      pushExit(exits, named[1], named[2]);
    } else {
      pushExit(exits, p.replace(/[^a-zA-Z]/g, ""));
    }
  }
  return exits;
}

function parseLookInventory(text: string): {
  npcs: RoomState["npcs"];
  items: RoomState["items"];
} {
  const npcs: RoomState["npcs"] = [];
  const items: RoomState["items"] = [];

  // Classic web fixture: 「这里有店小二和一张木桌」
  const here = text.match(/这里(?:有|摆着|放着)([^。\n]+)/);
  if (here) {
    for (const n of here[1].split(/[、和,，]/)) {
      const name = n.trim();
      if (!name) continue;
      if (/店小二|掌柜|老板|行人|乞丐|士兵|官兵|小二/.test(name)) {
        npcs.push({ id: name, name, kind: "npc" });
      } else {
        items.push({ id: name, name, kind: "item" });
      }
    }
    return { npcs, items };
  }

  // Real look.c: inventory shorts after the exit line; if no exit line, scan
  // lines after the room title (no-exit rooms like 挂名处).
  let invLines: string;
  const afterExit = text.split(EXIT_LINE_RE)[1];
  if (afterExit) {
    invLines = afterExit.replace(/^[^\n]*\n/, "");
  } else {
    const titleIdx = text.search(new RegExp(ROOM_TITLE_RE.source, "m"));
    if (titleIdx < 0) return { npcs, items };
    const afterTitle = text.slice(titleIdx).split("\n").slice(1);
    invLines = afterTitle.join("\n");
  }
  for (const line of invLines.split("\n")) {
    const name = line
      .trim()
      .replace(/^挡着往.+/, "")
      .replace(/挡着往.+$/, "")
      .replace(/骑在.+$/, "")
      .replace(/坐在镖车上$/, "")
      .trim();
    if (!name || name.length < 2) continue;
    if (/^\?+$/.test(name)) continue;
    if (/^>/.test(name)) break;
    if (/精[：:]|气[：:]|目前权限|上次连线/.test(name)) break;
    // Skip long description paragraphs (no entity id)
    if (name.length > 40 && !/\([A-Za-z]|（[A-Za-z]/.test(name)) continue;
    // Living shorts usually carry english id in () / （）
    if (/\([A-Za-z][\w\s]*\)|（[A-Za-z][\w\s]*）/.test(name)) {
      npcs.push(parseEntityShort(name, "npc"));
    } else if (!/^[这那你我他她其极海阳]/.test(name)) {
      items.push(parseEntityShort(name, "item"));
    }
  }
  return { npcs, items };
}

/** `木老七（Mu laoqi）` → id=mu laoqi, name=木老七 */
export function parseEntityShort(
  short: string,
  kind: "npc" | "item" = "npc"
): Entity {
  const m = short
    .trim()
    .match(/^(.+?)\s*[（(]\s*([A-Za-z][\w\s]*)\s*[）)]\s*$/);
  if (m) {
    return {
      id: m[2].trim().toLowerCase(),
      name: m[1].trim(),
      kind,
    };
  }
  return { id: short.trim(), name: short.trim(), kind };
}

export function parseRoom(text: string): Partial<RoomState> {
  const block = extractLookBlock(text);
  const lines = block.split("\n").map((l) => l.trim()).filter(Boolean);
  const room: Partial<RoomState> = {
    exits: [],
    npcs: [],
    items: [],
  };

  if (lines.length) {
    const titleLine = lines[0];
    const titled = titleLine.match(/^(.+?)\s*-\s*/);
    room.title = (titled ? titled[1] : titleLine)
      .replace(/[\[\]【】]/g, "")
      .trim();
    const descLines: string[] = [];
    for (let i = 1; i < lines.length; i++) {
      if (EXIT_LINE_RE.test(lines[i])) break;
      if (/这里(?:有|摆着|放着)/.test(lines[i])) break;
      descLines.push(lines[i]);
    }
    if (descLines.length) room.desc = descLines.join("\n");
  }

  room.exits = parseExits(block);
  const inv = parseLookInventory(block);
  room.npcs = inv.npcs;
  room.items = inv.items;

  return room;
}

/** Lines that belong to login banners / MOTD boilerplate, not gameplay 见闻. */
export function isLoginNoise(line: string): boolean {
  return /BIG5|Do you want to use|Ok, use (?:BIG5|GB) code|有任何意见|请\s*email|万维网家页|egroups\.com|您的英文名字|请输入密码|请设定您的密码|目前权限|上次连线地址|记住随时存档|HELP RULES|本游戏致力于发展中文网络文字游戏/i.test(
    line
  );
}

/** Structured Web protocol frames / payloads that must not appear in 见闻. */
export function isProtocolNoise(line: string): boolean {
  return /@@JSON@@|@@ENDJSON@@|"type"\s*:\s*"(?:room\.update|player\.vitals|assist\.status|train\.event|combat\.event)"/.test(
    line
  );
}

/** Telnet-style more pager prompt; Web clients should never surface this. */
export function isMorePromptLine(line: string): boolean {
  return /未完继续|继续下一页|n 或\s*<ENTER>|q 离开/.test(line);
}

/**
 * Commands whose full output belongs in a reading panel (帮助 / 告示牌),
 * not as scene action chips or 见闻 dumps.
 */
export function isDocReadingCommand(command: string): boolean {
  const verb = command.trim().split(/\s+/)[0]?.toLowerCase() || "";
  return verb === "help" || verb === "list" || verb === "read";
}

/** Verbs commonly hinted in room/NPC text; unknown english verbs are skipped. */
const ACTION_VERBS: Record<string, string> = {
  follow: "跟随",
  register: "挂名登记",
  ask: "打听",
  learn: "学",
  xue: "学",
  enter: "进入",
  knock: "敲",
  yell: "呼喊",
  serve: "要些吃喝",
  wield: "装备",
  wear: "穿上",
  accept: "应战",
  trap: "设陷",
  get: "拿起",
  open: "打开",
  push: "推",
  pull: "拉",
  search: "搜寻",
  dig: "挖",
  kneel: "跪拜",
  swim: "游",
  move: "搬动",
  fishing: "垂钓",
  help: "查看说明",
  list: "浏览留言",
  read: "阅读",
  climb: "爬",
  jump: "跳",
  remove: "脱下",
};

/** Common skill ids → Chinese when prose does not supply a name. */
const SKILL_LABELS: Record<string, string> = {
  force: "内功",
  dodge: "轻功",
  parry: "招架",
  strike: "掌法",
  cuff: "拳法",
  claw: "爪法",
  finger: "指法",
  hand: "手法",
  unarmed: "拳脚",
  sword: "剑法",
  blade: "刀法",
  stick: "棒法",
  staff: "杖法",
  whip: "鞭法",
  throwing: "暗器",
  hammer: "锤法",
  axe: "斧法",
  spear: "枪法",
  club: "棍法",
  literate: "读书识字",
};

/** Room/item ids often written as 中文(id) but are not skills. */
const NON_SKILL_IDS = new Set([
  "fall",
  "tree",
  "lake",
  "stone",
  "board",
  "door",
  "gate",
  "boat",
  "ship",
  "wall",
  "table",
  "bed",
  "chair",
]);

const HELP_TOPIC_LABELS: Record<string, string> = {
  board: "留言板说明",
  rules: "查看规则说明",
};

/** Universal ask topics from INQUIRY_D; prefer Chinese labels in UI. */
const ASK_TOPIC_LABELS: Record<string, string> = {
  name: "姓名",
  here: "此地",
  rumors: "江湖传闻",
};

const SKIP_ACTION_VERBS = new Set([
  "look",
  "go",
  "say",
  "tell",
  "quit",
  "hp",
  "score",
  "skills",
  "inventory",
  "i",
  "l",
]);

/** Verbs that need a target; bare `(get)`-style tutorial hints are not actionable. */
const TARGET_REQUIRED_VERBS = new Set([
  "get",
  "wield",
  "wear",
  "open",
  "push",
  "pull",
  "trap",
  "knock",
  "follow",
  "ask",
  "feed",
  "give",
  "drop",
  "steal",
  "hit",
  "kill",
  "accept",
  "help",
  "read",
  "climb",
  "jump",
  "remove",
]);

function displayNameForTarget(target: string, npcs: Entity[] = []): string {
  const key = target.toLowerCase();
  const npc = npcs.find(
    (n) => n.id.toLowerCase() === key || n.id.toLowerCase().includes(key)
  );
  if (npc) return npc.name;
  return target;
}

export function labelSuggestedAction(
  command: string,
  npcs: Entity[] = []
): string {
  const parts = command.trim().split(/\s+/);
  const verb = (parts[0] || "").toLowerCase();
  const verbLabel = ACTION_VERBS[verb];
  if (!verbLabel) return command;

  if (verb === "follow" && parts[1]) {
    return `${verbLabel}${displayNameForTarget(parts.slice(1).join(" "), npcs)}`;
  }
  if (verb === "register") {
    return "挂名登记";
  }
  if (verb === "help") {
    const topic = (parts[1] || "").toLowerCase();
    if (topic && HELP_TOPIC_LABELS[topic]) return HELP_TOPIC_LABELS[topic];
    if (topic) return `查看「${topic}」说明`;
    return verbLabel;
  }
  if (verb === "list") return "浏览留言";
  if (verb === "climb" && parts[1]) {
    if (/^tree$/i.test(parts[1])) return "爬树取雨衣";
    return `爬${parts.slice(1).join(" ")}`;
  }
  if (verb === "jump" && parts[1]) {
    const where = parts.slice(1).join(" ");
    if (/^fall$/i.test(where)) return "跳进瀑布";
    return `跳向${where}`;
  }
  if (verb === "wear" && parts[1]) {
    const what = parts.slice(1).join(" ");
    if (/rain\s*coat|^coat$/i.test(what)) return "穿上雨衣";
    return `${verbLabel}${what}`;
  }
  if (verb === "remove" && parts[1]) {
    const what = parts.slice(1).join(" ");
    if (/^cloth$/i.test(what)) return "脱下布衣";
    if (/^all$/i.test(what)) return "脱下全部";
    return `脱下${what}`;
  }
  if (verb === "read") {
    const arg = (parts[1] || "").toLowerCase();
    if (arg === "new" || arg === "next") return "读新留言";
    if (/^\d+$/.test(arg)) return `阅读第${arg}条`;
    if (arg) return `阅读${parts.slice(1).join(" ")}`;
    return "阅读留言";
  }
  if (verb === "ask" && parts[1]) {
    const who = displayNameForTarget(parts[1], npcs);
    const aboutIdx = parts.findIndex((p) => p.toLowerCase() === "about");
    if (aboutIdx >= 0 && parts[aboutIdx + 1]) {
      const topic = parts.slice(aboutIdx + 1).join(" ");
      const topicLabel = ASK_TOPIC_LABELS[topic.toLowerCase()] || topic;
      return `向${who}打听${topicLabel}`;
    }
    return `向${who}打听`;
  }
  if ((verb === "learn" || verb === "xue") && parts[1] && parts[2]) {
    const who = displayNameForTarget(parts[1], npcs);
    const skill = parts[2].toLowerCase();
    const skillLabel = SKILL_LABELS[skill] || skill;
    return `向${who}学${skillLabel}`;
  }
  if (verb === "enter" && parts.length === 1) return "上船";
  if (verb === "knock" && parts[1]) return `敲${parts.slice(1).join(" ")}`;
  if (verb === "wield" && parts[1]) {
    return `${verbLabel}${parts.slice(1).join(" ")}`;
  }
  if (verb === "accept" && parts[1]) return `${verbLabel}${parts.slice(1).join(" ")}`;
  if (parts.length === 1) return verbLabel;
  return `${verbLabel}${parts.slice(1).join(" ")}`;
}

/** Split "(ask fu about 侠客岛，ask fu about 离岛)" into separate commands. */
function splitCombinedHint(raw: string): string[] {
  return raw
    .split(/[,，;；]\s*(?=[a-z])/i)
    .map((p) => p.trim())
    .filter(Boolean);
}

function normalizeActionCommand(raw: string): string | null {
  let cmd = raw
    .replace(/^请键入\s*/i, "")
    .replace(/\s+/g, " ")
    .trim();
  if (!cmd || cmd.length > 80) return null;
  const parts = cmd.split(/\s+/);
  let verb = parts[0]?.toLowerCase();
  if (!verb || !/^[a-z][a-z0-9_\-]*$/.test(verb)) return null;
  if (SKIP_ACTION_VERBS.has(verb)) return null;
  if (!ACTION_VERBS[verb]) return null;
  if (TARGET_REQUIRED_VERBS.has(verb) && parts.length === 1) return null;
  // learn|xue <teacher> <skill> [times]
  if (verb === "learn" || verb === "xue") {
    if (parts.length < 3) return null;
    // Prefer learn for stable UI keys / labels
    if (verb === "xue") {
      parts[0] = "learn";
      cmd = parts.join(" ");
      verb = "learn";
    }
  }
  return cmd;
}

/**
 * Pick a single token for mud commands that use `sscanf("%s about %s")`
 * (multi-word english ids like `yu fu` break bare ask). Prefer last id token.
 */
export function mudCommandTarget(id: string, name: string): string {
  const idTrim = (id || "").trim();
  if (idTrim && /^[a-z][\w]*$/i.test(idTrim)) return idTrim.toLowerCase();
  // Multi-word english id: last token is usually the short alias (yu fu → fu)
  if (idTrim && /^[a-z][\w]*(\s+[a-z][\w]*)+$/i.test(idTrim)) {
    const parts = idTrim.toLowerCase().split(/\s+/).filter(Boolean);
    return parts[parts.length - 1];
  }
  const nameTrim = (name || "").trim();
  if (nameTrim && !/\s/.test(nameTrim)) return nameTrim;
  return nameTrim || idTrim;
}

/** Topic-only label for ask chips inside the entity sheet. */
export function labelAskTopic(command: string): string {
  const parts = command.trim().split(/\s+/);
  const aboutIdx = parts.findIndex((p) => p.toLowerCase() === "about");
  if (aboutIdx < 0 || !parts[aboutIdx + 1]) return "打听";
  const topic = parts.slice(aboutIdx + 1).join(" ");
  return ASK_TOPIC_LABELS[topic.toLowerCase()] || topic;
}

function askCommandMatchesEntity(
  command: string,
  id: string,
  name: string
): boolean {
  const m = command.trim().match(/^ask\s+(.+?)\s+about\s+\S+/i);
  if (!m) return false;
  const who = m[1].trim().toLowerCase();
  const idL = (id || "").trim().toLowerCase();
  const nameL = (name || "").trim().toLowerCase();
  const targetL = mudCommandTarget(id, name).toLowerCase();
  if (who === targetL || who === idL || who === nameL) return true;
  if (!idL) return false;
  const idParts = idL.split(/\s+/).filter(Boolean);
  return idParts.includes(who) || idL.endsWith(` ${who}`);
}

/**
 * Ask topics the player can tap for a given NPC: known scene hints,
 * optional list output from bare `ask <who>`, plus name/here/rumors.
 */
export function buildAskTopicActions(
  id: string,
  name: string,
  hinted: SuggestedAction[] = [],
  listText = "",
  npcs: Entity[] = []
): SuggestedAction[] {
  const target = mudCommandTarget(id, name);
  const found = new Map<string, SuggestedAction>();

  const consider = (command: string) => {
    const cmd = command.trim().replace(/\s+/g, " ");
    if (!/^ask\s+\S.+\s+about\s+\S/i.test(cmd)) return;
    if (
      !askCommandMatchesEntity(cmd, id, name) &&
      !cmd.toLowerCase().startsWith(`ask ${target.toLowerCase()} about`)
    ) {
      return;
    }
    // Normalize who → preferred target so duplicate hints collapse
    const aboutIdx = cmd.toLowerCase().indexOf(" about ");
    const topic = aboutIdx >= 0 ? cmd.slice(aboutIdx + 7).trim() : "";
    if (!topic) return;
    const normalized = `ask ${target} about ${topic}`;
    if (found.has(normalized)) return;
    found.set(normalized, {
      command: normalized,
      label: labelAskTopic(normalized),
    });
  };

  for (const a of hinted) consider(a.command);
  for (const a of parseSuggestedActions(listText, npcs)) consider(a.command);
  for (const topic of ["name", "here", "rumors"]) {
    consider(`ask ${target} about ${topic}`);
  }
  return [...found.values()];
}

/** NPC speech that advertises teachable skills. */
const TEACH_OFFER_RE =
  /(?:可)?向我学|跟我学|可以向我学|跟我学点|可向.+?学|专管传授/;

/** Chinese label + english skill id, e.g. 掌法(strike). */
const SKILL_PAIR_RE =
  /([\u4e00-\u9fff]{1,12})\(([a-z][a-z0-9_\-]{1,30})\)/gi;

const SPEAKER_RE = /([^\n\r。！？]{1,24}?)(?:说道|问道|喊道|笑道|答道)[：:]/;

function resolveLearnTeacher(
  speakerName: string | undefined,
  npcs: Entity[]
): { target: string; name: string } | null {
  if (speakerName) {
    const nameL = speakerName.trim();
    const npc = npcs.find(
      (n) =>
        n.name === nameL ||
        nameL.includes(n.name) ||
        n.name.includes(nameL) ||
        (n.id && nameL.toLowerCase() === n.id.toLowerCase())
    );
    if (npc) {
      return {
        target: mudCommandTarget(npc.id, npc.name),
        name: npc.name,
      };
    }
    // Speaker known but room list not yet updated — Chinese who still works for learn
    if (nameL && !/\s/.test(nameL)) {
      return { target: nameL, name: nameL };
    }
  }
  if (npcs.length === 1) {
    const n = npcs[0];
    return { target: mudCommandTarget(n.id, n.name), name: n.name };
  }
  return null;
}

function learnCommandMatchesEntity(
  command: string,
  id: string,
  name: string
): boolean {
  const m = command.trim().match(/^(?:learn|xue)\s+(\S+)\s+(\S+)/i);
  if (!m) return false;
  const who = m[1].trim().toLowerCase();
  const idL = (id || "").trim().toLowerCase();
  const nameL = (name || "").trim().toLowerCase();
  const targetL = mudCommandTarget(id, name).toLowerCase();
  if (who === targetL || who === idL || who === nameL) return true;
  if (!idL) return false;
  const idParts = idL.split(/\s+/).filter(Boolean);
  return idParts.includes(who) || idL.endsWith(` ${who}`);
}

/** Topic-only label for learn chips inside the entity sheet. */
export function labelLearnTopic(command: string): string {
  const parts = command.trim().split(/\s+/);
  if (parts.length < 3) return "学";
  const skill = parts[2].toLowerCase();
  return SKILL_LABELS[skill] || skill;
}

/**
 * From NPC greetings like「你可向我学掌法(strike)，内功(force)…」
 * build learn <teacher> <skill> chips. Also covers explicit (xue id skill).
 */
export function parseLearnOfferActions(
  text: string,
  npcs: Entity[] = []
): SuggestedAction[] {
  const found = new Map<string, SuggestedAction>();

  const consider = (command: string, label?: string) => {
    const cmd = normalizeActionCommand(command);
    if (!cmd || !/^learn\s+\S+\s+\S+/i.test(cmd)) return;
    if (found.has(cmd)) return;
    found.set(cmd, {
      command: cmd,
      label: label || labelSuggestedAction(cmd, npcs),
    });
  };

  // Explicit (xue shi literate) / (learn dizi strike) — also in parseSuggestedActions,
  // but re-run here so callers that only use parseLearnOfferActions still get them.
  for (const m of text.matchAll(
    /\(((?:learn|xue)\s+[a-z][a-z0-9_\-]*(?:\s+[a-z][a-z0-9_\-]*){1,3})\)/gi
  )) {
    consider(m[1]);
  }

  if (!TEACH_OFFER_RE.test(text)) return [...found.values()];

  const speaker = text.match(SPEAKER_RE)?.[1]?.trim();
  const teacher = resolveLearnTeacher(speaker, npcs);
  if (!teacher) return [...found.values()];

  SKILL_PAIR_RE.lastIndex = 0;
  for (const m of text.matchAll(SKILL_PAIR_RE)) {
    const cn = m[1];
    const skill = m[2].toLowerCase();
    if (NON_SKILL_IDS.has(skill)) continue;
    if (ACTION_VERBS[skill] && !SKILL_LABELS[skill]) continue;
    const command = `learn ${teacher.target} ${skill}`;
    consider(command, `向${teacher.name}学${cn}`);
  }

  return [...found.values()];
}

/**
 * Learn topics the player can tap for a given NPC:
 * scene learn chips + optional `skills <who>` panel (师父/配偶可查)。
 */
export function buildLearnTopicActions(
  id: string,
  name: string,
  hinted: SuggestedAction[] = [],
  skillsText = ""
): SuggestedAction[] {
  const target = mudCommandTarget(id, name);
  const found = new Map<string, SuggestedAction>();

  const consider = (command: string, label?: string) => {
    const cmd = command.trim().replace(/\s+/g, " ");
    if (!/^(?:learn|xue)\s+\S+\s+\S+/i.test(cmd)) return;
    if (
      !learnCommandMatchesEntity(cmd, id, name) &&
      !cmd.toLowerCase().startsWith(`learn ${target.toLowerCase()} `) &&
      !cmd.toLowerCase().startsWith(`xue ${target.toLowerCase()} `)
    ) {
      return;
    }
    const parts = cmd.split(/\s+/);
    const skill = parts[2];
    if (!skill) return;
    const normalized = `learn ${target} ${skill.toLowerCase()}`;
    if (found.has(normalized) && !label) return;
    found.set(normalized, {
      command: normalized,
      label: label || found.get(normalized)?.label || labelLearnTopic(normalized),
    });
  };

  for (const a of hinted) consider(a.command);
  for (const a of parseSkillsPanelLearnActions(skillsText, target)) {
    consider(a.command, a.label);
  }
  return [...found.values()];
}

/**
 * From `skills <师父>` / `cha <师父>` output lines like
 * `基本掌法 (strike) - 初学乍练  30/123` build learn chips.
 * Returns [] when the MUD refuses（非师徒/配偶）.
 */
export function parseSkillsPanelLearnActions(
  text: string,
  teacherTarget: string
): SuggestedAction[] {
  if (!text.trim()) return [];
  if (/你要察看谁的技能/.test(text)) return [];
  if (/目前并没有学会任何技能|不会任何技能/.test(text)) return [];

  const found = new Map<string, SuggestedAction>();
  // skills.c: to_chinese(id) + " (" + id + ")"
  for (const m of text.matchAll(
    /([\u4e00-\u9fff][\u4e00-\u9fffA-Za-z0-9_\-·\s]{0,24}?)\s*\(([a-z][a-z0-9_\-]{1,30})\)/g
  )) {
    const cn = m[1].replace(/\s+/g, "").trim();
    const skill = m[2].toLowerCase();
    if (!cn || NON_SKILL_IDS.has(skill)) continue;
    if (ACTION_VERBS[skill] && !SKILL_LABELS[skill]) continue;
    const command = `learn ${teacherTarget} ${skill}`;
    if (found.has(command)) continue;
    found.set(command, {
      command,
      label: cn || SKILL_LABELS[skill] || skill,
    });
  }
  return [...found.values()];
}

/**
 * Extract clickable actions from NPC/room hints like `(follow mu laoqi)`.
 */
export function parseSuggestedActions(
  text: string,
  npcs: Entity[] = []
): SuggestedAction[] {
  const found = new Map<string, SuggestedAction>();

  const consider = (raw: string) => {
    const command = normalizeActionCommand(raw);
    if (!command || found.has(command)) return;
    // help / list / read → 顶栏帮助或告示牌面板，不进场景动作
    if (isDocReadingCommand(command)) return;
    found.set(command, {
      command,
      label: labelSuggestedAction(command, npcs),
    });
  };

  // Highlighted hints: (follow mu laoqi) / (ask fu about 侠客岛)
  for (const m of text.matchAll(/\(([a-z][a-z0-9_\-]*(?:\s+[^()\n]{0,80})?)\)/gi)) {
    for (const part of splitCombinedHint(m[1])) {
      consider(part);
    }
  }
  // 「请键入 follow mu laoqi」— capture until punctuation / line end
  for (const m of text.matchAll(/请键入\s*([a-z][^。)\n\]]{0,60})/gi)) {
    consider(m[1].trim());
  }

  return [...found.values()];
}

/**
 * From board `list` / look output lines like `[ 1]  title…`, offer read chips.
 */
export function parseBoardReadActions(
  text: string,
  limit = 8
): SuggestedAction[] {
  const found = new Map<string, SuggestedAction>();
  for (const line of text.split(/\r?\n/)) {
    const m = line.match(/\[\s*(\d+)\]\s*(.*)/);
    if (!m) continue;
    const num = m[1];
    const title = (m[2].split(/\s{2,}/)[0] || "").trim();
    const command = `read ${num}`;
    if (found.has(command)) continue;
    found.set(command, {
      command,
      label: title
        ? title.length > 16
          ? `阅读「${title.slice(0, 16)}…」`
          : `阅读「${title}」`
        : labelSuggestedAction(command),
    });
    if (found.size >= limit) break;
  }
  return [...found.values()];
}

export function mergeSuggestedActions(
  prev: SuggestedAction[],
  next: SuggestedAction[],
  npcs: Entity[] = [],
  limit = 12
): SuggestedAction[] {
  const map = new Map<string, SuggestedAction>();
  for (const a of [...prev, ...next]) {
    map.set(a.command, {
      command: a.command,
      label: labelSuggestedAction(a.command, npcs),
    });
  }
  return [...map.values()].slice(-limit);
}

/**
 * Newbie beach greeters (张三/李四): if their greeting was swallowed before
 * the client entered the game, still expose a follow chip from room NPCs.
 * Ask topics are not injected here — only text hints go to 场景动作；其余走人物「问」。
 */
export function beachGreeterActions(
  roomTitle: string | undefined,
  npcs: Entity[] = []
): SuggestedAction[] {
  if (!roomTitle || !/沙滩/.test(roomTitle)) return [];
  const out: SuggestedAction[] = [];
  for (const n of npcs) {
    const id = (n.id || "").toLowerCase();
    if (id === "zhang san" || id === "li si" || /张三|李四/.test(n.name)) {
      const command = `follow ${id.includes(" ") || /^[a-z]/.test(id) ? id : n.id}`;
      const cmd =
        id === "zhang san" || /张三/.test(n.name)
          ? "follow zhang san"
          : id === "li si" || /李四/.test(n.name)
            ? "follow li si"
            : command;
      out.push({ command: cmd, label: labelSuggestedAction(cmd, npcs) });
    }
  }
  return out;
}

/**
 * 瀑布进洞：无命令行时需点选爬树 / 穿雨衣 / 跳瀑。
 */
export function waterfallPassageActions(
  roomTitle: string | undefined
): SuggestedAction[] {
  if (!roomTitle || !/瀑布/.test(roomTitle)) return [];
  return [
    { command: "climb tree", label: "爬树取雨衣" },
    { command: "remove cloth", label: "脱下布衣" },
    { command: "wear rain coat", label: "穿上雨衣" },
    { command: "jump fall", label: "跳进瀑布" },
  ];
}

export function parseHp(text: string): Vitals {
  const v: Vitals = {};
  const jing = text.match(/精[：:]\s*(\d+)\/\s*(\d+)/);
  if (jing) {
    v.jing = +jing[1];
    v.effJing = +jing[1];
    v.maxJing = +jing[2];
  }
  const qi = text.match(/气[：:]\s*(\d+)\/\s*(\d+)/);
  if (qi) {
    v.qi = +qi[1];
    v.effQi = +qi[1];
    v.maxQi = +qi[2];
  }
  const jingli = text.match(/精力[：:]\s*(\d+)\s*\/\s*(\d+)/);
  if (jingli) {
    v.jingli = +jingli[1];
    v.maxJingli = +jingli[2];
  }
  const neili = text.match(/内力[：:]\s*(\d+)\s*\/\s*(\d+)/);
  if (neili) {
    v.neili = +neili[1];
    v.maxNeili = +neili[2];
  }
  const food = text.match(/食物[：:]\s*(\d+)\/\s*(\d+)/);
  if (food) {
    v.food = +food[1];
    v.maxFood = +food[2];
  }
  const water = text.match(/饮水[：:]\s*(\d+)\/\s*(\d+)/);
  if (water) {
    v.water = +water[1];
    v.maxWater = +water[2];
  }
  const pot = text.match(/潜能[：:]\s*(\d+)\s*\/\s*(\d+)/);
  if (pot) {
    v.potential = +pot[1];
    v.maxPotential = +pot[2];
  }
  const exp = text.match(/经验[：:]\s*(\d+)/);
  if (exp) v.exp = +exp[1];
  return v;
}

export function parseSkills(text: string): SkillRow[] {
  const rows: SkillRow[] = [];
  const lines = text.split("\n");
  for (const line of lines) {
    const m = line.match(/^([□\s]*)([\u4e00-\u9fff]+)\s+[-─]+\s*(\d+)/);
    if (m) {
      rows.push({
        id: m[2],
        name: m[2],
        level: +m[3],
        learned: 0,
        category: "misc",
        mastery: 1,
        equipped: m[1].includes("□"),
      });
    }
  }
  return rows;
}

export function parseInventory(text: string): InvItem[] {
  const items: InvItem[] = [];
  const lines = text.split("\n");
  for (const line of lines) {
    const m = line.match(/^([□\s]*)(.+?)（(.+?)）/);
    if (m) {
      const type = m[3];
      items.push({
        id: m[2],
        name: m[2],
        type,
        equipped: m[1].includes("□"),
      });
    }
  }
  return items;
}

export function isCombatLine(text: string): boolean {
  return /(?:攻击|闪避|招架|受伤|气血|致命|死亡|停手|逃跑|出招|一招)/.test(text);
}

export function isTrainLine(text: string): boolean {
  return /(?:打坐|吐纳|练功|缓缓|盘膝|调息)/.test(text);
}

const SKILL_MASTERY =
  /初学乍练|粗通皮毛|半生不熟|马马虎虎|驾轻就熟|出类拔萃|神乎其技|出神入化|登峰造极|一代宗师|新学乍用|初窥门径|略知一二|已有小成|心领神会|了然於胸|豁然贯通|举世无双|震古铄今|深不可测/;

/** True when this text chunk is a score / skills / inventory panel dump. */
export function isSheetDumpChunk(chunk: string): boolean {
  if (/【侠客行个人档案】/.test(chunk)) return true;
  if (/个人档案/.test(chunk) && /中文/.test(chunk)) return true;
  if (/膂力/.test(chunk) && /悟性/.test(chunk) && /根骨/.test(chunk)) return true;
  if (/目前所学过的技能|目前并没有学会任何技能|项(?:知识|基本功夫|特殊功夫)/.test(chunk))
    return true;
  if (
    /身上带[着著]下列|目前你身上没有任何东西|身上没有携带任何东西|负重\s*\d+\s*%/.test(
      chunk
    )
  )
    return true;
  return false;
}

/** Character-panel dumps (hp / score / skills / inventory) belong in 角色卡片, not 见闻. */
export function isSheetDumpLine(line: string, chunk?: string): boolean {
  const t = line.trim();
  if (!t) return false;
  if (/你要看什么？/.test(t)) return true;
  if (/^>\s*(look\s+me|hp|score|skills|inventory|i)\b/i.test(t)) return true;
  if (/【侠客行个人档案】/.test(t)) return true;
  if (/个人档案/.test(t) && /中文/.test(t)) return true;
  // score rank + short: 【 布  衣 】张三(Zhang San) — 勿单靠【】以免误伤【公告】等
  if (/^【[^】]{1,12}】/.test(t) && /\([A-Za-z][A-Za-z0-9_\- ]*\)\s*$/.test(t))
    return true;
  if (/膂力/.test(t) && /悟性/.test(t) && /根骨/.test(t)) return true;
  if (/你是一.+岁.+个月的/.test(t)) return true;
  if (/你的师父是|你的(?:妻子|丈夫|配偶)是|你到目前为止总共(?:杀了|死了)/.test(t))
    return true;
  if (/攻击力/.test(t) && /防御力/.test(t)) return true;
  // hp numeric rows + score bar / empty vitals labels (新人精力/内力常为空)
  if (/^[ \t]*(精|气|精力|内力|食物|饮水|潜能|经验)\s*[：:]/.test(t)) return true;
  if (/^[ \t]*神\s*[：:]/.test(t)) return true;
  if (/^[ \t]*阅历\s*[：:]/.test(t)) return true;
  if (/^[■□\s]+$/.test(t)) return true;
  if (
    /目前所学过的技能|目前并没有学会任何技能|你不会任何技能|身上带[着著]下列|目前身上带[着著]|目前你身上没有任何东西|身上没有携带任何东西|负重\s*\d+\s*%/.test(
      t
    )
  )
    return true;
  // skills boxed UI (cmds/skill/skills.c)
  if (/[┌└│]/.test(t) && (/项(?:知识|基本功夫|特殊功夫)/.test(t) || /[─━]{4,}/.test(t) || /\d+\s*\/\s*\d+/.test(t) || SKILL_MASTERY.test(t)))
    return true;
  if (SKILL_MASTERY.test(t) && /\d+\s*\/\s*\d+/.test(t)) return true;
  if (/^[□\s]*[\u4e00-\u9fff][\u4e00-\u9fff\s]*\s+[-─]{2,}\s*\d+/.test(t)) return true;
  if (/^[□√].+（[^）]+）\s*$/.test(t)) return true;
  if (
    /^.{1,40}（(?:武器|防具|衣物|食物|饮料|药物|钱币|金钱|杂物|其它|其他|物品)）\s*$/.test(
      t
    )
  )
    return true;
  // equipped inventory / look-me gear: □布衣(Cloth)
  if (/^[□√]\s*.+\([A-Za-z][A-Za-z0-9_\- ]*\)\s*$/.test(t)) return true;
  // unequipped inventory shorts only when this chunk is clearly an inventory dump
  // (avoid swallowing room look NPC lines like "  渔夫(Fu)")
  if (
    chunk &&
    /身上带[着著]下列|目前你身上没有任何东西|身上没有携带任何东西|负重\s*\d+\s*%/.test(
      chunk
    ) &&
    /^.{1,60}\([A-Za-z][A-Za-z0-9_\- ]*\)\s*$/.test(t) &&
    !/说道|问道|喊道|向.+打听/.test(t)
  )
    return true;
  // score / skills chunk extras (rank without 【 already handled; leftover shorts)
  if (
    chunk &&
    isSheetDumpChunk(chunk) &&
    /^.{1,60}\([A-Za-z][A-Za-z0-9_\- ]*\)\s*$/.test(t) &&
    !/说道|问道|喊道|向.+打听/.test(t) &&
    (/【/.test(chunk) || /膂力|所学过的技能|负重|身上带/.test(chunk))
  )
    return true;
  return false;
}

/** Self look-me narrative lines (仪容), not room/NPC chatter. */
export function isSelfLookLine(line: string): boolean {
  const t = line.trim();
  if (!t) return false;
  if (/^你看起来/.test(t)) return true;
  if (/身上带[着著]：/.test(t)) return true;
  if (/看起来约.+[岁歲]/.test(t)) return true;
  if (/并没有受伤|气血充盈|受了点伤|气血和畅/.test(t) && /^你/.test(t))
    return true;
  if (/^[□\s]+.+\([A-Za-z][^)]*\)\s*$/.test(t)) return true;
  return false;
}

/** Drop decorative score banner; keep the rest of the dump. */
export function stripScoreBanner(text: string): string {
  return text
    .replace(/^[^\n]*【侠客行个人档案】[^\n]*\n*/m, "")
    .replace(/^[^\n]*个人档案[^\n]*中文[^\n]*\n*/m, "")
    .replace(/^\s*\n+/, "");
}

function parseAttrPair(block: string, label: string): ScoreAttr | undefined {
  const re = new RegExp(
    `${label}[：:]\\s*\\[\\s*(\\d+)\\s*/\\s*(\\d+)\\s*\\]`
  );
  const m = block.match(re);
  if (!m) return undefined;
  return { cur: +m[1], base: +m[2] };
}

/** Parse score dump into structured archive fields (skip terminal bar clutter). */
export function parseScore(text: string): ScoreInfo {
  const body = stripScoreBanner(text);
  const info: ScoreInfo = {};

  const bio = body.match(/你是一[^。\n]+。/);
  if (bio) info.bio = bio[0].trim();

  const master = body.match(/你的师父是([^。\n]+)/);
  if (master) info.master = master[1].trim();

  const spouse = body.match(/你的(妻子|丈夫|配偶)是([^。\n]+)/);
  if (spouse) info.spouse = `${spouse[1]}：${spouse[2].trim()}`;

  const attrs: ScoreInfo["attrs"] = {};
  const str = parseAttrPair(body, "膂力");
  const intel = parseAttrPair(body, "悟性");
  const con = parseAttrPair(body, "根骨");
  const dex = parseAttrPair(body, "身法");
  if (str) attrs.str = str;
  if (intel) attrs.int = intel;
  if (con) attrs.con = con;
  if (dex) attrs.dex = dex;
  if (Object.keys(attrs).length) info.attrs = attrs;

  const exp = body.match(/经验[：:]\s*(-?\d+)/);
  if (exp) info.exp = +exp[1];
  const shen = body.match(/神\s*[：:]\s*(-?\d+)/);
  if (shen) info.shen = +shen[1];
  const quest = body.match(/阅历[：:]\s*(-?\d+)/);
  if (quest) info.questExp = +quest[1];

  const atk = body.match(/攻击力\s*[：:]\s*(-?\d+)/);
  if (atk) info.attack = +atk[1];
  const def = body.match(/防御力\s*[：:]\s*(-?\d+)/);
  if (def) info.defense = +def[1];

  const kills = body.match(/总共杀了\s*(\d+)\s*个人[^，\n]*，其中有\s*(\d+)\s*个/);
  if (kills) {
    info.kills = +kills[1];
    info.playerKills = +kills[2];
  }
  const deaths = body.match(/总共死了\s*(\d+)\s*次[^，\n]*，其中\s*(\d+)\s*次/);
  if (deaths) {
    info.deaths = +deaths[1];
    info.normalDeaths = +deaths[2];
  }

  // Headline: first meaningful line before bio / attrs
  for (const line of body.split("\n")) {
    const t = line.trim();
    if (!t) continue;
    if (/你是一|膂力|精\s*[：:]|气\s*[：:]|经验|神\s*[：:]/.test(t)) break;
    if (/^[■□\s]+$/.test(t)) continue;
    info.headline = t;
    break;
  }

  return info;
}

/** @deprecated Prefer parseScore + structured UI; kept for fallback plain text. */
export function buildScoreHtml(text: string, htmlLines?: string[]): string {
  const plain = stripScoreBanner(text);
  if (!plain.trim()) return "";

  // Drop terminal graph lines and banner leftovers; keep prose / attrs / totals.
  const lines = plain.split("\n").filter((line) => {
    const t = line.trim();
    if (!t) return false;
    if (/[■□]/.test(t)) return false;
    if (/^[ \t]*(精|气|精力|内力|食物|饮水|潜能)\s*[：:]/.test(t)) return false;
    return true;
  });

  if (htmlLines?.length) {
    const kept: string[] = [];
    for (const html of htmlLines) {
      const plainLine = html.replace(/<[^>]+>/g, "");
      if (/【侠客行个人档案】/.test(plainLine)) continue;
      if (/个人档案/.test(plainLine) && /中文/.test(plainLine)) continue;
      if (/[■□]/.test(plainLine)) continue;
      if (/^[ \t]*(精|气|精力|内力|食物|饮水|潜能)\s*[：:]/.test(plainLine))
        continue;
      if (!plainLine.trim()) continue;
      kept.push(html);
    }
    return kept.join("\n");
  }

  return lines
    .join("\n")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

/** Terminal display width: CJK / fullwidth ≈ 2 columns. */
export function displayWidth(text: string): number {
  let w = 0;
  for (const ch of text) {
    const cp = ch.codePointAt(0) ?? 0;
    if (
      cp >= 0x1100 &&
      (cp <= 0x115f ||
        cp === 0x2329 ||
        cp === 0x232a ||
        (cp >= 0x2e80 && cp <= 0xa4cf) ||
        (cp >= 0xac00 && cp <= 0xd7a3) ||
        (cp >= 0xf900 && cp <= 0xfaff) ||
        (cp >= 0xfe10 && cp <= 0xfe19) ||
        (cp >= 0xfe30 && cp <= 0xfe6f) ||
        (cp >= 0xff00 && cp <= 0xff60) ||
        (cp >= 0xffe0 && cp <= 0xffe6))
    ) {
      w += 2;
    } else {
      w += 1;
    }
  }
  return w;
}

const SOFT_WRAP_FULL = 74;
const SOFT_WRAP_MIN_INCOMPLETE = 40;

/** True when `prev`/`next` look like one prose line split for an 80-col terminal. */
export function shouldJoinSoftWrap(prev: string, next: string): boolean {
  if (!prev.trim() || !next.trim()) return false;
  // Indented / list / separator → new structural line
  if (/^[ \t]/.test(next)) return false;
  const n = next.trimStart();
  if (/^\[/.test(n)) return false;
  if (/^[【■□◎※─—\-={}]/.test(n)) return false;

  const p = prev.replace(/\s+$/g, "");
  // Sentence / clause already finished
  if (/[。！？；：…」』】]$/.test(p)) return false;
  if (/[.!?]$/.test(p)) return false;

  const pw = displayWidth(p);
  if (pw >= SOFT_WRAP_FULL) return true;
  // Author soft-wrap mid-phrase (e.g. say 「…等你\n功夫…」)
  if (pw >= SOFT_WRAP_MIN_INCOMPLETE && /[\u4e00-\u9fffA-Za-z0-9]$/.test(p))
    return true;
  return false;
}

function softWrapJoinSep(prevPlain: string, nextPlain: string): string {
  return /[A-Za-z0-9]$/.test(prevPlain) && /^[A-Za-z0-9]/.test(nextPlain)
    ? " "
    : "";
}

export type SoftWrapEntry = { text: string; html?: string };

/** Merge soft-wrapped MUD lines so 见闻 shows continuous prose. */
export function reflowSoftWrappedEntries(
  entries: SoftWrapEntry[]
): SoftWrapEntry[] {
  const out: SoftWrapEntry[] = [];
  for (const entry of entries) {
    const last = out[out.length - 1];
    if (last && shouldJoinSoftWrap(last.text, entry.text)) {
      const sep = softWrapJoinSep(last.text.replace(/\s+$/g, ""), entry.text);
      last.text = last.text.replace(/\s+$/g, "") + sep + entry.text;
      if (last.html != null || entry.html != null) {
        last.html = (last.html ?? "") + sep + (entry.html ?? "");
      }
    } else {
      out.push({ text: entry.text, html: entry.html });
    }
  }
  return out;
}

export { PAD_SLOTS, DIR_MAP };
