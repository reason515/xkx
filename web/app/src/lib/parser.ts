import type {
  EnabledSkill,
  ExitInfo,
  InvAction,
  InvEquipKind,
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
    if (descLines.length) {
      room.desc = descLines.join("\n");
      room.canSleep = roomAllowsSleep({
        title: room.title,
        desc: room.desc,
      });
    }
  }

  room.exits = parseExits(block);
  const inv = parseLookInventory(block);
  room.npcs = inv.npcs;
  room.items = mergeRoomItems(
    inv.items,
    parseSceneryFromDesc(room.desc || block)
  );
  if (
    room.canSleep == null &&
    roomAllowsSleep({ title: room.title, desc: room.desc })
  ) {
    room.canSleep = true;
  }

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

/** Dialogue / event narrative that must stay in 见闻 (not room look structure). */
const ROOM_LOOK_KEEP =
  /说道|问道|喊道|叫道|向.+打听|你向|你从|脱了下来|装备著|装备着|穿上|戴上/;
/** Static room long after opening a passage — belongs in scene, not 见闻 / refresh loop. */
const ROOM_LOOK_STATIC_PASSAGE =
  /已被拉开|已拉开|已打开|已推开|已露出/;

/**
 * True when this chunk is (or contains) a classic room look dump:
 * title + long / exits / room inventory shorts.
 */
export function isRoomLookChunk(chunk: string): boolean {
  if (!chunk?.trim()) return false;
  if (EXIT_LINE_RE.test(chunk)) return true;
  if (/这里没有任何明显的出路/.test(chunk)) return true;
  const lines = chunk.split(/\r?\n/);
  const hasTitle = lines.some((l) => {
    const t = l.trim();
    return ROOM_TITLE_RE.test(t) || /^.+?\s+-\s*$/.test(t);
  });
  if (!hasTitle) return false;
  const hasEntityShort = lines.some(
    (l) =>
      /^\s*.{1,60}\([A-Za-z][A-Za-z0-9_\- ]*\)\s*$/.test(l) &&
      !ROOM_LOOK_KEEP.test(l)
  );
  const hasIndentedDesc = lines.some((l) => /^\s{2,}\S/.test(l));
  return hasEntityShort || hasIndentedDesc;
}

/**
 * Room look structure belongs in the scene panel, not 见闻.
 * When chunk is a look dump, suppress the whole structure including soft-wrapped
 * (unindented) description continuations — only dialogue/event lines are kept.
 */
export function isRoomLookLine(line: string, chunk?: string): boolean {
  const t = line.trim();
  if (!t) return false;
  // Exit lines are always scene structure
  if (EXIT_LINE_RE.test(t) || /这里没有任何明显的出路/.test(t)) return true;
  // Keep event / dialogue even if mixed into a look-sized chunk
  if (ROOM_LOOK_KEEP.test(t) && !ROOM_LOOK_STATIC_PASSAGE.test(t)) return false;
  // User command echoes are never room look
  if (/^>\s*\S/.test(t)) return false;

  const inLook = !!chunk && isRoomLookChunk(chunk);
  if (!inLook) return false;

  // Full look dump (title / long / soft-wraps / entity shorts) → scene only
  return true;
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
  unlock: "开锁",
  qu: "乘车去",
  goto: "乘车去",
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
  sleep: "睡觉",
  study: "领悟",
  du: "研读",
  lingwu: "领悟",
  hit: "击打",
  /** 练功木桩等场景动作（非技能 id；技能中文见 SKILL_LABELS） */
  strike: "击打",
  pa: "爬",
  zhai: "摘",
  za: "砸开",
  xia: "下车",
  bath: "洗澡",
  hire: "雇车",
  withdraw: "取款",
  deposit: "存款",
  fill: "装水",
  zhuang: "装水",
  drink: "喝水",
  halt: "停手",
  zuan: "钻",
  leave: "离开",
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
  "move",
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
  "strike",
  "kill",
  "qu",
  "xia",
  "bath",
  "hire",
  "gu",
  "accept",
  "help",
  "read",
  "climb",
  "jump",
  "fill",
  "zhuang",
  "drink",
  "remove",
  "study",
  "du",
  "lingwu",
  "pa",
  "zuan",
]);

/**
 * Verbs that often appear bare in long text (`钻(zuan)进石缝`) but also bind
 * to a nearby scenery id when one exists (`洞(hole)…钻(zuan)` → zuan hole).
 */
const OPTIONAL_TARGET_VERBS = new Set(["zuan", "leave", "swim", "serve"]);

/** Common MUD English item/object ids → Chinese display name. */
const COMMON_ITEM_LABELS: Record<string, string> = {
  hulu: "葫芦",
  gourd: "葫芦",
  coconut: "椰子",
  yezi: "椰子",
  fish: "鱼",
  fruit: "野果",
  guo: "野果",
  book: "书",
  sword: "剑",
  gangjian: "钢剑",
  jiandao: "剪刀",
  cloth: "布衣",
  coat: "雨衣",
  raincoat: "雨衣",
  yuyi: "雨衣",
  shoes: "鞋",
  bag: "布袋",
  xiang: "箱子",
  lu: "火炉",
  guolu: "锅炉",
  huo: "火",
  zhuo: "桌",
  chuang: "床",
  bed: "床",
  tub: "浴桶",
  yutong: "浴桶",
  jitui: "鸡腿",
  chicken: "鸡腿",
  wine: "酒",
  jiuhu: "酒壶",
  shaojiu: "烧酒",
  "shao daozi": "烧刀子",
  shidaozi: "烧刀子",
  jili: "鸡肋",
  rou: "肉",
  dan: "丹",
  yao: "药",
  jinchuang: "金创药",
  yangjing: "养精丹",
  heshi: "食盒",
  shihe: "食盒",
  "yao pu": "药铺",
  yaopu: "药铺",
  "tiejiang pu": "铁匠铺",
  tiejiangpu: "铁匠铺",
  "jiu pu": "酒铺",
  jiupu: "酒铺",
  "zahuo pu": "杂货铺",
  zahuopu: "杂货铺",
  "piao hao": "票号",
  piaohao: "票号",
  "che ma hang": "车马行",
  chemahang: "车马行",
  hill: "山坡",
  path: "山路",
  river: "溪流",
  creek: "溪流",
  waterfall: "瀑布",
  water: "水",
  fire: "火",
  wall: "石壁",
  stone: "大石",
  hole: "石洞",
  dong: "洞",
  gate: "门",
  door: "门",
  men: "门",
  bottle: "瓶子",
  ping: "瓶子",
  "jiu ping": "酒瓶",
  jiuping: "酒瓶",
  sheng: "绳索",
  ladder: "梯子",
  boat: "船",
  cart: "大车",
  carriage: "大车",
  corpse: "尸体",
  shitou: "石头",
  yaoqian: "钥匙",
  key: "钥匙",
  jin: "金子",
  gold: "金子",
  silver: "银子",
  coin: "铜钱",
  };

function displayNameForTarget(target: string, npcs: Entity[] = [], items?: Entity[]): string {
  const key = target.toLowerCase();
  // Direction words
  if (DIR_MAP[key]) return DIR_MAP[key];
  // NPC names
  const npc = npcs.find(
    (n) => n.id.toLowerCase() === key || n.id.toLowerCase().includes(key)
  );
  if (npc) return npc.name;
  // Room item names
  if (items) {
    const item = items.find(
      (i) => i.id.toLowerCase() === key || i.id.toLowerCase().includes(key)
    );
    if (item) return item.name;
  }
  // Common item label map
  if (COMMON_ITEM_LABELS[key]) return COMMON_ITEM_LABELS[key];
  // Multi-word fallback: try individual words
  if (key.includes(" ")) {
    const parts = key.split(/\s+/);
    if (parts.every((p) => !!/^[a-z]+$/.test(p) && COMMON_ITEM_LABELS[p])) {
      return parts.map((p) => COMMON_ITEM_LABELS[p] || p).join("");
    }
  }
  return target;
}

export function labelSuggestedAction(
  command: string,
  npcs: Entity[] = [],
  items?: Entity[]
): string {
  const parts = command.trim().split(/\s+/);
  const verb = (parts[0] || "").toLowerCase();
  const verbLabel = ACTION_VERBS[verb];
  if (!verbLabel) return command;
  const ent = (t: string) => displayNameForTarget(t, npcs, items);

  if (verb === "follow" && parts[1]) {
    return `${verbLabel}${ent(parts.slice(1).join(" "))}`;
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
    const where = parts.slice(1).join(" ");
    if (/^tree$/i.test(where)) return "爬树取雨衣";
    return `爬${ent(where)}`;
  }
  if (verb === "pa" && parts[1]) {
    const where = parts.slice(1).join(" ");
    if (/^tree$/i.test(where) || where === "树") return "爬树摘椰子";
    if (/^up$/i.test(where)) return "爬上树";
    if (/^down$/i.test(where)) return "爬下树";
    return `爬${ent(where)}`;
  }
  if (verb === "zhai" && parts[1]) {
    if (/^guo$/i.test(parts[1]) || parts[1] === "果") return "摘野果";
    return `摘${ent(parts.slice(1).join(" "))}`;
  }
  if (verb === "za" && parts[1]) {
    if (/^yezi$|^ye$/i.test(parts[1]) || parts[1] === "椰子") return "砸开椰子";
    return `砸开${ent(parts.slice(1).join(" "))}`;
  }
  if (verb === "move" && parts[1]) {
    if (/^stone$/i.test(parts[1]) || parts[1] === "石") return "搬开大石";
    return `搬动${ent(parts.slice(1).join(" "))}`;
  }
  if (verb === "halt") return "停手";
  if (verb === "fishing") return "垂钓";
  if ((verb === "study" || verb === "lingwu") && parts[1]) {
    const what = parts.slice(1).join(" ");
    if (/^wall$/i.test(what)) return "领悟石壁";
    return `${verbLabel}${ent(what)}`;
  }
  if (verb === "du" && parts[1]) {
    const what = parts.slice(1).join(" ");
    if (/^book$/i.test(what)) return "研读书籍";
    return `研读${ent(what)}`;
  }
  if (verb === "hit" && parts[1]) {
    const what = parts.slice(1).join(" ");
    if (/^(?:mu)?zhuang$/i.test(what)) return "击打木桩";
    return `击打${ent(what)}`;
  }
  if (verb === "strike" && parts[1] && /^(?:mu)?zhuang$/i.test(parts[1])) {
    return "击打木桩";
  }
  if (verb === "jump" && parts[1]) {
    const where = parts.slice(1).join(" ");
    if (/^fall$/i.test(where)) return "跳进瀑布";
    if (/^down$/i.test(where)) return "跳下去";
    return `跳向${ent(where)}`;
  }
  if (verb === "zuan" && parts[1]) {
    const what = parts.slice(1).join(" ");
    if (/^hole$/i.test(what)) return "钻洞";
    return `钻${ent(what)}`;
  }
  if (verb === "fill" && parts[1]) {
    const what = ent(parts.slice(1).join(" "));
    return `${what}装水`;
  }
  if (verb === "wear" && parts[1]) {
    const what = parts.slice(1).join(" ");
    if (/rain\s*coat|^coat$/i.test(what)) return "穿上雨衣";
    return `${verbLabel}${ent(what)}`;
  }
  if (verb === "remove" && parts[1]) {
    const what = parts.slice(1).join(" ");
    if (/^cloth$/i.test(what)) return "脱下布衣";
    if (/^all$/i.test(what)) return "脱下全部";
    return `脱下${ent(what)}`;
  }
  if (verb === "read") {
    const arg = (parts[1] || "").toLowerCase();
    if (arg === "new" || arg === "next") return "读新留言";
    if (/^\d+$/.test(arg)) return `阅读第${arg}条`;
    if (arg) return `阅读${parts.slice(1).join(" ")}`;
    return "阅读留言";
  }
  if (verb === "ask" && parts[1]) {
    const who = ent(parts[1]);
    const aboutIdx = parts.findIndex((p) => p.toLowerCase() === "about");
    if (aboutIdx >= 0 && parts[aboutIdx + 1]) {
      const topic = parts.slice(aboutIdx + 1).join(" ");
      const topicLabel = ASK_TOPIC_LABELS[topic.toLowerCase()] || topic;
      return `向${who}打听${topicLabel}`;
    }
    return `向${who}打听`;
  }
  if ((verb === "learn" || verb === "xue") && parts[1] && parts[2]) {
    const who = ent(parts[1]);
    const skill = parts[2].toLowerCase();
    const skillLabel = SKILL_LABELS[skill] || skill;
    return `向${who}学${skillLabel}`;
  }
  if (verb === "enter" && parts.length === 1) return "上船";
  if (verb === "knock" && parts[1]) return `敲${ent(parts.slice(1).join(" "))}`;
  if (verb === "open" && parts[1]) {
    const what = parts.slice(1).join(" ");
    if (/^(enter|out|north|south|east|west|up|down)$/i.test(what)) {
      return "打开门";
    }
    return `打开${ent(what)}`;
  }
  if (verb === "unlock" && parts[1]) {
    return `${parts.slice(1).join(" ")}上着锁`;
  }
  if ((verb === "qu" || verb === "goto") && parts[1]) {
    return `乘车去${ent(parts.slice(1).join(" "))}`;
  }
  if (verb === "wield" && parts[1]) {
    return `${verbLabel}${ent(parts.slice(1).join(" "))}`;
  }
  if (verb === "accept" && parts[1]) return `${verbLabel}${ent(parts.slice(1).join(" "))}`;
  if (verb === "sleep") return "睡觉";
  if (parts.length === 1) return verbLabel;
  return `${verbLabel}${ent(parts.slice(1).join(" "))}`;
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
  // Bare (get)/(move) tutorial noise is skipped; optional-target verbs like
  // zuan may appear without an object (`钻(zuan)进石缝`).
  if (
    TARGET_REQUIRED_VERBS.has(verb) &&
    parts.length === 1 &&
    !OPTIONAL_TARGET_VERBS.has(verb)
  )
    return null;
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
  // 木桩练功：房间描写偶写 (hit zhuang)，实际 add_action 是 strike
  if (
    verb === "hit" &&
    parts[1] &&
    /^(?:mu)?zhuang$/i.test(parts[1])
  ) {
    parts[0] = "strike";
    cmd = parts.join(" ");
  }
  return cmd;
}

