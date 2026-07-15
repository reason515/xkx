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
  exits: ExitInfo[];
  npcs: Entity[];
  items: Entity[];
}

export interface SkillRow {
  id: string;
  name: string;
  level: number;
  learned: number;
  category: string;
  mastery: number;
  equipped?: boolean;
}

export interface InvItem {
  id: string;
  name: string;
  type: string;
  equipped?: boolean;
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
  | "train"
  | "combat"
  | "entity"
  | "exit"
  | null;

export interface GameState {
  connected: boolean;
  inGame: boolean;
  playerName: string;
  vitals: Vitals;
  room: RoomState;
  suggestedActions: SuggestedAction[];
  logs: LogEntry[];
  lookText: string;
  scoreText: string;
  skills: SkillRow[];
  inventory: InvItem[];
  enabled: Record<string, { skill: string; level: number }>;
  combatLog: string[];
  trainLog: string[];
  assistActive: boolean;
  assistStatus: string;
  sheet: SheetKind;
  guideStep: number;
}
