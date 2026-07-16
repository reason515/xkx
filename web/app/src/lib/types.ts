export interface Vitals {
  qi?: number;
  maxQi?: number;
  effQi?: number;
  jing?: number;
  maxJing?: number;
  effJing?: number;
  jingli?: number;
  maxJingli?: number;
  neili?: number;
  maxNeili?: number;
  food?: number;
  maxFood?: number;
  water?: number;
  maxWater?: number;
  potential?: number;
  maxPotential?: number;
  exp?: number;
}

export interface ExitInfo {
  dir: string;
  label: string;
  name?: string;
}

export interface Entity {
  id: string;
  name: string;
  kind: "npc" | "item";
}

/** Context action hinted by room/NPC text (e.g. follow mu laoqi). */
export interface SuggestedAction {
  label: string;
  command: string;
}

export interface RoomState {
  title?: string;
  desc?: string;
  /** MUD area key from outdoors /d/<area>/… (e.g. xiakedao). */
  area?: string;
  /** From room sleep_room (LPC) or desc/title heuristics. */
  canSleep?: boolean;
  exits: ExitInfo[];
  npcs: Entity[];
  items: Entity[];
}

export interface SkillRow {
  id: string;
  name: string;
  level: number;
  /** Points toward next level; next costs (level+1)^2. */
  learned: number;
  category: string;
  /** 1–6 tone band for --mastery-N. */
  mastery: number;
  /** MUD text like 初学乍练 / 深不可测. */
  masteryLabel?: string;
  equipped?: boolean;
}

/** One enable/jifa slot (内功/轻功/剑法…). */
export interface EnabledSkill {
  /** Special skill id, e.g. taiji-jian */
  skill: string;
  /** Chinese name when known from enable panel. */
  name?: string;
  level: number;
}

export interface ScoreAttr {
  cur: number;
  base: number;
}

export interface ScoreInfo {
  headline?: string;
  bio?: string;
  master?: string;
  spouse?: string;
  attrs?: {
    str?: ScoreAttr;
    int?: ScoreAttr;
    con?: ScoreAttr;
    dex?: ScoreAttr;
  };
  exp?: number;
  shen?: number;
  questExp?: number;
  kills?: number;
  playerKills?: number;
  deaths?: number;
  normalDeaths?: number;
  attack?: number;
  defense?: number;
}

export type InvEquipKind = "weapon" | "armor" | "other";

export interface InvItem {
  id: string;
  name: string;
  type: string;
  /** □ worn/wielded in inventory panel */
  equipped?: boolean;
  /** √ embedded (e.g. 毒针), not normal wear */
  embedded?: boolean;
  /** Heuristic for wear vs wield */
  equipKind?: InvEquipKind;
}

export interface AssistConfig {
  mode: "dazuo" | "tuna" | "lian" | "combat";
  stopWhen?: "full" | "count" | "potential";
  stopCount?: number;
  skill?: string;
  lowHpPct?: number;
  lowHpAction?: "warn" | "flee" | "stop";
  stopOnCombat?: boolean;
}

export interface MudEvent {
  v: number;
  type: string;
  [key: string]: unknown;
}

export interface LogEntry {
  id: number;
  text: string;
  /** Gateway-sanitized ANSI markup, never sourced directly from MUD text in the DOM. */
  html?: string;
  kind?: "combat" | "train" | "sys" | "normal";
}

export type SheetKind =
  | "character"
  | "map"
  | "help"
  | "train"
  | "combat"
  | "entity"
  | "exit"
  | null;

/** Where long-form MUD text (help / board / exit look) is being captured. */
export type DocTarget = "help" | "entity" | "exit";

export interface GameState {
  connected: boolean;
  inGame: boolean;
  playerName: string;
  vitals: Vitals;
  room: RoomState;
  suggestedActions: SuggestedAction[];
  logs: LogEntry[];
  lookText: string;
  lookHtml: string;
  scoreText: string;
  scoreHtml: string;
  score?: ScoreInfo;
  skills: SkillRow[];
  inventory: InvItem[];
  /** enable/jifa map: slot id → special skill. */
  enabled: Record<string, EnabledSkill>;
  /** prepare/bei map: basic fist slot → special skill id. */
  prepared: Record<string, string>;
  combatLog: string[];
  trainLog: string[];
  assistActive: boolean;
  assistStatus: string;
  sheet: SheetKind;
  /** Captured long text for 帮助 / 告示牌面板（不进见闻）。 */
  docText: string;
  docLoading: boolean;
  docTarget: DocTarget | null;
}
