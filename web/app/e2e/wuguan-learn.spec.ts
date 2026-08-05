import { expect, test } from "@playwright/test";
import {
  loginAsE2eAccount,
  sendCmd,
  prepTo,
  cmdExpectLog,
  waitForLogText,
} from "./helpers";

/**
 * 太乙武馆学艺回归：
 * - 修复前：未加入武馆时 `skills/cha 教头` 被 do_skill 的 wuguan 门槛拒绝，
 *   Web 学艺面板（docCmd skills 教头）拿不到技能列表 → 显示
 *   「对方与你没有师徒之谊，也未主动传授功夫」，玩家无法学艺。
 * - 修复后：技能查看不再要求加入；学艺面板列出太乙功夫；交学费后可学。
 */
test("太乙武馆学艺：学艺面板可见太乙技能，交学费后学习成功", async ({ page }) => {
  test.setTimeout(180_000);
  await loginAsE2eAccount(page);
  await sendCmd(page, "webassist stop", 800).catch(() => {});
  // 钱庄取 20 两白银（prep 只给存款），再去武馆
  await prepTo(page, "qianzhuang", /钱庄/);
  await sendCmd(page, "withdraw 20 silver");
  await prepTo(page, "wuguan", /武馆大门/);
  await cmdToRoomSouth(page);

  // 1) 未加入武馆也能在学艺面板看到太乙功夫（修复点）
  await page.locator(".chip.npc").filter({ hasText: "教头" }).first().click();
  await expect(page.locator(".sheet")).toBeVisible({ timeout: 10_000 });
  await page.getByRole("button", { name: "学艺" }).click();
  // 技能中文名：太乙掌法/太乙剑法/太乙神功/太乙神游
  await expect(
    page.locator(".help-topic").filter({ hasText: /太乙掌法|太乙剑法/ }).first()
  ).toBeVisible({ timeout: 15_000 });
  await page.locator(".doc-back").first().click().catch(() => {});
  await page.locator(".sheet-top .close").first().click().catch(() => {});
  await page.waitForTimeout(400);

  // 2) 交学费后学习成功
  await cmdExpectLog(page, "give 20 silver to jiaotou", /同意指点|指点你/, 12_000);
  await cmdExpectLog(page, "learn jiaotou taiyi-zhang 1", /心得|进步/, 12_000);
  await waitForLogText(page, /太乙掌法/, 5_000);
});

/** south 进入武馆大厅并确认教头在。 */
async function cmdToRoomSouth(page: import("@playwright/test").Page) {
  await sendCmd(page, "south");
  await expect(page.locator(".room-title").first()).toHaveText(/武馆大厅/, {
    timeout: 15_000,
  });
}
