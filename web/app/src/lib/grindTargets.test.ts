import { describe, expect, it } from "vitest";
import {
  YANGZHOU_GRIND_TARGETS,
  formatExp,
  recExpRange,
} from "./grindTargets";

describe("YANGZHOU_GRIND_TARGETS", () => {
  it("orders the city-south route from weak to strong (300 → 3000)", () => {
    expect(YANGZHOU_GRIND_TARGETS.map((target) => target.id)).toEqual([
      "yz_crow",
      "yz_monkey",
      "yz_goat",
      "yz_dog",
      "yz_boar",
      "yz_wolf",
      "yz_bandit",
      "yz_bandit_leader",
    ]);
    expect(YANGZHOU_GRIND_TARGETS.map((target) => target.label)).toEqual([
      "乌鸦",
      "野猴",
      "野羊",
      "野狗",
      "野猪",
      "野狼",
      "山贼喽啰",
      "山贼头目",
    ]);
  });

  it("combat exp and per-kill gain are monotonic increasing", () => {
    let prev = 0;
    for (const t of YANGZHOU_GRIND_TARGETS) {
      expect(t.exp).toBeGreaterThan(prev);
      prev = t.exp;
    }
    const gains = YANGZHOU_GRIND_TARGETS.map((t) => t.gain);
    expect([...gains].sort((a, b) => a - b)).toEqual(gains);
    // 收益 = floor(怪exp/15)，封顶 3000
    for (const t of YANGZHOU_GRIND_TARGETS) {
      expect(t.gain).toBe(Math.min(3000, Math.floor(t.exp / 15)));
    }
  });

  it("recExpRange shows 怪exp ~ 怪exp×50", () => {
    const crow = YANGZHOU_GRIND_TARGETS[0];
    expect(recExpRange(crow)).toBe("300~1.5万");
    const leader = YANGZHOU_GRIND_TARGETS[7];
    expect(recExpRange(leader)).toBe("3000~15万");
  });
});

describe("formatExp", () => {
  it("formats below 10000 as-is and above as 万", () => {
    expect(formatExp(300)).toBe("300");
    expect(formatExp(15000)).toBe("1.5万");
    expect(formatExp(100000)).toBe("10万");
    expect(formatExp(125000)).toBe("12.5万");
  });
});
