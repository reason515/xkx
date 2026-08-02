import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { ChangeGiftSheet } from "./ChangeGiftSheet";

describe("ChangeGiftSheet", () => {
  const base = {
    onConfirm: () => undefined,
    onClose: () => undefined,
  };

  it("renders four attributes with current values and confirm button", () => {
    const html = renderToStaticMarkup(
      <ChangeGiftSheet
        {...base}
        initial={{ str: 18, int: 24, con: 20, dex: 18 }}
      />
    );
    expect(html).toContain("膂力");
    expect(html).toContain("悟性");
    expect(html).toContain("根骨");
    expect(html).toContain("身法");
    expect(html).toContain("确认重设");
    expect(html).toContain("总和 80/80");
  });

  it("disables confirm when sum is not 80", () => {
    const html = renderToStaticMarkup(
      <ChangeGiftSheet {...base} initial={{ str: 30, int: 30, con: 30, dex: 10 }} />
    );
    // 30+30+30+10 = 100 ≠ 80 → 超出
    expect(html).toContain("超出");
  });
});
