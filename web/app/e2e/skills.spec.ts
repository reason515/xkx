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

test("武功页技能列表显示已学会的特殊功夫（e2c 词典缺词条回归）", async ({ page }) => {
  await loginAsNewbie(page);
  // 跳到任务 20：获得 9 项技能 5 级 + newbie_village/master（未激发）
  await sendCmd(page, "newbietest skip 20", 4000);
  // 打开角色面板 → 武功
  await page.locator(".hero-avatar").click();
  await page.waitForTimeout(1200);
  await page.locator(".tabs button").filter({ hasText: "武功" }).first().click();
  await page.waitForTimeout(2500);
  const panel = page.locator(".panel.on");
  // 特殊功夫必须出现（MUD skills 输出中文名后前端可解析）
  await expect(panel).toContainText("太乙神功");
  await expect(panel).toContainText("太乙神游");
  await expect(panel).toContainText("太乙剑法");
  await expect(panel).toContainText("太乙掌法");
  // 未激发时显示引导文案（skill_map 空）
  await expect(panel).toContainText("尚未激发特殊武功");
});
