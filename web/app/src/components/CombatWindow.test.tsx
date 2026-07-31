import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { CombatWindow, collectPerfGroups } from "./CombatWindow";

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

describe("CombatWindow", () => {
  const baseProps = {
    combatLog: [] as { text: string; html?: string }[],
    enabled: {},
    vitals: { qi: 100, maxQi: 200, neili: 500, maxNeili: 1000 },
    onCmd: () => undefined,
    onClose: () => undefined,
  };

  it("renders combat lines and vitals", () => {
    const html = renderToStaticMarkup(
      <CombatWindow
        {...baseProps}
        combatLog={[{ text: "你一招「横扫千军」向老虎攻去。" }]}
      />
    );
    expect(html).toContain("你一招「横扫千军」向老虎攻去。");
    expect(html).toContain("气 100/200");
    expect(html).toContain("内 500/1000");
  });

  it("renders 绝招 buttons for enabled skills", () => {
    const html = renderToStaticMarkup(
      <CombatWindow
        {...baseProps}
        enabled={{ sword: { skill: "taiji-jian", name: "太极剑", level: 100 } }}
      />
    );
    expect(html).toContain("太极剑");
    expect(html).toContain("缠");
    expect(html).toContain("绕指柔剑");
    expect(html).toContain("combat-window-perf");
  });

  it("hides 绝招 area when no enabled skill has recorded moves", () => {
    const html = renderToStaticMarkup(<CombatWindow {...baseProps} />);
    expect(html).not.toContain("combat-window-perf");
  });
});
