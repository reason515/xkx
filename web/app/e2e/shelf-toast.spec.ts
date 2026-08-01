import { test, expect } from "@playwright/test";
import { loginAsNewbie } from "./helpers";

async function sendCmd(page: any, text: string, wait = 1500) {
  const input = page.locator(".log-cmd-input");
  if (!(await input.isVisible({ timeout: 800 }).catch(() => false))) {
    const menuBtn = page.getByRole("button", { name: "菜单" });
    if (await menuBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
      await menuBtn.click();
      await page.waitForTimeout(400);
    }
    const cmdItem = page.locator('[role="menuitem"]').filter({ hasText: "指令" }).first();
    if (await cmdItem.isVisible({ timeout: 2000 }).catch(() => false)) {
      await cmdItem.click();
      await page.waitForTimeout(400);
    }
  }
  await input.fill(text);
  await page.locator(".log-cmd-send").click();
  await page.waitForTimeout(wait);
}

test("查看书架的多行提示完整显示在 toast（不拆成 toast+见闻两半）", async ({ page }) => {
  test.setTimeout(150_000);
  await loginAsNewbie(page);
  await sendCmd(page, "newbietest skip 32", 4000);
  // 切到物品 tab，点「书架」→ 查看
  await page.locator(".scene-tabs button").filter({ hasText: "物品" }).first().click();
  await page.waitForTimeout(400);
  const shelf = page.locator(".chip.item").filter({ hasText: "书架" }).first();
  await shelf.click();
  await page.waitForTimeout(600);
  await page.locator(".sheet-acts button").filter({ hasText: "查看" }).first().click();
  // toast 应包含完整两行（前半句 + 后半句），不再拆分
  await expect(page.locator(".toast")).toHaveClass(/show/, { timeout: 10_000 });
  const toastText = await page.locator(".toast").innerText();
  console.log("TOAST:", toastText.slice(0, 120));
  expect(toastText).toContain("在书架的醒目位置");
  expect(toastText).toContain("从书架上取下来");
  // 见闻中不应残留后半句（已并入 toast）
  const logText = await page.locator(".log-summary-text").innerText().catch(() => "");
  expect(logText).not.toContain("从书架上取下来");
});
