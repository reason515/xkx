/**
 * Lightweight situational tips for 侠客岛 → 上大陆.
 * One short tip at a time; not a step-by-step tutorial.
 * Avoid the phrase「新手引导」(banned in e2e).
 */

import type { DoorInfo, Entity, ExitInfo, SkillRow } from "./types";
import { isCarriageItem } from "./parser";

export const GUIDE_DISMISSED_KEY = "xkx-guide-dismissed";
export const GUIDE_FINISHED_KEY = "xkx-guide-finished";
export const GUIDE_SEEN_ISLAND_KEY = "xkx-guide-seen-xiakedao";

export interface GuideTip {
  id: string;
  text: string;
  /** Lower runs first. */
  priority: number;
}

export interface GuideContext {
  area?: string;
  title?: string;
  exits: ExitInfo[];
  doors?: DoorInfo[];
  npcs: Entity[];
  items: Entity[];
  exp?: number;
  skills: SkillRow[];
  dismissed: Set<string>;
  /** Player has been on xiakedao this browser (session/persistent). */
  seenXiakedao: boolean;
  /** Guide permanently finished after mainland welcome. */
  finished: boolean;
}

type Rule = {
  id: string;
  priority: number;
  text: string;
  match: (ctx: GuideContext) => boolean;
};

function hasNpc(npcs: Entity[], re: RegExp): boolean {
  return npcs.some((n) => re.test(n.id) || re.test(n.name));
}

function hasExitDir(exits: ExitInfo[], dir: string): boolean {
  return exits.some((e) => e.dir === dir);
}

function titleOf(ctx: GuideContext): string {
  return ctx.title || "";
}

/** Leave-island readiness per help xiakedao (exclude literate). */
export function isReadyToLeaveIsland(exp: number | undefined, skills: SkillRow[]): boolean {
  if ((exp ?? 0) < 250) return false;
  const nonLit = skills.filter((s) => s.id !== "literate");
  if (nonLit.length < 5) return false;
  const ge10 = nonLit.filter((s) => s.level >= 10).length;
  return ge10 >= 6;
}

function isXiakedao(ctx: GuideContext): boolean {
  return (ctx.area || "").toLowerCase() === "xiakedao";
}

const RULES: Rule[] = [
  {
    id: "mainland-welcome",
    priority: 5,
    text: "你已踏上中原。可自行探索城镇、拜师学艺；岛上的提示到此为止。",
    match: (ctx) =>
      !ctx.finished &&
      ctx.seenXiakedao &&
      !isXiakedao(ctx) &&
      !!(ctx.area && ctx.area.length > 0),
  },
  {
    id: "shore-car",
    priority: 8,
    text: "岸边有大车可载你去各大门派所在。点大车或下方目的地，选一处出发即可。",
    match: (ctx) => {
      if (ctx.finished) return false;
      if (!ctx.items.some((i) => isCarriageItem(i.id, i.name))) return false;
      return (ctx.exits?.length ?? 0) <= 2;
    },
  },
  {
    id: "beach-follow",
    priority: 10,
    text: "这里还不能自由走动。跟随迎宾弟子，他会带你到岛上的沙滩。",
    match: (ctx) =>
      isXiakedao(ctx) &&
      /沙滩/.test(titleOf(ctx)) &&
      ctx.exits.length === 0 &&
      hasNpc(ctx.npcs, /zhang san|li si|张三|李四/i),
  },
  {
    id: "beach-boat",
    priority: 15,
    text: "离岛的船已备好。从出口「进」上船，靠岸后再出船，便可前往中原。",
    match: (ctx) =>
      isXiakedao(ctx) &&
      /沙滩/.test(titleOf(ctx)) &&
      hasExitDir(ctx.exits, "enter"),
  },
  {
    id: "waterfall",
    priority: 30,
    text: "瀑布后有洞府。先爬树取雨衣、穿上，再跳进瀑布——场景下方有对应动作。",
    match: (ctx) => isXiakedao(ctx) && /瀑布/.test(titleOf(ctx)),
  },
  {
    id: "dadong-ask",
    priority: 40,
    text: "两位岛主在石室中。向厮仆打听「岛主」，可拉开屏风进入甬道。",
    match: (ctx) =>
      isXiakedao(ctx) &&
      /大山洞/.test(titleOf(ctx)) &&
      hasNpc(ctx.npcs, /si pu|厮仆/i) &&
      !hasExitDir(ctx.exits, "enter"),
  },
  {
    id: "gate-open",
    priority: 50,
    text: "眼前的门关着。先打开它，再从出口进入。",
    match: (ctx) =>
      isXiakedao(ctx) &&
      (ctx.doors?.some((d) => d.status === "closed" || d.status === "locked") ??
        false),
  },
  {
    id: "ready-leave",
    priority: 70,
    text: "经验与武功已够离岛。到石室最深处见龙岛主，获准后回沙滩乘船。",
    match: (ctx) =>
      isXiakedao(ctx) &&
      isReadyToLeaveIsland(ctx.exp, ctx.skills) &&
      !hasExitDir(ctx.exits, "enter") &&
      !/沙滩/.test(titleOf(ctx)),
  },
  {
    id: "beach-orient",
    priority: 80,
    text: "这是侠客岛沙滩。先熟悉走动与打听；在岛上练些经验与武功，达标后便可离岛去中原。",
    match: (ctx) =>
      isXiakedao(ctx) &&
      /沙滩/.test(titleOf(ctx)) &&
      ctx.exits.length > 0 &&
      !hasExitDir(ctx.exits, "enter") &&
      hasNpc(ctx.npcs, /yu fu|渔夫/i),
  },
  {
    id: "train-cave",
    priority: 90,
    text: "石壁上可领悟武功。把经验练到二百五、几项技能到十级左右，再去见岛主离岛。",
    match: (ctx) => {
      if (!isXiakedao(ctx)) return false;
      if (isReadyToLeaveIsland(ctx.exp, ctx.skills)) return false;
      const t = titleOf(ctx);
      return /甬道|石洞|石室|书房/.test(t) && !/大山洞|石门/.test(t);
    },
  },
  {
    id: "rest-room",
    priority: 95,
    text: "这里可以休息恢复。养好伤、睡一觉后再继续探索。",
    match: (ctx) =>
      isXiakedao(ctx) && /休息室|养心居/.test(titleOf(ctx)),
  },
];

