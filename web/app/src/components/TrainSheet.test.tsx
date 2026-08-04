import { describe, expect, it } from "vitest";
import { buildPracticeOptions } from "./TrainSheet";

describe("buildPracticeOptions", () => {
  it("lists non-force practice slots and excludes parry", () => {
    // 练功(lian) 只列战斗技能：内功走打坐(dazuo)，招架不单独练，均排除
    expect(
      buildPracticeOptions({
        force: { skill: "huntian-qigong", name: "混天气功", level: 20 },
        strike: { skill: "xianglong-zhang", name: "降龙十八掌", level: 30 },
        parry: { skill: "xianglong-zhang", name: "降龙十八掌", level: 30 },
      })
    ).toEqual([
      { id: "strike", label: "掌法 · 降龙十八掌" },
    ]);
  });
});
