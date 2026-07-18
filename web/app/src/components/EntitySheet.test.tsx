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
  it("groups common, social and combat actions with clear labels", () => {
    const html = renderToStaticMarkup(<EntitySheet {...baseProps} />);
    for (const text of [
      "常用",
      "查看",
      "打听",
      "请教",
      "往来",
      "跟随",
      "给予",
      "交手",
      "切磋",
      "攻击",
    ]) {
      expect(html).toContain(text);
    }
    expect(html).not.toContain(">打<");
  });

  it("only shows apprentice and trade when server capabilities allow them", () => {
    const ordinary = renderToStaticMarkup(<EntitySheet {...baseProps} />);
    expect(ordinary).not.toContain("拜师");
    expect(ordinary).not.toContain("货品");

    const capable = renderToStaticMarkup(
      <EntitySheet
        {...baseProps}
        canApprentice={1}
        canTrade={1}
      />
    );
    expect(capable).toContain("拜师");
    expect(capable).toContain("货品");
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