/**
 * Shared last-token aliases that collide when many NPCs use them
 * (山顶「黄衣弟子」+「中伯」都有 dizi → present 会指错人)。
 */
const GENERIC_ID_SUFFIXES = new Set([
  "dizi",
  "ren",
  "shi",
  "han",
  "tong",
  "pu",
]);

/**
 * Pick a single token for mud commands that use `sscanf("%s …")`
 * (multi-word english ids like `yu fu` break bare ask).
 *
 * Prefer server `commandId` when present. For multi-word ids, last token is
 * usually the short alias (yu fu → fu), but avoid generic suffixes like
 * `dizi` that collide across NPCs — then use the first token (huangyi dizi → huangyi).
 */
export function mudCommandTarget(
  id: string,
  name: string,
  commandId?: string
): string {
  const cmd = (commandId || "").trim();
  if (cmd && /^[a-z][\w]*$/i.test(cmd)) return cmd.toLowerCase();

  const idTrim = (id || "").trim();
  if (idTrim && /^[a-z][\w]*$/i.test(idTrim)) return idTrim.toLowerCase();
  if (idTrim && /^[a-z][\w]*(\s+[a-z][\w]*)+$/i.test(idTrim)) {
    const parts = idTrim.toLowerCase().split(/\s+/).filter(Boolean);
    const last = parts[parts.length - 1];
    const first = parts[0];
    if (
      GENERIC_ID_SUFFIXES.has(last) &&
      first &&
      !GENERIC_ID_SUFFIXES.has(first)
    ) {
      return first;
    }
    return last;
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
  name: string,
  commandId?: string
): boolean {
  const m = command.trim().match(/^ask\s+(.+?)\s+about\s+\S+/i);
  if (!m) return false;
  const who = m[1].trim().toLowerCase();
  const idL = (id || "").trim().toLowerCase();
  const nameL = (name || "").trim().toLowerCase();
  const cmdL = (commandId || "").trim().toLowerCase();
  const targetL = mudCommandTarget(id, name, commandId).toLowerCase();
  if (who === targetL || who === idL || who === nameL || (cmdL && who === cmdL))
    return true;
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
  npcs: Entity[] = [],
  commandId?: string
): SuggestedAction[] {
  const target = mudCommandTarget(id, name, commandId);
  const found = new Map<string, SuggestedAction>();

  const consider = (command: string) => {
    const cmd = command.trim().replace(/\s+/g, " ");
    if (!/^ask\s+\S.+\s+about\s+\S/i.test(cmd)) return;
    if (
      !askCommandMatchesEntity(cmd, id, name, commandId) &&
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

/** Chinese label + english skill id, e.g. 掌法(strike). Keep label short. */
const SKILL_PAIR_RE =
  /([\u4e00-\u9fff]{1,6})\(([a-z][a-z0-9_\-]{1,30})\)/gi;

/** Prefer a Chinese name immediately before 说道 (avoid lazy 1-char match on 弟子→子). */
const SPEAKER_RE =
  /([\u4e00-\u9fff]{2,12})(?:说道|问道|喊道|笑道|答道)[：:]/;

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
        target: mudCommandTarget(npc.id, npc.name, npc.commandId),
        name: npc.name,
      };
    }
    // Bare Chinese fallback only when room NPC list is empty (not yet synced).
    // If npcs is non-empty but speaker isn't among them, skip — avoid attributing
    // 黄衣弟子的传授提示 to 中伯 when both appear in the same 见闻 blob.
    if (npcs.length === 0 && nameL && !/\s/.test(nameL)) {
      return { target: nameL, name: nameL };
    }
  }
  if (npcs.length === 1) {
    const n = npcs[0];
    return {
      target: mudCommandTarget(n.id, n.name, n.commandId),
      name: n.name,
    };
  }
  return null;
}

