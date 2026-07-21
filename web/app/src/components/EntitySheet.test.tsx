import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { EntitySheet } from "./EntitySheet";

const baseProps = {
  id: "master",
  name: "师父",
  kind: "npc" as const,
  onClose: () => undefined,
  onAction: () => undefined,
};

describe("EntitySheet NPC actions", () => {
  it("shows core actions and groups risky actions under 江湖手段", () => {
    const html = renderToStaticMarkup(<EntitySheet {...baseProps} />);
    for (const text of [
      "查看",
      "打听",
      "请教",
      "跟随",
      "给予",
      "江湖手段",
      "切磋",
      "攻击",
      "停手",
    ]) {
      expect(html).toContain(text);
    }
    expect(html).not.toContain("常用");
    expect(html).not.toContain("往来");
    expect(html).not.toContain(">打<");
  });

  it("only shows apprentice and trade when server capabilities allow them", () => {
    const ordinary = renderToStaticMarkup(<EntitySheet {...baseProps} />);
    expect(ordinary).not.toContain("拜师");
    expect(ordinary).not.toContain("购买");
    expect(ordinary).not.toContain("卖出");

    const capable = renderToStaticMarkup(
      <EntitySheet
        {...baseProps}
        canApprentice={1}
        canTrade={1}
        canSell={1}
      />
    );
    expect(capable).toContain("拜师");
    expect(capable).toContain("购买");
    expect(capable).toContain("卖出");
  });

  it("keeps learn assist opt-in behind the skill selection", () => {
    const html = renderToStaticMarkup(
      <EntitySheet
        {...baseProps}
        askHints={[{ command: "learn master force", label: "向师父学内功" }]}
      />
    );
    expect(html).toContain("请教");
    expect(html).not.toContain("学到潜能耗尽");
    expect(html).not.toContain("开始学习");
  });
});
