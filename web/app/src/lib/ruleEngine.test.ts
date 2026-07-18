import { afterEach, describe, expect, it, vi } from "vitest";
import { RuleEngine, createRuleId } from "./ruleEngine";
import type { Rule } from "./ruleTypes";

describe("RuleEngine", () => {
  let engine: RuleEngine;
  const sent: string[] = [];

  afterEach(() => {
    engine?.emergencyStopAll();
    sent.length = 0;
    vi.useRealTimers();
  });

  function setup(rules: Rule[]) {
    engine = new RuleEngine();
    engine.bind({
      send: (c) => {
        sent.push(c);
      },
    });
    engine.load(rules);
    return engine;
  }

  it("expands alias with $1 and $*", () => {
    setup([
      {
        kind: "alias",
        id: "a1",
        name: "put",
        enabled: true,
        alias: "pb",
        expansion: "put $1 in $2",
      },
      {
        kind: "alias",
        id: "a2",
        name: "all",
        enabled: true,
        alias: "sayall",
        expansion: "say $*",
      },
    ]);
    expect(engine.processInput("pb bandage bag")).toBe("put bandage in bag");
    expect(engine.processInput("sayall hello world")).toBe("say hello world");
    expect(engine.processInput("score")).toBe("score");
  });

  it("matches exact / wildcard / regex triggers and sends", () => {
    setup([
      {
        kind: "trigger",
        id: "t1",
        name: "hunger",
        enabled: true,
        pattern: "你饿了。",
        patternType: "exact",
        caseSensitive: true,
        action: [{ type: "send", command: "eat gan liang" }],
        advanced: { cooldownMs: 0 },
      },
      {
        kind: "trigger",
        id: "t2",
        name: "wild",
        enabled: true,
        pattern: "你受了*",
        patternType: "wildcard",
        caseSensitive: true,
        action: [{ type: "send", command: "hp" }],
        advanced: { cooldownMs: 0 },
      },
    ]);
    engine.processOutput("你饿了。");
    expect(sent).toContain("eat gan liang");
    engine.processOutput("你受了致命一击！");
    expect(sent).toContain("hp");
  });

  it("respects cooldown and rate limit", () => {
    setup([
      {
        kind: "trigger",
        id: "t1",
        name: "spam",
        enabled: true,
        pattern: "叮",
        patternType: "exact",
        caseSensitive: true,
        action: [{ type: "send", command: "hp" }],
        advanced: { cooldownMs: 5000 },
      },
    ]);
    engine.processOutput("叮");
    engine.processOutput("叮");
    expect(sent.filter((c) => c === "hp")).toHaveLength(1);

    const warns: string[] = [];
    engine.bind({
      send: (c) => sent.push(c),
      warn: (m) => warns.push(m),
    });
    for (let i = 0; i < 8; i++) {
      engine.updateRule("t1", {
        advanced: { cooldownMs: 0 },
      } as Partial<Rule>);
      // force unique lastTriggered bypass by clearing via process with different timing
      (engine as unknown as { lastTriggered: Map<string, number> }).lastTriggered.clear();
      engine.processOutput("叮");
    }
    expect(warns.some((w) => /过于频繁/.test(w))).toBe(true);
  });

  it("emergency stop disables rules and blocks timers", () => {
    vi.useFakeTimers();
    setup([
      {
        kind: "timer",
        id: "tm1",
        name: "tick",
        enabled: true,
        intervalMs: 1000,
        action: "hp",
        oneShot: false,
      },
    ]);
    vi.advanceTimersByTime(1000);
    expect(sent.length).toBeGreaterThanOrEqual(1);
    const before = sent.length;
    engine.emergencyStopAll();
    vi.advanceTimersByTime(3000);
    expect(sent.length).toBe(before);
    expect(engine.getRules().every((r) => !r.enabled)).toBe(true);
  });

  it("timer rejects navigation commands", () => {
    const warns: string[] = [];
    engine = new RuleEngine();
    engine.bind({ send: (c) => sent.push(c), warn: (m) => warns.push(m) });
    engine.load([
      {
        kind: "timer",
        id: "tm1",
        name: "bad",
        enabled: true,
        intervalMs: 1000,
        action: "go north",
        oneShot: false,
      },
    ]);
    expect(warns.some((w) => /禁止自动移动/.test(w))).toBe(true);
    expect(sent).toHaveLength(0);
  });

  it("engine output does not re-enter alias chain", () => {
    setup([
      {
        kind: "alias",
        id: "a1",
        name: "loop",
        enabled: true,
        alias: "hp",
        expansion: "score",
      },
      {
        kind: "trigger",
        id: "t1",
        name: "t",
        enabled: true,
        pattern: "ping",
        patternType: "exact",
        caseSensitive: true,
        action: [{ type: "send", command: "hp" }],
        advanced: { cooldownMs: 0 },
      },
    ]);
    engine.processOutput("ping");
    expect(sent).toEqual(["hp"]);
  });

  it("createRuleId returns unique-ish ids", () => {
    const a = createRuleId();
    const b = createRuleId();
    expect(a).not.toBe(b);
    expect(a.startsWith("r_")).toBe(true);
  });
});