function learnCommandMatchesEntity(
  command: string,
  id: string,
  name: string,
  commandId?: string
): boolean {
  const m = command.trim().match(/^(?:learn|xue)\s+(\S+)\s+(\S+)/i);
  if (!m) return false;
  const who = m[1].trim().toLowerCase();
  const idL = (id || "").trim().toLowerCase();
  const nameL = (name || "").trim().toLowerCase();
  const cmdL = (commandId || "").trim().toLowerCase();
  const targetL = mudCommandTarget(id, name, commandId).toLowerCase();
  if (who === targetL || who === idL || who === nameL || (cmdL && who === cmdL))
    return true;
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

export type VendorGood = {
  name: string;
  id: string;
  price: string;
  command: string;
};

export type DealerCategory = {
  id: "weapon" | "armor" | "drug" | "book" | "misc";
  label: string;
  command: string;
};

const DEALER_CATEGORIES: DealerCategory[] = [
  { id: "weapon", label: "兵器", command: "list weapon" },
  { id: "armor", label: "护具", command: "list armor" },
  { id: "drug", label: "药物", command: "list drug" },
  { id: "book", label: "书籍", command: "list book" },
  { id: "misc", label: "杂物", command: "list misc" },
];

/** Strip common MudOS/FluffOS ANSI color codes from list lines. */
function stripMudAnsi(s: string): string {
  return s.replace(/\x1b\[[0-9;]*m/g, "");
}

/** Parse the category prompt used by pawn shops without fixed vendor goods. */
export function parseDealerCategories(text: string): DealerCategory[] {
  const words = new Set(
    (text.toLowerCase().match(/\b(?:weapon|armor|drug|book|misc)\b/g) || [])
  );
  return DEALER_CATEGORIES.filter((category) => words.has(category.id));
}

/**
 * Parse F_DEALER `list` output into buy chips.
 * e.g. `烤鸡腿(Jitui)：五十文铜板` → buy jitui
 */
export function parseVendorGoods(text: string): VendorGood[] {
  const out: VendorGood[] = [];
  const seen = new Set<string>();
  for (const raw of text.split(/\r?\n/)) {
    const line = stripMudAnsi(raw).trim();
    if (!line) continue;
    if (
      /目前没有可以买|你想看哪一柜|你可以向.+购买|有下列.+出售/.test(line) &&
      !/\([A-Za-z]/.test(line)
    ) {
      continue;
    }
    const m = line.match(
      /^(.+?)\(([A-Za-z][\w\s-]*)\)\s*[：:]\s*(.+)$/
    );
    if (!m) continue;
    const name = m[1].replace(/\s+/g, " ").trim();
    const id = m[2].trim().toLowerCase().replace(/\s+/g, " ");
    let price = m[3].trim();
    price = price
      .replace(/[（(]还剩[^）)]*[）)]\s*$/, "")
      .trim();
    if (!name || !id || seen.has(id)) continue;
    seen.add(id);
    out.push({
      name,
      id,
      price,
      command: `buy ${id}`,
    });
  }
  return out;
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

  // Split by speaker so 中伯+黄衣弟子粘在同一段见闻时，各自技能不串台
  const segments = text.split(
    /(?=[\u4e00-\u9fff]{2,12}(?:说道|问道|喊道|笑道|答道)[：:])/
  );
  for (const segment of segments) {
    if (!TEACH_OFFER_RE.test(segment)) continue;
    const speaker = segment.match(SPEAKER_RE)?.[1]?.trim();
    const teacher = resolveLearnTeacher(speaker, npcs);
    if (!teacher) continue;

    SKILL_PAIR_RE.lastIndex = 0;
    for (const m of segment.matchAll(SKILL_PAIR_RE)) {
      const cn = m[1];
      const skill = m[2].toLowerCase();
      if (NON_SKILL_IDS.has(skill)) continue;
      if (ACTION_VERBS[skill] && !SKILL_LABELS[skill]) continue;
      const command = `learn ${teacher.target} ${skill}`;
      consider(command, `向${teacher.name}学${cn}`);
    }
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
  skillsText = "",
  commandId?: string,
  /** Recent 见闻 — re-parse teach offers if chips were dropped after room.update. */
  recentLog = ""
): SuggestedAction[] {
  const target = mudCommandTarget(id, name, commandId);
  const found = new Map<string, SuggestedAction>();
  const selfNpc: Entity[] = [
    { id, name, kind: "npc", commandId },
  ];

  const consider = (command: string, label?: string) => {
    const cmd = command.trim().replace(/\s+/g, " ");
    if (!/^(?:learn|xue)\s+\S+\s+\S+/i.test(cmd)) return;
    if (
      !learnCommandMatchesEntity(cmd, id, name, commandId) &&
      !cmd.toLowerCase().startsWith(`learn ${target.toLowerCase()} `) &&
      !cmd.toLowerCase().startsWith(`xue ${target.toLowerCase()} `)
    ) {
      return;
    }
    const parts = cmd.split(/\s+/);
    const skill = parts[2];
    if (!skill) return;
    const normalized = `learn ${target} ${skill.toLowerCase()}`;
    const topicLabel = labelLearnTopic(normalized);
    if (found.has(normalized) && !label) return;
    const prev = found.get(normalized)?.label;
    // skills 面板中文名优先；见闻噪声标签「向…学你可向我学剑法」改用短名
    const neat =
      label && /[\u4e00-\u9fff]/.test(label) && !/^向/.test(label)
        ? label
        : topicLabel !== "学"
          ? topicLabel
          : label || prev || topicLabel;
    found.set(normalized, { command: normalized, label: neat });
  };

  for (const a of hinted) consider(a.command, a.label);
  for (const a of parseLearnOfferActions(recentLog, selfNpc)) {
    consider(a.command, a.label);
  }
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
 * Learn / ask still parse into state for人物「学」「问」面板，但不上场景动作区
 * （见 `isEntitySheetAction` / `sceneActionChips`）。
 */
export function parseSuggestedActions(
  text: string,
  npcs: Entity[] = []
): SuggestedAction[] {
  const found = new Map<string, SuggestedAction>();

  const consider = (raw: string, label?: string) => {
    const command = normalizeActionCommand(raw);
    if (!command || found.has(command)) return;
    // help / list / read → 顶栏帮助或告示牌面板，不进场景动作
    if (isDocReadingCommand(command)) return;
    found.set(command, {
      command,
      label: label || labelSuggestedAction(command, npcs),
    });
  };

  // Highlighted hints: (follow mu laoqi) / (ask fu about 侠客岛)
  for (const m of text.matchAll(/\(([a-z][a-z0-9_\-]*(?:\s+[^()\n]{0,80})?)\)/gi)) {
    for (const part of splitCombinedHint(m[1])) {
      const bits = part.trim().split(/\s+/);
      const verb = bits[0]?.toLowerCase();
      // `get` is the newbie tutorial「捡起来(get)」generic pickup; real ground
      // items already surface via room.items, so never bind it to a noun.
      if (
        bits.length === 1 &&
        verb &&
        verb !== "get" &&
        TARGET_REQUIRED_VERBS.has(verb)
      ) {
        const hintAt = m.index || 0;
        const after = text.slice(hintAt + m[0].length, hintAt + m[0].length + 6);
        // Directional prose: 跳(jump)下去 / 爬(climb)上去 — not scenery targets
        if (verb === "jump" && /^下去/.test(after)) {
          consider("jump down", "跳下去");
          continue;
        }
        if (verb === "jump" && /^下来/.test(after)) {
          consider("jump down", "跳下来");
          continue;
        }
        // item_desc often says「大石…移开(move)」. Prefer the server's
        // current item marker; fall back to the nearest preceding id mention.
        const fullBefore = text.slice(0, hintAt);
        const before = text.slice(Math.max(0, hintAt - 180), hintAt);
        const markers = [
          ...fullBefore.matchAll(/@@ITEM:([a-z][a-z0-9_\-]{1,30})@@/gi),
        ];
        const currentItemId = markers[markers.length - 1]?.[1]?.toLowerCase();
        const mentions = [
          ...before.matchAll(
            /([\u4e00-\u9fff]{1,10})\s*[（(]\s*([a-z][a-z0-9_\-]{1,30})\s*[）)]/gi
          ),
        ];
        const nearest = mentions[mentions.length - 1];
        const sceneryId = currentItemId || nearest?.[2]?.toLowerCase();
        // Only bind when the target is a genuine scenery; skips false mentions
        // like「看看(look)」that are really skip/action verbs, not objects.
        const scenery = sceneryId
          ? parseSceneryFromDesc(text).find((item) => item.id === sceneryId)
          : undefined;
        if (sceneryId && scenery) {
          consider(
            `${verb} ${sceneryId}`,
            `${ACTION_VERBS[verb]}${scenery.name || sceneryId}`
          );
        } else if (OPTIONAL_TARGET_VERBS.has(verb)) {
          // 钻(zuan)进石缝 — no hole id nearby; bare verb is valid
          consider(part);
        }
        continue;
      }
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
 * Suggested actions embedded in room title/long (e.g. `(yell boat)`, `(sleep)`).
 * Used on room.update so chips do not depend on look text appearing in 见闻.
 */
export function suggestedActionsFromRoomText(
  desc: string,
  npcs: Entity[] = [],
  title = ""
): SuggestedAction[] {
  const text = [title, desc].filter(Boolean).join("\n");
  if (!text.trim()) return [];
  return mergeSuggestedActions(
    [
      ...parseSuggestedActions(text, npcs),
      ...parseLearnOfferActions(text, npcs),
      ...inferSceneryPracticeActions(text),
    ],
    [],
    npcs
  );
}

/**
 * Scenery that teaches by study/du/strike even when item_desc omits (study wall).
 * E.g. 大石壁(wall)、线装书(book)、木桩(zhuang|muzhuang)。
 * 注意：侠客岛木桩练功是 strike，不是战斗指令 hit。
 */
const SCENERY_PRACTICE: Record<
  string,
  { verb: string; label: string; nameHint?: RegExp }
> = {
  wall: { verb: "study", label: "领悟", nameHint: /石壁|岩壁|墙壁/ },
  book: { verb: "du", label: "研读", nameHint: /书|经|谱|册/ },
  zhuang: { verb: "strike", label: "击打", nameHint: /木桩|木椿/ },
  muzhuang: { verb: "strike", label: "击打", nameHint: /木桩|木椿/ },
};

export function sceneryPracticeActions(
  id: string,
  name = ""
): { label: string; command: string }[] {
  const idL = (id || "").toLowerCase().trim();
  if (!idL) return [];
  const rule = SCENERY_PRACTICE[idL];
  if (rule) {
    return [{ label: rule.label, command: `${rule.verb} ${idL}` }];
  }
  // Name-only fallback when id is unusual but label is clear
  if (/石壁|岩壁/.test(name)) {
    return [{ label: "领悟", command: `study ${idL}` }];
  }
  if (/书|经|谱|册/.test(name) && !/告示|留言/.test(name)) {
    return [{ label: "研读", command: `du ${idL}` }];
  }
  if (/木桩|木椿/.test(name)) {
    return [{ label: "击打", command: `strike ${idL}` }];
  }
  return [];
}

export function inferSceneryPracticeActions(desc: string): SuggestedAction[] {
  if (!desc) return [];
  const found = new Map<string, SuggestedAction>();
  for (const item of parseSceneryFromDesc(desc)) {
    for (const act of sceneryPracticeActions(item.id, item.name)) {
      if (found.has(act.command)) continue;
      found.set(act.command, {
        command: act.command,
        label: `${act.label}${item.name}`,
      });
    }
  }
  return [...found.values()];
}

/**
 * NPC-scoped actions that belong on the entity sheet (问 / 学), not scene chips.
 */
export function isEntitySheetAction(command: string): boolean {
  const verb = command.trim().split(/\s+/)[0]?.toLowerCase();
  return verb === "ask" || verb === "learn" || verb === "xue";
}

/** Scene「动作」chips: room utilities / follow / enter …, excluding 问/学. */
export function sceneActionChips(
  actions: SuggestedAction[]
): SuggestedAction[] {
  return actions.filter((a) => !isEntitySheetAction(a.command));
}

/**
 * Narrative that usually means exits / doors / passages changed in-place
 * (no move). Web UI should refresh room state (look / room.update).
 *
 * IMPORTANT: room long after opening keeps「屏风已被拉开，露出一条…」forever.
 * Soft-wrap / TCP fragments like「拉开，露出一条长长的甬道。」must NOT retrigger
 * look, or 见闻 will flood.
 */
export function suggestsRoomLayoutChange(text: string): boolean {
  if (!text) return false;
  if (isRoomLookChunk(text)) return false;
  // Static room-long after opening (and its TCP fragments) — never retrigger look.
  if (ROOM_LOOK_STATIC_PASSAGE.test(text)) return false;
  if (/屏风已被拉开|屏风已拉开/.test(text)) return false;
  if (/露出一条长长的甬道/.test(text) && !/(?:向旁|缓缓|你)/.test(text))
    return false;
  // Require an actor / motion cue — bare「露出…甬道」matches static long fragments.
  return (
    /(?:向旁|缓缓|你|忽然|突然).{0,16}(拉开|推开|打开)/.test(text) ||
    /打开了?.{0,12}(门|石门|出口)/.test(text) ||
    /石壁.{0,10}(移开|打开|裂开)/.test(text) ||
    /墙.{0,8}(移开|打开)/.test(text) ||
    /多了.{0,8}出口/.test(text) ||
    /一扇.{0,8}门.{0,10}开/.test(text)
  );
}

/** Room-long residue after a passage opens — never belongs in 见闻. */
export function isStaticPassageLine(line: string): boolean {
  const t = line.trim();
  if (!t) return false;
  if (ROOM_LOOK_STATIC_PASSAGE.test(t)) return true;
  if (/屏风/.test(t) && /拉开|露出/.test(t)) return true;
  // Soft-wrap / TCP fragments of the opened-passage description
  if (/露出一条长长的甬道/.test(t) && !/(?:向旁|缓缓|你)/.test(t)) return true;
  if (/^拉开，?露出/.test(t)) return true;
  return false;
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
  const all = [...map.values()];
  // 关门/开锁等场景关键动作优先保留，避免被 slice 挤掉
  const pinned = all.filter((a) => {
    const v = a.command.trim().split(/\s+/)[0]?.toLowerCase();
    // learn/ask 与开关门一样优先保留，避免被房间芯片挤掉后请教列表变空
    return (
      v === "open" ||
      v === "unlock" ||
      v === "close" ||
      v === "learn" ||
      v === "xue" ||
      v === "ask"
    );
  });
  const rest = all.filter((a) => !pinned.includes(a));
  return [...pinned, ...rest.slice(-(Math.max(0, limit - pinned.length)))];
}

/**
 * Newbie beach greeters (张三/李四): if their greeting was swallowed before
 * the client entered the game, still expose a follow chip from room NPCs.
 * Ask topics are not injected here — learn/ask go to人物「学」「问」；其余走场景动作。
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

/** 沙滩/海边椰子树：LPC `pa tree` / `climb tree` 摘椰子（兼练轻功）。 */
export function isCoconutTree(id: string, name: string): boolean {
  const idL = (id || "").toLowerCase();
  if (/yezi\s*tree|^tree$/i.test(idL) && /椰子/.test(name || "")) return true;
  return /椰子树/.test(name || "");
}

/** 行囊是否有砸椰子用的石块（shikuai）。 */
export function inventoryHasStone(items: InvItem[] = []): boolean {
  return items.some(
    (it) =>
      !it.embedded &&
      (/shikuai|shi\s*kuai|^stone$/i.test(it.id || "") || /石块|石头/.test(it.name || ""))
  );
}

/** 行囊是否有钓竿。 */
export function inventoryHasFishingPole(items: InvItem[] = []): boolean {
  return items.some(
    (it) =>
      !it.embedded &&
      (/fishing\s*pole|^pole$/i.test(it.id || "") || /钓竿|鱼杆|鱼竿/.test(it.name || ""))
  );
}

/**
 * 房间内椰子树 →「爬树摘椰子」。
 * 树为 no_get 物品，不能靠 get；与瀑布 climb tree（取雨衣）指令不同，用 pa tree。
 */
export function coconutTreeActions(room: {
  items?: Entity[];
}): SuggestedAction[] {
  if (!(room.items || []).some((it) => isCoconutTree(it.id, it.name))) return [];
  return [{ command: "pa tree", label: "爬树摘椰子" }];
}

/**
 * 山顶爬树摘果：山顶 `pa up`，树上 `zhai guo` / `pa down`。
 */
export function mountainFruitActions(
  roomTitle: string | undefined
): SuggestedAction[] {
  if (!roomTitle) return [];
  if (/山顶/.test(roomTitle)) {
    return [{ command: "pa up", label: "爬上树" }];
  }
  if (/^树上$|树上/.test(roomTitle) && !/椰子/.test(roomTitle)) {
    return [
      { command: "zhai guo", label: "摘野果" },
      { command: "pa down", label: "爬下树" },
    ];
  }
  return [];
}

/**
 * 望海亭钓鱼：搬石得竿 + 有竿时垂钓。
 * item_desc 虽有 (move)，环顾偶发漏芯片，故按房间标题补齐。
 */
export function fishingSpotActions(
  room: { title?: string },
  inventory: InvItem[] = []
): SuggestedAction[] {
  if (!/望海亭/.test(room.title || "")) return [];
  const out: SuggestedAction[] = [
    { command: "move stone", label: "搬开大石" },
  ];
  if (inventoryHasFishingPole(inventory)) {
    out.push({ command: "fishing", label: "垂钓" });
  }
  return out;
}

/**
 * 兵器房：描写写「随意取用」但无括号动作；把地上兵器做成「拿起…」场景 chip。
 * 若有黄衣仆人，再补「问仆人要武器」。
 */
export function weaponRoomActions(room: {
  title?: string;
  items?: Entity[];
  npcs?: Entity[];
}): SuggestedAction[] {
  if (!room.title || !/兵器房|武器库|兵器库/.test(room.title)) return [];
  const out: SuggestedAction[] = [];
  const seen = new Set<string>();
  for (const it of room.items || []) {
    if (it.scenery) continue;
    const kind = classifyInvEquip(it.id, it.name);
    if (kind !== "weapon" && !/刀|剑|枪|棍|棒|杖|鞭|锤|斧|匕|针|铲|锄/.test(it.name))
      continue;
    const target = invCommandTarget(it.id, it.name);
    if (!target) continue;
    const command = `get ${target}`;
    if (seen.has(command)) continue;
    seen.add(command);
    out.push({ command, label: `拿起${it.name}` });
  }
  const servant = (room.npcs || []).find(
    (n) =>
      /pu ren|^pu$|puren|da han|^han$/i.test(n.id || "") ||
      /仆人|大汉/.test(n.name || "")
  );
  if (servant) {
    // Prefer server commandId (e.g. pu); avoid mudCommandTarget「pu ren」→ ren
    const who =
      (servant.commandId && /^[a-z][\w]*$/i.test(servant.commandId)
        ? servant.commandId
        : ""
      ) ||
      (/^pu\b/i.test(servant.id || "")
        ? "pu"
        : /^da han$/i.test(servant.id || "")
          ? "han"
          : mudCommandTarget(servant.id, servant.name));
    out.push({
      command: `ask ${who} about 武器`,
      label: "问仆人要武器",
    });
  }
  return out;
}

/** Shut doors from room.update → scene「打开石门」chips. */
export function closedDoorActions(
  doors: { dir: string; name?: string; status?: string }[] | undefined
): SuggestedAction[] {
  if (!doors?.length) return [];
  const out: SuggestedAction[] = [];
  for (const d of doors) {
    if (!d.dir) continue;
    const name = (d.name || "门").trim() || "门";
    const target = /[\u4e00-\u9fff]/.test(name) ? name : d.dir;
    if (d.status === "locked") {
      out.push({ command: `unlock ${target}`, label: `${name}上着锁` });
      continue;
    }
    out.push({ command: `open ${target}`, label: `打开${name}` });
  }
  return out;
}

/**
 * When doors[] is missing but the room is clearly a shut gate (侠客岛石门),
 * still offer open — avoids a blank「动作」row if protocol/look raced.
 */
export function inferredShutDoorActions(room: {
  title?: string;
  desc?: string;
  exits?: { dir: string; label?: string }[];
  doors?: { dir: string; name?: string; status?: string }[];
}): SuggestedAction[] {
  const fromProtocol = closedDoorActions(room.doors);
  if (fromProtocol.length) return fromProtocol;
  const title = room.title || "";
  if (!/石门/.test(title)) return [];
  const hasEnter = (room.exits || []).some(
    (e) => e.dir === "enter" || e.label === "进"
  );
  if (hasEnter) return [];
  if (!/石门|厚重/.test(room.desc || title)) return [];
  return [{ command: "open 石门", label: "打开石门" }];
}

/** 侠客岛靠岸大车等：id/name 匹配。 */
export function isCarriageItem(id: string, name: string): boolean {
  const idL = (id || "").toLowerCase();
  if (/da\s*che|carriage/.test(idL) || idL === "che") return true;
  return /大车/.test(name || "");
}

/** Common `qu` destinations from xiakedao car.c (mobile chips). */
export const CARRIAGE_DESTINATIONS = [
  "扬州",
  "少林",
  "武当",
  "华山",
  "杭州",
  "泉州",
  "峨嵋",
  "大理",
] as const;

/**
 * 房间里有大车且几乎无出口（靠岸沙滩）时，提供乘车目的地芯片。
 */
export function carriageTravelActions(room: {
  items?: Entity[];
  exits?: { dir: string }[];
}): SuggestedAction[] {
  const items = room.items || [];
  if (!items.some((i) => isCarriageItem(i.id, i.name))) return [];
  if ((room.exits?.length ?? 0) > 2) return [];
  return CARRIAGE_DESTINATIONS.map((dest) => ({
    command: `qu ${dest}`,
    label: `乘车去${dest}`,
  }));
}

const SLEEP_TITLE_HINT = /休息室|卧室|厢房|禅房|睡房|寝室|雅房|客店/;

/** Whether this room likely allows `sleep` (LPC flag or title/desc). */
export function roomAllowsSleep(room: {
  title?: string;
  desc?: string;
  canSleep?: boolean;
}): boolean {
  if (room.canSleep) return true;
  if (room.title && SLEEP_TITLE_HINT.test(room.title)) return true;
  if (room.desc && /睡觉\s*[（(]\s*sleep\s*[）)]|\(sleep\)|可以在这里睡觉|在这里睡觉/.test(room.desc))
    return true;
  return false;
}

/** Room-scoped utility chips (sleep 等)，不依赖见闻里刚刷出的提示。 */
export function roomUtilityActions(room: {
  title?: string;
  desc?: string;
  canSleep?: boolean;
}): SuggestedAction[] {
  if (!roomAllowsSleep(room)) return [];
  return [{ command: "sleep", label: "睡觉" }];
}

/** Prose glue mistaken for scenery labels, e.g. 「好象可以钻(zuan)」. */
const SCENERY_NAME_NOISE =
  /可以|好象|似乎|只有|试试|不妨|想要|忍不住|不知|能不能/;

/** Parenthesized command hints can resemble scenery, e.g.「将毒蛇变(bian)」. */
const SCENERY_ACTION_TRAIL =
  /(?:将|把).{1,3}(?:变|砍|打破)$|(?:打|砍|炸|划|按|喊|叫|爬|钻|跳|攀|吃|喝|读|唱|睡|下车|开始|变|打破)$/;

/** Strip the player-facing lead-in from a real scenery noun:「你往山路」→「山路」。 */
function normalizeSceneryName(nameRaw: string): string {
  return nameRaw
    .replace(/^(?:你|我|他|她)(?:正(?:在)?|可(?:以)?|会|能|想|要)?(?:往|向|朝|从|对)?/, "")
    // 「长廊南头是大门(gate)」被贪婪匹配截到「头是大门」→「大门」
    .replace(/^.{1,3}(?:是|有)(?=[\u4e00-\u9fff]{1,4}$)/, "")
    .trim();
}

/**
 * Scenery in room long / item_desc hints: 小条子(tiaozi) → lookable item chip.
 * Skips known action verbs like sleep / enter / zuan.
 */
export function parseSceneryFromDesc(desc: string): Entity[] {
  if (!desc) return [];
  const found = new Map<string, Entity>();
  const addScenery = (
    idRaw: string,
    nameRaw: string,
    preserveRelation = false
  ) => {
    const id = idRaw.toLowerCase();
    if (SCENERY_ACTION_TRAIL.test(nameRaw)) return;
    // Strip prose glue / classifiers: 「是一道瀑布」→「瀑布」, 「旁的大石」→「大石」
    const stripped = normalizeSceneryName(nameRaw)
      .replace(/^(?:不时|时|这里|那里|水中|空中|左边|右边|西边|东边)?有/, "")
      // 「有些文字(word)」被通用括号匹配截到末尾时，不能展示量词残片。
      .replace(/^(?:一些|些)/, "")
      .replace(/^[是在于]/, "")
      .replace(
        /^[一两二三四五六七八九十几數数]*[张条个块面扇座间片本封只株棵道行]/,
        ""
      );
    // 「石头上的文字」携带玩家判断交互对象所需的载体信息，不能按普通
    // 定语截成「文字」。
    const name =
      (preserveRelation
        ? stripped
        : stripped.replace(/^.*的(?=[\u4e00-\u9fff]{1,6}$)/, "")) || nameRaw;
    if (!name || ACTION_VERBS[id] || SKIP_ACTION_VERBS.has(id) || DIR_MAP[id])
      return;
    // 「好象可以钻」「就只有钻」是动作提示，不是可查看物品
    if (SCENERY_NAME_NOISE.test(name) || SCENERY_NAME_NOISE.test(nameRaw))
      return;
    // Skill prose also uses 中文(skill); room ids such as stone/tree/fish must stay.
    if (SKILL_LABELS[id] || found.has(id)) return;
    found.set(id, { id, name, kind: "item", scenery: true });
  };
  // 「石头上有些文字(word)」这类不定量描述，通用括号匹配只能拿到
  // 「些文字」。对所有「载体 + 方位 + 有些/一些 + 物件」保留载体关系；
  // 普通的「墙上有一行小字」仍交给量词规则解析，避免生成生硬的长名称。
  for (const m of desc.matchAll(
    /([\u4e00-\u9fff]{1,8})(上面|上|里面|里|中|内|下)(?:，)?(?:还)?有(?:一些|些)([\u4e00-\u9fff]{1,8})\s*[（(]\s*([a-z][a-z0-9_\-]{1,30})\s*[）)]/gi
  )) {
    // 截取到「上」之前的连续字串有时会带「有几块」等量词，去掉即可。
    const holder = m[1]
      .replace(
        /^.*?[一两二三四五六七八九十几數数]+[张条个块面扇座间片本封只株棵道行]/,
        ""
      )
      .replace(/^(?:一些|些)/, "");
    const target = m[3].replace(/^.*的(?=[\u4e00-\u9fff]{1,6}$)/, "");
    const relation = /^(?:上|上面)$/.test(m[2])
      ? "上的"
      : /^(?:里|里面|中|内)$/.test(m[2])
        ? "中的"
        : "下的";
    if (holder && target)
      addScenery(m[4], `${holder}${relation}${target}`, true);
  }
  // …一张小条子(tiaozi) — number + measure required so「迎面」的「面」不会误吞
  for (const m of desc.matchAll(
    /[一两二三四五六七八九十几數数]+[张条个块面扇座间片本封只株棵道行]([\u4e00-\u9fff]{1,6})\s*[（(]\s*([a-z][a-z0-9_\-]{1,30})\s*[）)]/gi
  )) {
    addScenery(m[2], m[1]);
  }
  // 洞(hole) / 告示牌(board) / 瀑布(fall) — 1–4 字（含单字场景）
  for (const m of desc.matchAll(
    /([\u4e00-\u9fff]{1,4})\s*[（(]\s*([a-z][a-z0-9_\-]{1,30})\s*[）)]/gi
  )) {
    addScenery(m[2], m[1]);
  }
  // bare (tiaozi) without chinese label (avoid matching 条子(tiaozi) twice)
  for (const m of desc.matchAll(
    /(^|[^（(\u4e00-\u9fff])\(([a-z][a-z0-9_\-]{1,30})\)/gi
  )) {
    const id = m[2].toLowerCase();
    if (ACTION_VERBS[id] || SKIP_ACTION_VERBS.has(id) || DIR_MAP[id]) continue;
    if (SKILL_LABELS[id] || found.has(id)) continue;
    found.set(id, { id, name: id, kind: "item", scenery: true });
  }
  return [...found.values()];
}

export function mergeRoomItems(
  items: Entity[],
  scenery: Entity[]
): Entity[] {
  const map = new Map<string, Entity>();
  for (const it of items) map.set(it.id.toLowerCase(), it);
  for (const it of scenery) {
    const key = it.id.toLowerCase();
    if (!map.has(key)) map.set(key, it);
  }
  return [...map.values()];
}

/** 进度条上限：优先受伤后 eff，否则用 max（hp 文本两列时二者相同）。 */
export function vitalCap(
  v: Vitals,
  key: "qi" | "jing" | "jingli" | "neili" | "food" | "water"
): number | undefined {
  if (key === "qi") return v.effQi ?? v.maxQi;
  if (key === "jing") return v.effJing ?? v.maxJing;
  if (key === "jingli") return v.maxJingli;
  if (key === "neili") return v.maxNeili;
  if (key === "food") return v.maxFood;
  return v.maxWater;
}

/**
 * 气/精数值文案：当前 / 受伤后上限；若上限低于先天则标出先天。
 * 例：未伤 `80/100`；已伤 `80/90（先天 100）`
 */
export function formatVitalMeter(
  cur?: number,
  cap?: number,
  innate?: number
): string {
  if (cur == null && cap == null) return "—/—";
  const left = cur ?? "—";
  const right = cap ?? "—";
  if (
    typeof innate === "number" &&
    typeof cap === "number" &&
    innate > cap
  ) {
    return `${left}/${right}（先天 ${innate}）`;
  }
  return `${left}/${right}`;
}

export function parseHp(text: string): Vitals {
  const v: Vitals = {};
  const jing = text.match(/精[：:]\s*(\d+)\/\s*(\d+)/);
  if (jing) {
    v.jing = +jing[1];
    // hp 第二列是 eff（受伤后上限）；勿写入 max——否则会盖掉 player.vitals 的先天上限
    v.effJing = +jing[2];
  }
  const qi = text.match(/气[：:]\s*(\d+)\/\s*(\d+)/);
  if (qi) {
    v.qi = +qi[1];
    v.effQi = +qi[2];
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

const MASTERY_RANK: Record<string, number> = {
  初学乍练: 1,
  新学乍用: 1,
  粗通皮毛: 2,
  初窥门径: 2,
  半生不熟: 2,
  略知一二: 2,
  马马虎虎: 3,
  驾轻就熟: 3,
  已有小成: 3,
  出类拔萃: 4,
  心领神会: 4,
  神乎其技: 4,
  了然於胸: 4,
  了然于胸: 4,
  出神入化: 5,
  豁然贯通: 5,
  登峰造极: 5,
  举世无双: 5,
  一代宗师: 6,
  震古铄今: 6,
  深不可测: 6,
};

const WEAPON_SKILL_IDS = new Set([
  "sword",
  "blade",
  "stick",
  "staff",
  "whip",
  "hammer",
  "axe",
  "spear",
  "club",
  "pike",
  "hook",
  "throwing",
  "archery",
  "cuff",
  "strike",
  "finger",
  "claw",
  "hand",
  "kick",
  "unarmed",
]);

function skillCategory(id: string): string {
  if (id === "force") return "force";
  if (id === "dodge") return "dodge";
  if (id === "parry") return "parry";
  if (WEAPON_SKILL_IDS.has(id)) return "weapon";
  if (id === "literate" || id.endsWith("-lore") || id.includes("knowledge"))
    return "knowledge";
  return "misc";
}

function masteryRank(desc: string): number {
  const key = desc.replace(/\s+/g, "");
  return MASTERY_RANK[key] ?? 1;
}

/**
 * Parse `skills` / `cha` panel rows.
 * Real skills.c lines look like:
 *   │□基本拳脚 (unarmed)                   - 初学乍练     1/     0│
 * Also accepts plain rows without box borders.
 */
export function parseSkills(text: string): SkillRow[] {
  const rows: SkillRow[] = [];
  const seen = new Set<string>();
  for (const line of text.split("\n")) {
    const t = line.replace(/[│┃]/g, "").trim();
    // skills.c: 中文 (id) - 精通  level/learned
    let m = t.match(
      /^([□√])?\s*([\u4e00-\u9fff][\u4e00-\u9fffA-Za-z0-9_\-·\s]{0,24}?)\s*\(([a-z][a-z0-9_\-]{1,30})\)\s*[-–—]\s*(\S+)\s+(\d+)\s*\/\s*(\d+)/i
    );
    if (m) {
      const id = m[3].toLowerCase();
      if (NON_SKILL_IDS.has(id) || seen.has(id)) continue;
      seen.add(id);
      const name = m[2].replace(/\s+/g, "").trim();
      const label = m[4].replace(/\s+/g, "");
      rows.push({
        id,
        name: name || SKILL_LABELS[id] || id,
        level: +m[5],
        learned: +m[6],
        category: skillCategory(id),
        mastery: masteryRank(label),
        masteryLabel: label,
        equipped: m[1] === "□",
      });
      continue;
    }
    // legacy / simplified: □ 基本拳脚 ── 50
    m = t.match(/^([□√\s]*)([\u4e00-\u9fff]{2,12})\s+[-─]{2,}\s*(\d+)\s*$/);
    if (m) {
      const name = m[2];
      if (seen.has(name)) continue;
      seen.add(name);
      rows.push({
        id: name,
        name,
        level: +m[3],
        learned: 0,
        category: "misc",
        mastery: 1,
        masteryLabel: "初学乍练",
        equipped: m[1].includes("□"),
      });
    }
  }
  return rows;
}

/** enable/jifa slots (cmds/skill/enable.c valid_types). */
export const ENABLE_SLOTS: { id: string; label: string }[] = [
  { id: "force", label: "内功" },
  { id: "dodge", label: "轻功" },
  { id: "unarmed", label: "拳脚" },
  { id: "strike", label: "掌法" },
  { id: "cuff", label: "拳法" },
  { id: "finger", label: "指法" },
  { id: "hand", label: "手法" },
  { id: "claw", label: "爪法" },
  { id: "kick", label: "腿法" },
  { id: "sword", label: "剑法" },
  { id: "blade", label: "刀法" },
  { id: "stick", label: "棒法" },
  { id: "staff", label: "杖法" },
  { id: "club", label: "棍法" },
  { id: "whip", label: "鞭法" },
  { id: "hammer", label: "锤法" },
  { id: "hook", label: "钩法" },
  { id: "pike", label: "枪法" },
  // 招架放在攻击门类之后，避免「五狱掌法」等同时可激发时招架抢在掌法前面
  { id: "parry", label: "招架" },
  { id: "magic", label: "法术" },
];

const ENABLE_SLOT_IDS = new Set(ENABLE_SLOTS.map((s) => s.id));

/** Basic skill ids that are slots themselves — no enable needed. */
const BASIC_SKILL_IDS = new Set([
  ...ENABLE_SLOT_IDS,
  "axe",
  "archery",
  "throwing",
  "begging",
  "training",
  "checking",
  "digging",
  "swimming",
  "feixing-shu",
  "jinshe-zhuifa",
  "beidou-zhenfa",
  "literate",
]);

/** Fist/palm slots that can be prepare/bei'd after enable. */
const PREPARE_SLOTS = new Set([
  "finger",
  "hand",
  "cuff",
  "claw",
  "strike",
  "kick",
]);

export function enableSlotLabel(slot: string): string {
  return ENABLE_SLOTS.find((s) => s.id === slot)?.label || slot;
}

export function isBasicSkillId(id: string): boolean {
  return BASIC_SKILL_IDS.has(id.toLowerCase());
}

export function isKnowledgeSkill(sk: SkillRow): boolean {
  return sk.category === "knowledge" || idLooksKnowledge(sk.id);
}

function idLooksKnowledge(id: string): boolean {
  const s = id.toLowerCase();
  return (
    s === "literate" ||
    s.endsWith("-lore") ||
    s.includes("knowledge") ||
    s.includes("literate")
  );
}

/** Heuristic slots a special skill can likely enable into (fallback only). */
export function suggestEnableSlots(skillId: string): string[] {
  const id = skillId.toLowerCase();
  if (isBasicSkillId(id) || idLooksKnowledge(id)) return [];

  const hits: string[] = [];
  const add = (...slots: string[]) => {
    for (const s of slots) {
      if (ENABLE_SLOT_IDS.has(s) && !hits.includes(s)) hits.push(s);
    }
  };

  if (/force|shengong|xuangong|xinfa|qigong|neigong|taixuan/.test(id))
    add("force");
  if (/dodge|shenfa|bu$|shenxing|xiaoyao|lingbo|liuxing/.test(id)) add("dodge");
  if (/jian|sword|wugou/.test(id)) add("sword", "parry");
  if (/(?:^|-)dao$|blade|daofa/.test(id)) add("blade", "parry");
  if (/(?:^|-)stick$|dagou-bang|bangfa/.test(id)) add("stick", "parry");
  if (/(?:^|-)staff$|gunzhang/.test(id)) add("staff", "parry");
  if (/(?:^|-)club$|gunfa/.test(id)) add("club", "parry");
  if (/whip|bianfa|(?:^|-)bian$/.test(id)) add("whip", "parry");
  if (/hammer|chui/.test(id)) add("hammer", "parry");
  if (/hook|goufa|(?:^|-)gou$/.test(id)) add("hook", "parry");
  if (/pike|qiang|spear/.test(id)) add("pike", "parry");
  if (/quan|cuff/.test(id)) add("cuff", "unarmed", "parry");
  if (/strike|palm|zhangfa|(?:^|-)zhang$/.test(id))
    add("strike", "parry");
  if (/finger|zhi/.test(id)) add("finger", "parry");
  if (/hand|shou/.test(id) && !/shenfa|shengong/.test(id)) add("hand", "parry");
  if (/claw|zhua/.test(id)) add("claw", "parry");
  if (/kick|tui|leg/.test(id)) add("kick", "parry");
  if (/unarmed|quanjiao/.test(id)) add("unarmed", "parry");
  if (/parry|zhaojia|zhao$/.test(id)) add("parry");
  if (/magic|spells|fashu/.test(id)) add("magic");

  // 未知武功勿乱猜 4 个门类；等服务端 skills.enable 补齐
  return hits;
}

export function resolveEnableSlots(
  skillId: string,
  known?: Record<string, string[]> | null,
  rowSlots?: string[] | null
): string[] {
  const id = skillId.toLowerCase();
  let slots: string[] = [];
  if (Array.isArray(rowSlots))
    slots = rowSlots.filter((s) => ENABLE_SLOT_IDS.has(s));
  else if (known) {
    const direct = known[id] ?? known[skillId];
    if (Array.isArray(direct))
      slots = direct.filter((s) => ENABLE_SLOT_IDS.has(s));
    else {
      const hit = Object.entries(known).find(([k]) => k.toLowerCase() === id);
      if (hit && Array.isArray(hit[1]))
        slots = hit[1].filter((s) => ENABLE_SLOT_IDS.has(s));
    }
  }
  if (!slots.length) slots = suggestEnableSlots(id);
  // 统一按 ENABLE_SLOTS 顺序：掌法在招架前
  const order = new Map(ENABLE_SLOTS.map((s, i) => [s.id, i]));
  return [...slots].sort(
    (a, b) => (order.get(a) ?? 99) - (order.get(b) ?? 99)
  );
}

/** Merge server enable-slot map onto skill rows (and keep map for later reparses). */
export function applySkillEnableSlots(
  skills: SkillRow[],
  slots: Record<string, string[]>
): SkillRow[] {
  if (!skills.length) return skills;
  return skills.map((sk) => {
    const id = sk.id.toLowerCase();
    const fromMap =
      slots[id] ??
      slots[sk.id] ??
      Object.entries(slots).find(([k]) => k.toLowerCase() === id)?.[1];
    if (!fromMap) return sk;
    return { ...sk, enableSlots: fromMap };
  });
}

export function canPrepareSkill(
  skillId: string,
  enabled: Record<string, EnabledSkill>
): string | null {
  const id = skillId.toLowerCase();
  for (const [slot, ent] of Object.entries(enabled)) {
    if (PREPARE_SLOTS.has(slot) && ent.skill === id) return slot;
  }
  return null;
}

export function findEnabledSlot(
  skillId: string,
  enabled: Record<string, EnabledSkill>
): string | null {
  const id = skillId.toLowerCase();
  for (const [slot, ent] of Object.entries(enabled)) {
    if (ent.skill === id) return slot;
  }
  return null;
}

/** 通用内功运功（yun / exert），需先 enable 内功。文案勿暴露命令名。 */
export const FORCE_EXERT_ACTIONS: {
  id: string;
  label: string;
  command: string;
  hint: string;
}[] = [
  { id: "recover", label: "回气", command: "yun recover", hint: "以内力调匀气息，恢复当前气" },
  { id: "regenerate", label: "回精", command: "yun regenerate", hint: "以内力恢复当前精" },
  { id: "refresh", label: "回精力", command: "yun refresh", hint: "以内力恢复精力" },
  { id: "heal", label: "疗伤", command: "yun heal", hint: "运转内息治疗内伤" },
];

export function hasMappedForce(
  enabled: Record<string, EnabledSkill> | null | undefined
): boolean {
  const force = enabled?.force;
  return !!force?.skill && force.skill !== "无";
}

/** 是否已学会可激发为内功的功夫（尚未激发时用于提示）。 */
export function hasLearnedForceSkill(skills: SkillRow[] | null | undefined): boolean {
  if (!skills?.length) return false;
  return skills.some((s) => {
    const id = s.id.toLowerCase();
    if (id === "force") return s.level > 0;
    if (s.category === "force") return true;
    if (s.enableSlots?.includes("force")) return true;
    return suggestEnableSlots(id).includes("force");
  });
}

/**
 * Parse bare `enable` / `jifa` panel:
 *   内功 (force)          ： 太极神功              有效等级：180
 */
export function parseEnableMap(text: string): Record<string, EnabledSkill> {
  const map: Record<string, EnabledSkill> = {};
  if (/你现在没有使用任何特殊技能/.test(text)) return map;
  for (const line of text.split("\n")) {
    const m = line.match(
      /^\s*([\u4e00-\u9fff]+)\s*\(([a-z][a-z0-9_\-]*)\)\s*[：:]\s*(\S+)\s+有效等级[：:]?\s*(\d+)/i
    );
    if (!m) continue;
    const slot = m[2].toLowerCase();
    const name = m[3];
    if (!ENABLE_SLOT_IDS.has(slot) || name === "无") continue;
    map[slot] = {
      skill: guessSkillIdFromName(name),
      name,
      level: +m[4],
    };
  }
  return map;
}

/** Best-effort: keep chinese name; id filled later from skills list when possible. */
function guessSkillIdFromName(name: string): string {
  // Placeholder until reconciled with skills list; UI matches by name too.
  return name;
}

/** Attach english skill ids from known SkillRow list onto enable map entries. */
export function reconcileEnableMap(
  enabled: Record<string, EnabledSkill>,
  skills: SkillRow[]
): Record<string, EnabledSkill> {
  const byName = new Map(skills.map((s) => [s.name, s.id]));
  const next: Record<string, EnabledSkill> = {};
  for (const [slot, ent] of Object.entries(enabled)) {
    const id = byName.get(ent.name || ent.skill) || ent.skill;
    next[slot] = { ...ent, skill: id };
  }
  return next;
}

/**
 * Parse `prepare` / `bei` panel lines:
 *   掌法 (strike)   降龙十八掌
 */
export function parsePrepareMap(text: string): Record<string, string> {
  const map: Record<string, string> = {};
  if (/你现在没有组合任何特殊拳术技能/.test(text)) return map;
  for (const line of text.split("\n")) {
    const m = line.match(
      /^\s*([\u4e00-\u9fff]+)\s*\(([a-z]+)\)\s+([\u4e00-\u9fff][\u4e00-\u9fffA-Za-z0-9_\-·]*)/
    );
    if (!m) continue;
    const slot = m[2].toLowerCase();
    if (!PREPARE_SLOTS.has(slot)) continue;
    map[slot] = m[3].replace(/\s+/g, "");
  }
  return map;
}

/** Classify bag/ground item for wear、wield、eat、drink. */
export function classifyInvEquip(id: string, name: string, type = ""): InvEquipKind {
  const blob = `${id} ${name} ${type}`.toLowerCase();
  if (/武器/.test(type) || /武器/.test(name)) return "weapon";
  if (/防具|衣物|护甲/.test(type) || /防具/.test(name)) return "armor";
  // 中文点心/主食优先：避免「jian bing / 煎饼」被 id 里的 jian 判成兵器
  if (
    /粥|饭|糕|饼|肉|鸭|鸡|鱼|果|桃|梨|瓜|面|馒|包|点|菜|豆|腿|苹果|糕点|卷|卖|饺|酥|粽/.test(
      name
    ) ||
    /pancake|dumpling|eggroll|shaomai|chunjuan/i.test(blob)
  )
    return "food";
  if (
    /(?:^|[\s_-])(?:sword|jian|blade|dao|stick|bang|staff|club|gun|whip|bian|hammer|chui|hook|gou|pike|qiang|spear|axe|fu|bow|arrow|zhen|bi$|xiao|qin|falun|dagger|needle)(?:$|[\s_-])/i.test(
      blob
    ) ||
    /[剑刀棍棒杖鞭锤枪斧弓箭匕箫琴轮钩]/.test(name)
  )
    return "weapon";
  if (
    /(?:^|[\s_-])(?:cloth|armor|boots|shoes|hat|cap|helmet|robe|beixin|surcoat|belt|waist|necklace|ring|wrists|hands|glove|coat|skirt|shoe|jia|pao|shan|yi)(?:$|[\s_-])/i.test(
      blob
    ) ||
    /[衣甲袍衫靴鞋帽盔带环腕手套裙]/.test(name)
  )
    return "armor";
  // 丹药优先于「碗/丸」歧义
  if (
    /丹|丸|药|散|膏|疗伤|解毒/.test(name) ||
    /(?:^|[\s_-])(?:pill|yao|dan|san)(?:$|[\s_-])/i.test(blob)
  )
    return "drug";
  // 饮品容器 / 茶酒（粥归食物）
  if (
    !/粥|饭|糕|饼|馒/.test(name) &&
    (/茶|酒|水|壶|葫芦|瓶|杯|坛|碗/.test(name) ||
      /(?:^|[\s_-])(?:tea|wine|jiu|cha|water|hulu|bottle|cup|hu|wan)(?:$|[\s_-])/i.test(
        blob
      ))
  )
    return "drink";
  if (
    /(?:^|[\s_-])(?:zhou|rice|food|guo|ya|rou|kaoya|apple|bread|cake|meat|fruit|doufu|baozi|ji|yu|gao|mai|juan)(?:$|[\s_-])/i.test(
      blob
    )
  )
    return "food";
  return "other";
}

/**
 * Preferred mud target for inventory / ground item commands.
 * Prefer single-token commandId (e.g. pancake)；多词 id 须整段下发——
 * LPC `id()` 只认完整别名（"jian bing"/"pancake"），截成 bing 会找不到。
 */
export function invCommandTarget(
  id: string,
  name: string,
  commandId?: string
): string {
  const cmd = (commandId || "").trim();
  if (cmd && /^[a-z][\w]*$/i.test(cmd)) return cmd.toLowerCase();
  if (id && /^[a-z][\w]*$/i.test(id)) return id.toLowerCase();
  if (id && /^[a-z][\w]*(\s+[a-z][\w]*)+$/i.test(id))
    return id.trim().toLowerCase();
  return (name || id || "").trim();
}

/**
 * Heuristic armor slot (aligns with LPC armor_type) for optimistic equip swap.
 * Unknown → "cloth" so same-kind cloth swaps still work in UI.
 */
export function suggestArmorSlot(id: string, name: string): string {
  const blob = `${id} ${name}`.toLowerCase();
  if (/(?:^|[\s_-])(?:boots|shoes|shoe)(?:$|[\s_-])/i.test(blob) || /靴|鞋/.test(name))
    return "boots";
  if (/(?:^|[\s_-])(?:hat|cap|helmet|head)(?:$|[\s_-])/i.test(blob) || /帽|盔/.test(name))
    return "head";
  if (/(?:^|[\s_-])(?:neck|necklace)(?:$|[\s_-])/i.test(blob) || /项链|项圈/.test(name))
    return "neck";
  if (/(?:^|[\s_-])(?:wrists|wrist)(?:$|[\s_-])/i.test(blob) || /护腕/.test(name))
    return "wrists";
  if (/(?:^|[\s_-])(?:finger|ring)(?:$|[\s_-])/i.test(blob) || /戒指|指环/.test(name))
    return "finger";
  if (/(?:^|[\s_-])(?:hands|glove|gloves)(?:$|[\s_-])/i.test(blob) || /手套/.test(name))
    return "hands";
  if (/(?:^|[\s_-])(?:belt|waist)(?:$|[\s_-])/i.test(blob) || /腰带|束带/.test(name))
    return "waist";
  if (/(?:^|[\s_-])(?:surcoat)(?:$|[\s_-])/i.test(blob) || /披风|外袍/.test(name))
    return "surcoat";
  if (/(?:^|[\s_-])(?:shield)(?:$|[\s_-])/i.test(blob) || /盾/.test(name))
    return "shield";
  if (/(?:^|[\s_-])(?:armor|jia)(?:$|[\s_-])/i.test(blob) || /铠|甲/.test(name))
    return "armor";
  return "cloth";
}

function invItemMatchesTarget(it: InvItem, target: string): boolean {
  const id = it.id.toLowerCase();
  const name = it.name.toLowerCase();
  const t = target.toLowerCase();
  return (
    id === t ||
    name === t ||
    id.startsWith(t) ||
    t.startsWith(id) ||
    invCommandTarget(it.id, it.name).toLowerCase() === t
  );
}

/**
 * Optimistic inventory after wear/wield/remove/unwield, including same-slot swap.
 */
export function applyEquipOptimistic(
  inventory: InvItem[],
  verb: string,
  target: string
): InvItem[] {
  const v = verb.toLowerCase();
  if (!target || !["wear", "wield", "remove", "unwield"].includes(v)) {
    return inventory;
  }
  const equipping = v === "wear" || v === "wield";
  const targetItem = inventory.find((it) => invItemMatchesTarget(it, target));
  const armorSlot =
    v === "wear" && targetItem
      ? suggestArmorSlot(targetItem.id, targetItem.name)
      : null;

  return inventory.map((it) => {
    if (invItemMatchesTarget(it, target)) {
      return { ...it, equipped: equipping };
    }
    if (!equipping || !it.equipped) return it;
    if (v === "wield" && (it.equipKind || classifyInvEquip(it.id, it.name, it.type)) === "weapon") {
      return { ...it, equipped: false };
    }
    if (
      v === "wear" &&
      armorSlot &&
      (it.equipKind || classifyInvEquip(it.id, it.name, it.type)) === "armor" &&
      suggestArmorSlot(it.id, it.name) === armorSlot
    ) {
      return { ...it, equipped: false };
    }
    return it;
  });
}

/**
 * Bag item menu: 看 + 穿戴/装备/吃/喝 + 丢下.
 * Embedded items cannot be operated directly.
 */
export function bagItemActions(
  it: InvItem,
  inventory: InvItem[] = []
): { label: string; command: string }[] {
  const target = invCommandTarget(it.id, it.name);
  if (it.embedded || !target) return [];
  const kind = it.equipKind || classifyInvEquip(it.id, it.name, it.type);
  const acts: { label: string; command: string }[] = [
    { label: "看", command: `look ${target}` },
  ];

  if (it.equipped) {
    if (kind === "weapon") {
      acts.push({ label: "收起", command: `unwield ${target}` });
    } else if (kind === "armor") {
      acts.push({ label: "脱下", command: `remove ${target}` });
    } else {
      acts.push({ label: "脱下", command: `remove ${target}` });
      acts.push({ label: "收起", command: `unwield ${target}` });
    }
    return acts;
  }

  if (kind === "weapon") acts.push({ label: "装备", command: `wield ${target}` });
  if (kind === "armor") acts.push({ label: "穿上", command: `wear ${target}` });
  if (kind === "food" || kind === "drug") {
    acts.push({ label: "吃", command: `eat ${target}` });
  }
  if (kind === "drink") acts.push({ label: "喝", command: `drink ${target}` });

  // Custom heuristically-detected actions (du/read/open/ride)
  const custom = it.actions || classifyInvActions(it.id, it.name, it.type);
  for (const a of custom) {
    // Avoid duplicates
    if (!acts.some((x) => x.command === a.command)) {
      acts.push({ label: a.label, command: a.command });
    }
  }

  // 椰子需石块砸开（za yezi），不能直接吃
  if (
    (/^yezi$|^ye$/i.test(it.id) || /椰子/.test(it.name)) &&
    !/壳/.test(it.name) &&
    inventoryHasStone(inventory)
  ) {
    acts.push({ label: "砸开", command: "za yezi" });
  }
  acts.push({ label: "丢下", command: `drop ${target}` });
  return acts;
}

/** Ground / room item menu on entity sheet. */
export function groundItemActions(
  id: string,
  name: string,
  scenery = false,
  commandId?: string
): { label: string; command: string }[] {
  const target = invCommandTarget(id, name, commandId);
  if (!target) return [];
  if (isCoconutTree(id, name)) {
    return [
      { label: "查看", command: `look ${target}` },
      { label: "爬树摘椰子", command: "pa tree" },
    ];
  }
  if (scenery) {
    const acts: { label: string; command: string }[] = [
      { label: "查看", command: `look ${target}` },
      ...sceneryPracticeActions(id, name),
    ];
    // 山顶大树(tree)：描写无括号动作
    if (/^tree$/i.test(id) || (/大树|高树/.test(name) && !/椰子/.test(name))) {
      acts.push({ label: "爬上树", command: "pa up" });
    }
    // 望海亭大石(stone)；勿匹配「大石壁」
    if (/^stone$/i.test(id) || name === "大石") {
      acts.push({ label: "搬开大石", command: "move stone" });
    }
    return acts;
  }
  if (isCarriageItem(id, name)) {
    return [
      { label: "看", command: `look ${target}` },
      ...CARRIAGE_DESTINATIONS.map((dest) => ({
        label: `去${dest}`,
        command: `qu ${dest}`,
      })),
    ];
  }
  const kind = classifyInvEquip(id, name);
  const acts: { label: string; command: string }[] = [
    { label: "看", command: `look ${target}` },
    { label: "拿", command: `get ${target}` },
  ];
  if (kind === "food" || kind === "drug") {
    acts.push({ label: "吃", command: `eat ${target}` });
  }
  if (kind === "drink") acts.push({ label: "喝", command: `drink ${target}` });
  return acts;
}

/**
 * 帮助正文中的括号指令 → 可点动作（与场景芯片同一套 label）。
 * 例：(study wall)、(sleep)、(fishing)
 */
export function parseHelpDocActions(
  text: string,
  limit = 16
): SuggestedAction[] {
  if (!text) return [];
  const found = new Map<string, SuggestedAction>();
  const re = /\(([^)]{2,48})\)/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text)) !== null) {
    for (const piece of splitCombinedHint(m[1])) {
      const command = normalizeActionCommand(piece);
      if (!command) continue;
      const verb = command.split(/\s+/)[0]?.toLowerCase();
      if (!verb || !ACTION_VERBS[verb]) continue;
      if (verb === "help" || verb === "ask" || verb === "learn" || verb === "xue")
        continue;
      if (found.has(command)) continue;
      found.set(command, {
        command,
        label: labelSuggestedAction(command),
      });
      if (found.size >= limit) return [...found.values()];
    }
  }
  return [...found.values()];
}

function invItem(
  id: string,
  name: string,
  type: string,
  opts: { equipped?: boolean; embedded?: boolean }
): InvItem {
  return {
    id,
    name,
    type,
    equipped: !!opts.equipped,
    embedded: !!opts.embedded,
    equipKind: classifyInvEquip(id, name, type),
    actions: classifyInvActions(id, name, type),
  };
}

/**
 * Heuristic classification of available actions for an inventory item.
 * Based on item id/name/type patterns observed across the mudlib.
 */
export function classifyInvActions(id: string, name: string, type: string): InvAction[] {
  const blob = `${id} ${name} ${type}`.toLowerCase();
  const actions: InvAction[] = [];

  // Books / scrolls / letters — can be read or studied.
  // Do not treat generic tokens such as 令/牌 as readable: many are quest
  // tokens (for example 赏善令、罚恶令) with no `read` command handler.
  if (/book|纸|信|经|谱|册|卷|页|图|笺|简|帖|签|簿/i.test(name + id + type)) {
    actions.push({ label: "阅读", command: `read ${id}`, kind: "read" });
  }
  if (/经|谱|秘|典|法|功|决|诀|图|解|录|要|术/i.test(name) || /book|paper|shu|jing/i.test(blob)) {
    actions.push({ label: "研读", command: `du ${id}`, kind: "read" });
  }

  // Openable containers
  if (/盒|箱|包|袋|囊|篓|匣|瓮|罐|瓶|壶|钵/i.test(name) || /box|bag|sack|bottle|jar/i.test(blob)) {
    actions.push({ label: "打开", command: `open ${id}`, kind: "open" });
  }

  // Drinkable liquids (already handled by equipKind drink, add explicit)
  if (/酒|茶|水|汤|汁|露|浆/i.test(name)) {
    actions.push({ label: "喝", command: `drink ${id}`, kind: "drink" });
  }

  // Edible food (already handled by equipKind food, add explicit)
  if (/肉|鱼|鸡|鸭|果|桃|梨|粥|饭|饼|面|饺|菜|豆|瓜|粽|酥|糕/i.test(name)) {
    actions.push({ label: "吃", command: `eat ${id}`, kind: "eat" });
  }

  // Rideable
  if (/马|驴|骆驼|车|船|舟/i.test(name) || /horse|donkey|camel/i.test(blob)) {
    actions.push({ label: "骑乘", command: `ride ${id}`, kind: "ride" });
  }

  // Poison / drug — use/discard with care
  if (/毒|蛊|药|丹|丸|散|膏|粉/i.test(name) && actions.length === 0) {
    actions.push({ label: "使用", command: `use ${id}`, kind: "use" });
  }

  return actions;
}

/**
 * Parse `inventory` / `i` item shorts.
 * Real inventory.c uses ob->short(): □布衣(cloth) / "  米饭(rice)"
 * Also accepts fullwidth type tags: 长剑（武器）
 */
export function parseInventory(text: string): InvItem[] {
  const items: InvItem[] = [];
  const seen = new Set<string>();
  for (const line of text.split("\n")) {
    const raw = line.replace(/\r/g, "");
    const t = raw.trim();
    if (!t) continue;
    if (
      /身上带[着著]下列|目前你身上没有任何东西|身上没有携带任何东西|负重\s*\d+\s*%|指令格式|可列出/.test(
        t
      )
    )
      continue;

    // equipped / embedded: □布衣(cloth) or √毒针(needle)
    let m = t.match(/^([□√])\s*(.+?)\s*\(([A-Za-z][A-Za-z0-9_\- ]*)\)\s*$/);
    if (m) {
      const id = m[3].trim().toLowerCase();
      const name = m[2].trim();
      const key = `${id}|${name}`;
      if (seen.has(key)) continue;
      seen.add(key);
      items.push(
        invItem(id, name, id, {
          equipped: m[1] === "□",
          embedded: m[1] === "√",
        })
      );
      continue;
    }

    // unequipped shorts are indented in inventory.c ("  name(id)")
    m = raw.match(/^\s{2,}(.+?)\s*\(([A-Za-z][A-Za-z0-9_\- ]*)\)\s*$/);
    if (m) {
      const id = m[2].trim().toLowerCase();
      const name = m[1].trim();
      if (/说道|问道|喊道/.test(name)) continue;
      const key = `${id}|${name}`;
      if (seen.has(key)) continue;
      seen.add(key);
      items.push(invItem(id, name, id, {}));
      continue;
    }

    // fullwidth type label (tests / alternate dumps): □ 长剑（武器）
    m = t.match(/^([□√\s]*)(.+?)（(.+?)）\s*$/);
    if (m) {
      const name = m[2].trim();
      const type = m[3].trim();
      if (!name || /指令|格式|技能|帮助/.test(name)) continue;
      const key = `${name}|${type}`;
      if (seen.has(key)) continue;
      seen.add(key);
      const mark = m[1];
      items.push(
        invItem(name, name, type, {
          equipped: mark.includes("□"),
          embedded: mark.includes("√"),
        })
      );
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
  if (/以下是你目前使用中的特殊技能|你现在没有使用任何(?:有效)?特殊技能/.test(chunk))
    return true;
  if (/以下是你目前组合中的特殊拳术技能|你现在没有组合任何特殊拳术技能/.test(chunk))
    return true;
  return false;
}

/** Strip MUD prompt glue like「>  精：…」(refreshCharacter fires cmds back-to-back). */
export function stripMudPrompt(line: string): string {
  return line.replace(/^(?:\s*>)+\s*/, "");
}

/** 档案「遇险撤退」默认建议值（与 cmds/usr/wimpy 上限 80 一致、新手偏安全）。 */
export const DEFAULT_WIMPY_PCT = 50;

/** Parse `wimpy` / `set wimpy` feedback → percent, or null if not a wimpy line. */
export function parseWimpyPct(text: string): number | null {
  const plain = stripMudPrompt(text).trim();
  const status = plain.match(/你现在的当[「"]气[」"]低[於于]\s*(\d+)\s*%/);
  if (status) {
    const n = Number(status[1]);
    if (Number.isFinite(n)) return Math.min(80, Math.max(0, n));
  }
  const setEnv = plain.match(/设定环境变量：\s*wimpy\s*=\s*(\d+)/i);
  if (setEnv) {
    const n = Number(setEnv[1]);
    if (Number.isFinite(n)) return Math.min(80, Math.max(0, n));
  }
  return null;
}

/** Character-panel dumps (hp / score / skills / inventory) belong in 角色卡片, not 见闻. */
export function isSheetDumpLine(line: string, chunk?: string): boolean {
  const t = line.trim();
  if (!t) return false;
  // Vital / score rows may arrive with a glued prompt — match the bare content.
  const plain = stripMudPrompt(t).trim();
  if (/你要看什么？/.test(t)) return true;
  if (/^>\s*(look\s+me|hp|score|skills|inventory|i|enable|jifa|prepare|bei|wimpy)\b/i.test(t))
    return true;
  if (/你现在的当[「"]气[」"]低[於于]\s*\d+\s*%/.test(plain)) return true;
  if (/[「"]气[」"]低[於于]\s*\d+\s*%\s*时就会尝试逃跑/.test(plain)) return true;
  if (/设定环境变量：\s*wimpy\s*=/i.test(plain)) return true;
  if (/【侠客行个人档案】/.test(plain)) return true;
  if (/个人档案/.test(plain) && /中文/.test(plain)) return true;
  // score rank + short: 【 布  衣 】张三(Zhang San) — 勿单靠【】以免误伤【公告】等
  if (/^【[^】]{1,12}】/.test(plain) && /\([A-Za-z][A-Za-z0-9_\- ]*\)\s*$/.test(plain))
    return true;
  if (/膂力/.test(plain) && /悟性/.test(plain) && /根骨/.test(plain)) return true;
  if (/你是一.+岁.+个月的/.test(plain)) return true;
  if (/你的师父是|你的(?:妻子|丈夫|配偶)是|你到目前为止总共(?:杀了|死了)/.test(plain))
    return true;
  if (/攻击力/.test(plain) && /防御力/.test(plain)) return true;
  // hp numeric rows + score bar / empty vitals labels (新人精力/内力常为空)
  if (/^(精|气|精力|内力|食物|饮水|潜能|经验)\s*[：:]/.test(plain)) return true;
  if (/^神\s*[：:]/.test(plain)) return true;
  if (/^阅历\s*[：:]/.test(plain)) return true;
  if (/^[■□\s]+$/.test(plain)) return true;
  if (
    /目前所学过的技能|目前并没有学会任何技能|你不会任何技能|身上带[着著]下列|目前身上带[着著]|目前你身上没有任何东西|身上没有携带任何东西|负重\s*\d+\s*%/.test(
      t
    )
  )
    return true;
  if (
    /以下是你目前使用中的特殊技能|你现在没有使用任何(?:有效)?特殊技能|有效等级|以下是你目前组合中的特殊拳术技能|你现在没有组合任何特殊拳术技能|取消全部技能准备|完成技能准备/.test(
      t
    )
  )
    return true;
  if (/好吧，只用基本功夫|你从现在起用.+作为.+的特殊技能/.test(t)) return true;
  if (/这个技能不能当成这种用途|不需要 enable|尚未激发或目前不能准备/.test(t))
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
  // equipped gear: □白袍(Bai pao) — 仅在自己仪容/行囊/面板块里挡；
  // NPC look 的装备常随 TCP 拆到下一包（包内没有「她身上带著」），默认放行进见闻。
  if (/^[□√]\s*.+\([A-Za-z][A-Za-z0-9_\- ]*\)\s*$/.test(t)) {
    if (!chunk) return true;
    if (
      /你身上带[着著]|身上带[着著]下列|负重\s*\d+\s*%|目前你身上没有任何东西|身上没有携带任何东西/.test(
        chunk
      ) ||
      isSheetDumpChunk(chunk)
    ) {
      return true;
    }
    return false;
  }
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
  // 勿用裸「身上带」——会误伤 NPC look「他身上带著：」后的装备行
  if (
    chunk &&
    isSheetDumpChunk(chunk) &&
    /^.{1,60}\([A-Za-z][A-Za-z0-9_\- ]*\)\s*$/.test(t) &&
    !/说道|问道|喊道|向.+打听/.test(t) &&
    (/【/.test(chunk) ||
      /膂力|所学过的技能|负重|身上带[着著]下列|你身上带[着著]/.test(chunk))
  )
    return true;
  return false;
}

/** Self look-me narrative lines (仪容), not room/NPC chatter. */
export function isSelfLookLine(line: string): boolean {
  const t = stripMudPrompt(line.trim()).trim();
  if (!t) return false;
  // look.c long()/short header: 「普通百姓 张三(Zhangsan)。」
  if (
    /^.{2,48}\([A-Za-z][A-Za-z0-9_\- ]*\)[。.]\s*$/.test(t) &&
    !/说道|问道|喊道|向.+打听/.test(t)
  )
    return true;
  if (/^你看起来/.test(t)) return true;
  if (/身上带[着著]：/.test(t)) return true;
  if (/看起来约.+[岁歲]/.test(t)) return true;
  if (/并没有受伤|气血充盈|受了点伤|气血和畅/.test(t) && /^你/.test(t))
    return true;
  // look.c inventory_look: "  □布衣(Cloth)" / "  √毒针(needle)"
  if (/^[□√]\s*.+\([A-Za-z][^)]*\)\s*$/.test(t)) return true;
  return false;
}

/**
 * Panel dumps that follow `look me` in refreshCharacter (hp → score → …).
 * Used to truncate 仪容 capture so 精/气 不会灌进「你身上带着」下方.
 */
export function isSelfLookStopLine(line: string): boolean {
  const t = stripMudPrompt(line.trim()).trim();
  if (!t) return false;
  if (/^(hp|score|skills|inventory|i|enable|jifa|prepare|bei|look\s+me)\b/i.test(t))
    return true;
  if (/^(精|气|精力|内力|食物|饮水|潜能|经验)\s*[：:]/.test(t)) return true;
  if (/^神\s*[：:]/.test(t)) return true;
  if (/^阅历\s*[：:]/.test(t)) return true;
  if (/【侠客行个人档案】/.test(t)) return true;
  if (/个人档案/.test(t) && /中文/.test(t)) return true;
  if (/膂力/.test(t) && /悟性/.test(t) && /根骨/.test(t)) return true;
  if (/你是一.+岁.+个月的/.test(t)) return true;
  if (/目前所学过的技能|目前并没有学会任何技能|你不会任何技能/.test(t))
    return true;
  // inventory.c header — not look-me「身上带著：」
  if (
    /身上带[着著]下列|目前你身上没有任何东西|身上没有携带任何东西|负重\s*\d+\s*%/.test(
      t
    )
  )
    return true;
  if (
    /以下是你目前使用中的特殊技能|你现在没有使用任何(?:有效)?特殊技能|以下是你目前组合中的特殊拳术技能|你现在没有组合任何特殊拳术技能/.test(
      t
    )
  )
    return true;
  return false;
}

/** True when this chunk is look-me output (not inventory「下列」or NPC 打听). */
export function chunkLooksLikeSelfLook(chunk: string): boolean {
  if (!chunk) return false;
  if (/打听有关|向.+打听/.test(chunk)) return false;
  if (/身上带[着著]下列/.test(chunk) && !/你看起来|看起来约.+[岁歲]/.test(chunk))
    return false;
  return (
    /你看起来/.test(chunk) ||
    /看起来约.+[岁歲]/.test(chunk) ||
    /你身上带[着著]：/.test(chunk)
  );
}

/**
 * Build 仪容 panel from a text chunk (often look-me + hp glued together).
 * Keeps equipped gear (□/√); stops before hp / score / skills / inventory.
 */
export function extractSelfLookPanel(
  text: string,
  htmlLines?: string[]
): { text: string; html: string } {
  const lines = text.replace(/\0/g, "").split("\n");
  const keepIdx: number[] = [];
  let started = false;
  for (let i = 0; i < lines.length; i++) {
    // MUD prompt「>」常与下一条命令输出粘在同一行（如「>  精：…」）；
    // 先剥掉行首的一串「>」提示符再判断，避免气血行伪装成非停止行。
    const t = lines[i].replace(/^(?:\s*>)+\s*/, "").trim();
    if (!t) {
      if (started) keepIdx.push(i);
      continue;
    }
    if (isSelfLookStopLine(t)) {
      if (started) break;
      continue;
    }
    if (!started) {
      if (
        /^你看起来/.test(t) ||
        /看起来约.+[岁歲]/.test(t) ||
        /身上带[着著]：/.test(t) ||
        (/并没有受伤|气血充盈|受了点伤|气血和畅/.test(t) && /^你/.test(t))
      ) {
        started = true;
      } else {
        continue;
      }
    }
    keepIdx.push(i);
  }
  const stripPrompt = (s: string) => s.replace(/^(?:\s*>)+\s*/, "");
  const textOut = keepIdx
    .map((i) => stripPrompt(lines[i]).replace(/\s+$/, ""))
    .join("\n")
    .replace(/^\n+/, "")
    .replace(/\n+$/, "");
  let htmlOut = "";
  if (htmlLines?.length) {
    htmlOut = keepIdx
      .map((i) => (htmlLines[i] == null ? "" : stripPrompt(String(htmlLines[i]))))
      .filter((h) => {
        const plain = h.replace(/<[^>]+>/g, "").replace(/&gt;|&amp;|&lt;/g, "").trim();
        return plain.length > 0;
      })
      .join("\n");
  }
  return { text: textOut, html: htmlOut };
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

  // 攻击力: 12 (+3) / 防御力： 8 (+5) — (+n) 为装备加成
  const atk = body.match(/攻击力\s*[：:]\s*(-?\d+)(?:\s*\(\s*\+?\s*(-?\d+)\s*\))?/);
  if (atk) {
    info.attack = +atk[1];
    if (atk[2] != null) info.attackBonus = +atk[2];
  }
  const def = body.match(/防御力\s*[：:]\s*(-?\d+)(?:\s*\(\s*\+?\s*(-?\d+)\s*\))?/);
  if (def) {
    info.defense = +def[1];
    if (def[2] != null) info.defenseBonus = +def[2];
  }

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

/** Reflow help / doc prose that was hard-wrapped for an 80-col terminal. */
export function reflowSoftWrappedText(text: string): string {
  if (!text) return text;
  return reflowSoftWrappedEntries(
    text.split(/\r?\n/).map((line) => ({ text: line }))
  )
    .map((e) => e.text)
    .join("\n");
}

export { PAD_SLOTS, DIR_MAP };
