import { expect, test } from "@playwright/test";
import { loginAsE2eAccount } from "./helpers";

/**
 * 太乙武馆学艺回归：
 * - 修复前：未加入武馆时 `skills/cha 教头` 被 do_skill 的 wuguan 门槛拒绝，
 *   Web 学艺面板（docCmd skills 教头）拿不到技能列表 → 显示
 *   「对方与你没有师徒之谊，也未主动传授功夫」，玩家无法学艺。
 * - 修复后：技能查看不再要求加入；学艺面板列出太乙功夫；交学费后可学。
 */
async function cmd(page: any, text: string, wait = 2500) {
  const input = page.locator(".log-cmd-input");
  let vis = await input.isVisible({ timeout: 800 }).catch(() => false);
  if (!vis) {
    const menuBtn = page.getByRole("button", { name: "菜单" });
    if (await menuBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
      await menuBtn.click();
      await page.waitForTimeout(400);
    }
    const item = page.locator('[role="menuitem"]').filter({ hasText: "指令" }).first();
    if (await item.isVisible({ timeout: 2000 }).catch(() => false)) {
      await item.click();
      await page.waitForTimeout(400);
    }
  }
  await input.fill(text);
  await page.locator(".log-cmd-send").click();
  await page.waitForTimeout(wait);
}

test("太乙武馆学艺：学艺面板可见太乙技能，交学费后学习成功", async ({ page }) => {
  test.setTimeout(300_000);
  await loginAsE2eAccount(page, { index: 3 });
  await cmd(page, "webassist stop", 1500).catch(() => {});
  // 钱庄取 20 两白银（prep 只给存款），再去武馆
  await cmd(page, "newbietest prep qianzhuang", 3500);
  await cmd(page, "withdraw 20 silver", 2500);
  await cmd(page, "newbietest prep wuguan", 3500);
  await cmd(page, "south", 3000); // 武馆大厅（教头在此）
  await expect(page.locator(".room-title").first()).toHaveText(/武馆大厅/, { timeout: 15_000 });

  // 1) 未加入武馆也能在学艺面板看到太乙功夫（修复点）
  await page.locator(".chip.npc").filter({ hasText: "教头" }).first().click();
  await expect(page.locator(".sheet")).toBeVisible({ timeout: 10_000 });
  await page.getByRole("button", { name: "学艺" }).click();
  // 技能中文名：太乙掌法/太乙剑法/太乙神功/太乙神游
  await expect(page.locator(".help-topic").filter({ hasText: /太乙掌法|太乙剑法/ }).first()).toBeVisible({ timeout: 15_000 });
  await page.locator(".doc-back").first().click().catch(() => {});
  await page.locator(".sheet-top .close").first().click().catch(() => {});
  await page.waitForTimeout(600);

  // 2) 交学费后学习成功
  await cmd(page, "give 20 silver to jiaotou", 3500);
  await cmd(page, "learn jiaotou taiyi-zhang 1", 3500);
  const summary = page.locator(".log-summary").first();
  const expanded = await summary.getAttribute("aria-expanded").catch(() => "false");
  if (expanded !== "true") await summary.click().catch(() => {});
  await page.waitForTimeout(300);
  await expect(page.locator(".log")).toContainText(/心得|进步/, { timeout: 10_000 });
});
