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

/**
 * 回归：武馆大厅（教头同房）内打开武功面板，应显示玩家自己的技能等级，
 * 而不是教头全 100 级的技能列表。
 * - 修复前：jiaotou.c do_skill 劫持裸 `skills`（Web 武功面板刷新指令），
 *   返回教头技能列表 → parseSkills 将其当作玩家武功 → 面板显示
 *   「学太乙神功后一堆功夫变成 100 级」的假象。
 * - 修复后：裸 skills/cha 交回标准命令；仅 skills/cha jiaotou 展示教头技能。
 */
test("武馆大厅内武功面板显示自己的技能而非教头的 100 级列表（回归）", async ({
  page,
}) => {
  test.setTimeout(180_000);
  await loginAsE2eAccount(page);
  await sendCmd(page, "webassist stop", 800).catch(() => {});
  await prepTo(page, "wuguan", /武馆大门/);
  await cmdToRoomSouth(page); // 教头同房

  // 打开角色面板 → 武功（Web 会发裸 skills 刷新）
  await page.locator(".hero-avatar").click();
  await page.waitForTimeout(1200);
  await page
    .locator(".tabs button")
    .filter({ hasText: "武功" })
    .first()
    .click();
  await page.waitForTimeout(2500);
  const panel = page.locator(".panel.on");

  // 自己的技能等级（prep 授予 force/strike/dodge/parry/unarmed 20、literate 10）
  await expect(panel).toContainText("基本内功");
  // 技能列表行（.skill-row）精确显示玩家自己的等级，排除激发槽位区残留 map 干扰
  const forceRow = panel.locator(".skill-row").filter({ hasText: "基本内功" });
  // .num 含 Lv{level}：Lv20（prep 授予），劫持时教头列表为 Lv100
  await expect(forceRow.locator(".num")).toContainText("Lv20", {
    timeout: 10_000,
  });
  // 所有技能行都不得出现教头的特殊武功（劫持信号）
  for (const special of ["太乙神功", "太乙神游", "太乙剑法", "太乙掌法"]) {
    await expect(
      panel.locator(".skill-row").filter({ hasText: special })
    ).toHaveCount(0);
  }
  await page.locator(".sheet-top .close").first().click().catch(() => {});

  // 学艺面板（skills jiaotou）仍展示教头技能列表，学习链路不受影响
  await page
    .locator(".chip.npc")
    .filter({ hasText: "教头" })
    .first()
    .click();
  await expect(page.locator(".sheet")).toBeVisible({ timeout: 10_000 });
  await page.getByRole("button", { name: "学艺" }).click();
  await expect(
    page
      .locator(".help-topic")
      .filter({ hasText: /太乙掌法|太乙剑法/ })
      .first()
  ).toBeVisible({ timeout: 15_000 });
  await page.locator(".sheet-top .close").first().click().catch(() => {});
});
