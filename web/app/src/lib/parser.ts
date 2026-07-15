import type {
  ExitInfo,
  InvItem,
  RoomState,
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

/** Verbs commonly hinted in room/NPC text; unknown english verbs are skipped. */
const ACTION_VERBS: Record<string, string> = {
  follow: "跟随",
  register: "挂名登记",
  ask: "打听",
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
};

const SKIP_ACTION_VERBS = new Set([
  "help",
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
  if (verb === "ask" && parts[1]) {
    const who = displayNameForTarget(parts[1], npcs);
    const aboutIdx = parts.findIndex((p) => p.toLowerCase() === "about");
    if (aboutIdx >= 0 && parts[aboutIdx + 1]) {
      return `向${who}打听${parts.slice(aboutIdx + 1).join(" ")}`;
    }
    return `向${who}打听`;
  }
  if (verb === "enter" && parts.length === 1) return "上船";
  if (verb === "knock" && parts[1]) return `敲${parts.slice(1).join(" ")}`;
  if ((verb === "wield" || verb === "wear") && parts[1]) {
    return `${verbLabel}${parts.slice(1).join(" ")}`;
  }
  if (verb === "accept" && parts[1]) return `${verbLabel}${parts.slice(1).join(" ")}`;
  if (parts.length === 1) return verbLabel;
  return `${verbLabel}${parts.slice(1).join(" ")}`;
}

function normalizeActionCommand(raw: string): string | null {
  const cmd = raw
    .replace(/^请键入\s*/i, "")
    .replace(/\s+/g, " ")
    .trim();
  if (!cmd || cmd.length > 80) return null;
  const verb = cmd.split(/\s+/)[0]?.toLowerCase();
  if (!verb || !/^[a-z][a-z0-9_\-]*$/.test(verb)) return null;
  if (SKIP_ACTION_VERBS.has(verb)) return null;
  if (!ACTION_VERBS[verb]) return null;
  return cmd;
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
    found.set(command, {
      command,
      label: labelSuggestedAction(command, npcs),
    });
  };

  // Highlighted hints: (follow mu laoqi) / (ask fu about 侠客岛)
  for (const m of text.matchAll(/\(([a-z][a-z0-9_\-]*(?:\s+[^()\n]{0,40})?)\)/gi)) {
    consider(m[1]);
  }
  // 「请键入 follow mu laoqi」— capture until punctuation / line end
  for (const m of text.matchAll(/请键入\s*([a-z][^。)\n\]]{0,60})/gi)) {
    consider(m[1].trim());
  }

  return [...found.values()];
}

export function mergeSuggestedActions(
  prev: SuggestedAction[],
  next: SuggestedAction[],
  npcs: Entity[] = [],
  limit = 8
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
  return /(?:打坐|吐纳|练功|内力|潜能|精力|缓缓|盘膝|调息)/.test(text);
}

export { PAD_SLOTS, DIR_MAP };
