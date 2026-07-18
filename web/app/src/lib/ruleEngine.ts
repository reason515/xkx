import {
  DEFAULT_TRIGGER_COOLDOWN_MS,
  ENGINE_CMD_RATE_PER_SEC,
  MAX_RULES,
  MIN_TIMER_MS,
  NAV_CMD_RE,
  type AliasRule,
  type Rule,
  type TimerRule,
  type TriggerAction,
  type TriggerRule,
} from "./ruleTypes";

export type EngineSend = (command: string, meta?: { fromEngine?: boolean }) => void;
export type EngineToast = (message: string) => void;
export type EngineWarn = (message: string) => void;

function expandAlias(expansion: string, args: string[]): string {
  let out = expansion;
  out = out.replace(/\$\*/g, args.join(" "));
  out = out.replace(/\$(\d+)/g, (_, n) => {
    const i = Number(n) - 1;
    return args[i] ?? "";
  });
  return out.trim();
}

function wildcardToRegExp(pattern: string, caseSensitive: boolean): RegExp {
  const esc = pattern.replace(/[.+^${}()|[\]\\]/g, "\\$&").replace(/\*/g, ".*");
  return new RegExp(`^${esc}$`, caseSensitive ? "" : "i");
}

function matchTrigger(rule: TriggerRule, line: string): boolean {
  const text = rule.caseSensitive ? line : line.toLowerCase();
  const pat = rule.caseSensitive ? rule.pattern : rule.pattern.toLowerCase();
  if (rule.patternType === "exact") return text === pat;
  if (rule.patternType === "wildcard") {
    return wildcardToRegExp(rule.pattern, rule.caseSensitive).test(line);
  }
  try {
    const body = rule.pattern.startsWith("/") && rule.pattern.lastIndexOf("/") > 0
      ? rule.pattern.slice(1, rule.pattern.lastIndexOf("/"))
      : rule.pattern;
    const flags = rule.caseSensitive ? "" : "i";
    return new RegExp(body, flags).test(line);
  } catch {
    return false;
  }
}

export class RuleEngine {
  private rules: Rule[] = [];
  private timers = new Map<string, ReturnType<typeof setInterval>>();
  private lastTriggered = new Map<string, number>();
  private triggerCounts = new Map<string, number>();
  private emergencyStop = false;
  private cmdRate = { count: 0, resetAt: 0 };
  private sendFn: EngineSend | null = null;
  private toastFn: EngineToast | null = null;
  private warnFn: EngineWarn | null = null;
  private processingEngine = false;

  bind(opts: {
    send: EngineSend;
    toast?: EngineToast;
    warn?: EngineWarn;
  }): void {
    this.sendFn = opts.send;
    this.toastFn = opts.toast ?? null;
    this.warnFn = opts.warn ?? null;
  }

  load(rules: Rule[]): void {
    this.stopAllTimers();
    this.rules = rules.slice(0, MAX_RULES);
    this.lastTriggered.clear();
    this.triggerCounts.clear();
    this.emergencyStop = false;
    for (const r of this.rules) {
      if (r.kind === "timer" && r.enabled) this.startTimer(r.id);
    }
  }

  save(): Rule[] {
    return this.rules.map((r) => ({ ...r }));
  }

  getRules(): Rule[] {
    return this.save();
  }

  isEmergencyStopped(): boolean {
    return this.emergencyStop;
  }

  addRule(rule: Rule): boolean {
    if (this.rules.length >= MAX_RULES) return false;
    if (rule.kind === "timer" && rule.intervalMs < MIN_TIMER_MS) {
      rule = { ...rule, intervalMs: MIN_TIMER_MS };
    }
    this.rules.push(rule);
    if (rule.kind === "timer" && rule.enabled && !this.emergencyStop) {
      this.startTimer(rule.id);
    }
    return true;
  }

  updateRule(id: string, partial: Partial<Rule>): void {
    const i = this.rules.findIndex((r) => r.id === id);
    if (i < 0) return;
    const prev = this.rules[i];
    const next = { ...prev, ...partial, kind: prev.kind, id: prev.id } as Rule;
    if (next.kind === "timer" && next.intervalMs < MIN_TIMER_MS) {
      next.intervalMs = MIN_TIMER_MS;
    }
    this.rules[i] = next;
    if (prev.kind === "timer") this.stopTimer(id);
    if (next.kind === "timer" && next.enabled && !this.emergencyStop) {
      this.startTimer(id);
    }
  }

  removeRule(id: string): void {
    this.stopTimer(id);
    this.rules = this.rules.filter((r) => r.id !== id);
  }

  toggleRule(id: string): void {
    const r = this.rules.find((x) => x.id === id);
    if (!r) return;
    this.updateRule(id, { enabled: !r.enabled } as Partial<Rule>);
  }

