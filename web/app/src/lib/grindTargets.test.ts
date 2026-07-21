import { describe, expect, it } from "vitest";
import { YANGZHOU_GRIND_TARGETS } from "./grindTargets";

describe("YANGZHOU_GRIND_TARGETS", () => {
  it("orders the city-south route from 300 to 3000 combat experience", () => {
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
});
