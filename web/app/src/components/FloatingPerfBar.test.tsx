import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { FloatingPerfBar, collectPerfGroups } from "./FloatingPerfBar";

describe("collectPerfGroups", () => {
  it("lists 绝招 for enabled skills recorded in PERF_MOVES", () => {
    const groups = collectPerfGroups({
      sword: { skill: "taiji-jian", name: "太极剑", level: 100 },
    });
    expect(groups).toHaveLength(1);
    expect(groups[0].slot).toBe("sword");
    expect(groups[0].actions.map((a) => a.action)).toContain("chan");
    expect(groups[0].actions.map((a) => a.name)).toContain("缠");
  });

  it("skips skills without recorded 绝招 and 无", () => {
    const groups = collectPerfGroups({
      force: { skill: "taixuan-gong", name: "太玄功", level: 100 },
      dodge: { skill: "无", name: "无", level: 0 },
    });
    expect(groups).toHaveLength(0);
  });

  it("deduplicates the same skill bound to multiple slots", () => {
    const groups = collectPerfGroups({
      sword: { skill: "taiji-jian", name: "太极剑", level: 100 },
      parry: { skill: "taiji-jian", name: "太极剑", level: 100 },
    });
    expect(groups).toHaveLength(1);
  });
});

describe("FloatingPerfBar", () => {
  it("renders nothing when no enabled skill has recorded moves", () => {
    const html = renderToStaticMarkup(
      <FloatingPerfBar enabled={{}} onCmd={() => undefined} onClose={() => undefined} />
    );
    expect(html).toBe("");
  });

  it("renders 绝招 buttons for enabled skills", () => {
    const html = renderToStaticMarkup(
      <FloatingPerfBar
        enabled={{ sword: { skill: "taiji-jian", name: "太极剑", level: 100 } }}
        onCmd={() => undefined}
        onClose={() => undefined}
      />
    );
    expect(html).toContain("floating-perf");
    expect(html).toContain("缠");
    expect(html).toContain("绕指柔剑");
    // 5 个太极剑绝招按钮
    expect((html.match(/class="chip action"/g) || []).length).toBe(5);
  });
});