export function readDismissed(): Set<string> {
  try {
    const raw = localStorage.getItem(GUIDE_DISMISSED_KEY);
    if (!raw) return new Set();
    const arr = JSON.parse(raw) as unknown;
    if (!Array.isArray(arr)) return new Set();
    return new Set(arr.filter((x): x is string => typeof x === "string"));
  } catch {
    return new Set();
  }
}

export function writeDismissed(ids: Set<string>): void {
  try {
    localStorage.setItem(GUIDE_DISMISSED_KEY, JSON.stringify([...ids]));
  } catch {
    /* ignore quota */
  }
}

export function readGuideFinished(): boolean {
  try {
    return localStorage.getItem(GUIDE_FINISHED_KEY) === "1";
  } catch {
    return false;
  }
}

export function writeGuideFinished(v: boolean): void {
  try {
    if (v) localStorage.setItem(GUIDE_FINISHED_KEY, "1");
    else localStorage.removeItem(GUIDE_FINISHED_KEY);
  } catch {
    /* ignore */
  }
}

export function readSeenXiakedao(): boolean {
  try {
    return localStorage.getItem(GUIDE_SEEN_ISLAND_KEY) === "1";
  } catch {
    return false;
  }
}

export function writeSeenXiakedao(): void {
  try {
    localStorage.setItem(GUIDE_SEEN_ISLAND_KEY, "1");
  } catch {
    /* ignore */
  }
}

/** Pick the highest-priority (lowest number) undismissed matching tip. */
export function matchGuideTip(ctx: GuideContext): GuideTip | null {
  if (ctx.finished) return null;
  const sorted = [...RULES].sort((a, b) => a.priority - b.priority);
  for (const rule of sorted) {
    if (ctx.dismissed.has(rule.id)) continue;
    if (!rule.match(ctx)) continue;
    return { id: rule.id, text: rule.text, priority: rule.priority };
  }
  return null;
}

export function buildGuideContext(input: {
  area?: string;
  title?: string;
  exits?: ExitInfo[];
  doors?: DoorInfo[];
  npcs?: Entity[];
  items?: Entity[];
  exp?: number;
  skills?: SkillRow[];
  dismissed?: Set<string>;
  seenXiakedao?: boolean;
  finished?: boolean;
}): GuideContext {
  return {
    area: input.area,
    title: input.title,
    exits: input.exits || [],
    doors: input.doors,
    npcs: input.npcs || [],
    items: input.items || [],
    exp: input.exp,
    skills: input.skills || [],
    dismissed: input.dismissed || new Set(),
    seenXiakedao: !!input.seenXiakedao,
    finished: !!input.finished,
  };
}
