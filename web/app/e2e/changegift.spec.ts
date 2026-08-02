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

test("杏子林游鲲翼可重新设置属性（changegift 按钮 + 界面）", async ({ page }) => {
  test.setTimeout(150_000);
  await loginAsNewbie(page);
  await sendCmd(page, "newbietest skip 34", 4000);
  // 点游鲲翼 → 应有「重新设置属性」按钮
  const you = page.locator(".chip.npc").filter({ hasText: /游鲲翼/ }).first();
  await you.click();
  await page.waitForTimeout(800);
  const giftBtn = page.locator('[data-testid="entity-changegift"]').first();
  await expect(giftBtn).toBeVisible({ timeout: 8000 });
  await giftBtn.click();
  // 属性设置界面
  await expect(page.locator(".changegift-attrs")).toBeVisible({ timeout: 5000 });
  // 确认（初始 20/20/20/20 = 80 合法）
  await page.locator('[data-testid="changegift-confirm"]').first().click();
  await page.waitForTimeout(3000);
  // MUD 反馈（恭喜/资质）以 toast 或见闻出现
  const toastText = await page.locator(".toast").innerText().catch(() => "");
  const logText = await page.locator(".log-summary-text").innerText().catch(() => "");
  console.log("TOAST:", toastText.slice(0, 80), "| LOG:", logText.slice(0, 80));
  expect(toastText + logText).toMatch(/恭喜|资质|改善/);
});
