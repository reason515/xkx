export type RuleKind = "alias" | "trigger" | "timer";

export interface AliasRule {
  kind: "alias";
  id: string;
  name: string;
  enabled: boolean;
  alias: string;
  expansion: string;
}

export type TriggerAction =
  | { type: "send"; command: string }
  | { type: "toast"; message: string }
  | { type: "sound"; url: string }
  | { type: "enable"; ruleId: string }
  | { type: "disable"; ruleId: string }
  | { type: "timer"; action: "start" | "stop"; timerId: string };

export interface TriggerRule {
  kind: "trigger";
  id: string;
  name: string;
  enabled: boolean;
  pattern: string;
  patternType: "wildcard" | "regex" | "exact";
  caseSensitive: boolean;
  action: TriggerAction[];
  advanced?: {
    eventType?: string;
    cooldownMs?: number;
    maxTriggers?: number;
    oneShot?: boolean;
  };
}

export interface TimerRule {
  kind: "timer";
  id: string;
  name: string;
  enabled: boolean;
  intervalMs: number;
  action: string;
  oneShot: boolean;
}

export type Rule = AliasRule | TriggerRule | TimerRule;

export interface RuleSet {
  version: 1;
  name: string;
  description?: string;
  rules: Rule[];
  exportedAt: string;
}

export const MAX_RULES = 100;
export const MIN_TIMER_MS = 1000;
export const DEFAULT_TRIGGER_COOLDOWN_MS = 500;
export const ENGINE_CMD_RATE_PER_SEC = 5;

/** Timer must not auto-navigate (anti AFK pathing). */
export const NAV_CMD_RE = /(?:^|[;#\s])(go|enter|out)(?:\s|$)/i;