  /** Alias expansion for user input. Does not send. */
  processInput(input: string): string {
    if (this.emergencyStop || this.processingEngine) return input;
    const trimmed = input.trim();
    if (!trimmed) return input;
    const parts = trimmed.split(/\s+/);
    const head = parts[0];
    const args = parts.slice(1);
    const aliases = this.rules.filter(
      (r): r is AliasRule => r.kind === "alias" && r.enabled
    );
    for (const a of aliases) {
      if (a.alias === head) {
        return expandAlias(a.expansion, args);
      }
    }
    return input;
  }

  processOutput(
    line: string,
    eventType?: string
  ): { actions: TriggerAction[]; shouldShow: boolean } {
    const actions: TriggerAction[] = [];
    if (this.emergencyStop || this.processingEngine) {
      return { actions, shouldShow: true };
    }
    const plain = line.replace(/\x1b\[[0-9;?]*[ -/]*[@-~]/g, "").trim();
    if (!plain) return { actions, shouldShow: true };

    const triggers = this.rules.filter(
      (r): r is TriggerRule => r.kind === "trigger" && r.enabled
    );
    const now = Date.now();
    for (const t of triggers) {
      if (t.advanced?.eventType && eventType && t.advanced.eventType !== eventType) {
        continue;
      }
      if (!matchTrigger(t, plain)) continue;
      const cd = t.advanced?.cooldownMs ?? DEFAULT_TRIGGER_COOLDOWN_MS;
      const last = this.lastTriggered.get(t.id) ?? 0;
      if (now - last < cd) continue;
      const max = t.advanced?.maxTriggers ?? 0;
      const count = this.triggerCounts.get(t.id) ?? 0;
      if (max > 0 && count >= max) continue;
      this.lastTriggered.set(t.id, now);
      this.triggerCounts.set(t.id, count + 1);
      actions.push(...t.action);
      if (t.advanced?.oneShot) {
        this.updateRule(t.id, { enabled: false });
      }
    }
    this.runActions(actions);
    return { actions, shouldShow: true };
  }

  private runActions(actions: TriggerAction[]): void {
    for (const a of actions) {
      if (a.type === "send") {
        this.engineSend(a.command);
      } else if (a.type === "toast") {
        this.toastFn?.(a.message);
      } else if (a.type === "sound") {
        try {
          new Audio(a.url).play().catch(() => undefined);
        } catch {
          /* ignore */
        }
      } else if (a.type === "enable") {
        this.updateRule(a.ruleId, { enabled: true });
      } else if (a.type === "disable") {
        this.updateRule(a.ruleId, { enabled: false });
      } else if (a.type === "timer") {
        if (a.action === "start") this.startTimer(a.timerId);
        else this.stopTimer(a.timerId);
      }
    }
  }

  private isRateLimited(): boolean {
    const now = Date.now();
    if (now >= this.cmdRate.resetAt) {
      this.cmdRate = { count: 0, resetAt: now + 1000 };
    }
    if (this.cmdRate.count >= ENGINE_CMD_RATE_PER_SEC) return true;
    this.cmdRate.count += 1;
    return false;
  }

  private engineSend(command: string): void {
    const cmd = command.trim();
    if (!cmd || !this.sendFn) return;
    if (this.isRateLimited()) {
      this.warnFn?.("[规则] 触发过于频繁，已跳过");
      return;
    }
    this.processingEngine = true;
    try {
      this.sendFn(cmd, { fromEngine: true });
    } finally {
      this.processingEngine = false;
    }
  }

  startTimer(timerId: string): void {
    this.stopTimer(timerId);
    if (this.emergencyStop) return;
    const rule = this.rules.find(
      (r): r is TimerRule => r.kind === "timer" && r.id === timerId
    );
    if (!rule || !rule.enabled) return;
    if (NAV_CMD_RE.test(rule.action)) {
      this.warnFn?.("[规则] Timer 禁止自动移动指令");
      return;
    }
    const ms = Math.max(MIN_TIMER_MS, rule.intervalMs);
    const tick = () => {
      if (this.emergencyStop || !rule.enabled) {
        this.stopTimer(timerId);
        return;
      }
      this.engineSend(rule.action);
      if (rule.oneShot) {
        this.updateRule(timerId, { enabled: false });
        this.stopTimer(timerId);
      }
    };
    const handle = setInterval(tick, ms);
    this.timers.set(timerId, handle);
  }

  stopTimer(timerId: string): void {
    const h = this.timers.get(timerId);
    if (h) {
      clearInterval(h);
      this.timers.delete(timerId);
    }
  }

  private stopAllTimers(): void {
    for (const id of [...this.timers.keys()]) this.stopTimer(id);
  }

  emergencyStopAll(): void {
    this.emergencyStop = true;
    this.stopAllTimers();
    for (const r of this.rules) {
      if (r.enabled) this.updateRule(r.id, { enabled: false });
    }
  }

  clearEmergencyStop(): void {
    this.emergencyStop = false;
  }
}

export function createRuleId(): string {
  return `r_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}
