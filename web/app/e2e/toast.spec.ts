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

test("角色气血页运功反馈以 toast 展示（不被浮层遮挡）", async ({ page }) => {
  test.setTimeout(150_000);
  await loginAsNewbie(page);
  // 跳到学艺完成（9 项技能）并激发内功
  await sendCmd(page, "newbietest skip 20", 4000);
  await sendCmd(page, "jifa force taiyi-shengong", 2500);
  // 打开角色面板 → 气血
  await page.locator(".hero-avatar").click();
  await page.waitForTimeout(1200);
  await page.locator(".tabs button").filter({ hasText: "气血" }).first().click();
  await page.waitForTimeout(1500);
  // 状态条名称恢复初始设定（气/精 单字）
  await expect(page.locator(".meter-list")).toContainText("气");
  await expect(page.locator(".meter-list")).toContainText("精");
  // 点回气 → 服务器反馈以 toast 弹出（toast z-index 高于浮层）
  await page.locator('[data-testid="force-exert-recover"]').first().click();
  await expect(page.locator(".toast")).toHaveClass(/show/, { timeout: 10_000 });
  const toastText = await page.locator(".toast").innerText();
  expect(toastText.trim().length).toBeGreaterThan(0);
  console.log("TOAST:", toastText.slice(0, 80));
});
