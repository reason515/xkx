import { describe, expect, it } from "vitest";
import {
  buildGuideContext,
  isReadyToLeaveIsland,
  matchGuideTip,
} from "./guideTips";
import type { SkillRow } from "./types";

function skillsAt(level: number, n: number, extra: SkillRow[] = []): SkillRow[] {
  const ids = ["force", "dodge", "parry", "strike", "sword", "unarmed", "blade"];
  return [
    ...ids.slice(0, n).map((id) => ({
      id,
      name: id,
      level,
      learned: 0,
      category: "misc",
      mastery: 1,
    })),
    ...extra,
  ];
}

describe("isReadyToLeaveIsland", () => {
  it("requires exp 250 and six skills at 10 excluding literate", () => {
    expect(isReadyToLeaveIsland(249, skillsAt(10, 6))).toBe(false);
    expect(isReadyToLeaveIsland(250, skillsAt(10, 5))).toBe(false);
    expect(isReadyToLeaveIsland(250, skillsAt(10, 6))).toBe(true);
    expect(
      isReadyToLeaveIsland(250, [
        ...skillsAt(10, 5),
        {
          id: "literate",
          name: "读书写字",
          level: 21,
          learned: 0,
          category: "knowledge",
          mastery: 1,
        },
      ])
    ).toBe(false);
  });
});

describe("matchGuideTip", () => {
  it("locked beach offers follow tip", () => {
    const tip = matchGuideTip(
      buildGuideContext({
        area: "xiakedao",
        title: "沙滩",
        exits: [],
        npcs: [{ id: "zhang san", name: "张三", kind: "npc" }],
      })
    );
    expect(tip?.id).toBe("beach-follow");
    expect(tip?.text).toMatch(/跟随迎宾/);
    expect(tip?.text).not.toMatch(/新手引导/);
  });

  it("main beach with fisherman orients player", () => {
    const tip = matchGuideTip(
      buildGuideContext({
        area: "xiakedao",
        title: "沙滩",
        exits: [{ dir: "north", label: "北" }],
        npcs: [{ id: "yu fu", name: "渔夫", kind: "npc" }],
      })
    );
    expect(tip?.id).toBe("beach-orient");
  });

  it("beach with enter prefers boat tip", () => {
    const tip = matchGuideTip(
      buildGuideContext({
        area: "xiakedao",
        title: "沙滩",
        exits: [
          { dir: "north", label: "北" },
          { dir: "enter", label: "进" },
        ],
        npcs: [{ id: "yu fu", name: "渔夫", kind: "npc" }],
      })
    );
    expect(tip?.id).toBe("beach-boat");
  });

  it("waterfall tip", () => {
    expect(
      matchGuideTip(
        buildGuideContext({ area: "xiakedao", title: "瀑布", exits: [] })
      )?.id
    ).toBe("waterfall");
  });

  it("wanghai / shanding / yangxin tips", () => {
    expect(
      matchGuideTip(
        buildGuideContext({ area: "xiakedao", title: "望海亭", exits: [] })
      )?.id
    ).toBe("wanghai-fish");
    expect(
      matchGuideTip(
        buildGuideContext({ area: "xiakedao", title: "山顶", exits: [] })
      )?.id
    ).toBe("shanding-fruit");
    expect(
      matchGuideTip(
        buildGuideContext({
          area: "xiakedao",
          title: "养心居",
          exits: [],
          npcs: [{ id: "doctor", name: "医者", kind: "npc" }],
        })
      )?.id
    ).toBe("yangxin-coconut");
  });

  it("dadong without enter asks about 岛主", () => {
    expect(
      matchGuideTip(
        buildGuideContext({
          area: "xiakedao",
          title: "大山洞",
          exits: [{ dir: "south", label: "南" }],
          npcs: [{ id: "si pu", name: "厮仆", kind: "npc" }],
        })
      )?.id
    ).toBe("dadong-ask");
  });

  it("closed doors tip", () => {
    expect(
      matchGuideTip(
        buildGuideContext({
          area: "xiakedao",
          title: "石门",
          exits: [{ dir: "south", label: "南" }],
          doors: [{ dir: "enter", name: "石门", status: "closed" }],
        })
      )?.id
    ).toBe("gate-open");
  });

  it("train cave tip when not ready", () => {
    expect(
      matchGuideTip(
        buildGuideContext({
          area: "xiakedao",
          title: "石洞",
          exits: [{ dir: "enter", label: "进" }],
          exp: 50,
          skills: skillsAt(5, 3),
        })
      )?.id
    ).toBe("train-cave");
  });

  it("ready-leave when thresholds met off beach", () => {
    expect(
      matchGuideTip(
        buildGuideContext({
          area: "xiakedao",
          title: "石洞",
          exits: [{ dir: "west", label: "西" }],
          exp: 300,
          skills: skillsAt(12, 6),
        })
      )?.id
    ).toBe("ready-leave");
  });

  it("shore car tip", () => {
    expect(
      matchGuideTip(
        buildGuideContext({
          area: "xiakedao",
          title: "沙滩",
          exits: [],
          items: [{ id: "da che", name: "大车", kind: "item" }],
        })
      )?.id
    ).toBe("shore-car");
  });

  it("mainland welcome after island", () => {
    expect(
      matchGuideTip(
        buildGuideContext({
          area: "city",
          title: "扬州客店",
          exits: [{ dir: "west", label: "西" }],
          seenXiakedao: true,
        })
      )?.id
    ).toBe("mainland-welcome");
  });

  it("respects dismiss and finished", () => {
    expect(
      matchGuideTip(
        buildGuideContext({
          area: "xiakedao",
          title: "瀑布",
          exits: [],
          dismissed: new Set(["waterfall"]),
        })
      )
    ).toBeNull();

    expect(
      matchGuideTip(
        buildGuideContext({
          area: "city",
          title: "扬州客店",
          exits: [],
          seenXiakedao: true,
          finished: true,
        })
      )
    ).toBeNull();
  });
});
