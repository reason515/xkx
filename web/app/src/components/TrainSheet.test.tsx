import { describe, expect, it } from "vitest";
import { buildPracticeOptions } from "./TrainSheet";

describe("buildPracticeOptions", () => {
  it("lists enabled practice slots and excludes parry", () => {
    expect(
      buildPracticeOptions({
        force: { skill: "huntian-qigong", name: "混天气功", level: 20 },
        strike: { skill: "xianglong-zhang", name: "降龙十八掌", level: 30 },
        parry: { skill: "xianglong-zhang", name: "降龙十八掌", level: 30 },
      })
    ).toEqual([
      { id: "force", label: "内功 · 混天气功" },
      { id: "strike", label: "掌法 · 降龙十八掌" },
    ]);
  });
});
