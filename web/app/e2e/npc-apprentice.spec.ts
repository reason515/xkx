import { expect, test } from "@playwright/test";
import { loginAsE2eAccount, sendCmd, waitForRoomText } from "./helpers";

/**
 * 回归：新手村尚武堂「武师」点击后必须出现「拜师」按钮。
 *
 * 背景（2026-08-06 用户反馈「点击NPC没有拜师选项，无法拜师」）：
 * - 尚武堂等房间会残留断线玩家的尸体（netdead body），webd room.update 的
 *   npcs 列表把它们当 NPC 展示；尸体是 user（canApprentice=0），点击后面板
 *   没有「拜师」按钮。
 * - 新手任务条提示「点击武师选择『拜师』」，玩家容易点到 武师测/测甲 等
 *   尸体 chip，误以为拜师选项消失。
 * - 修复：webd.c send_room 收集 npcs 时跳过 userp && !interactive 的断线尸体。
 * 本用例断言：点击真正的「武师」chip 后，EntitySheet 出现「拜师」按钮。
 */
test("尚武堂武师 NPC 显示拜师按钮（拜师回归）", async ({ page }) => {
  test.setTimeout(180_000);
  await loginAsE2eAccount(page);
  await sendCmd(page, "webassist stop", 800).catch(() => {});
  await sendCmd(page, "newbietest skip 20", 800);
  await waitForRoomText(page, /尚武堂/, 20_000);

  // 精确匹配「武师」（非 武师测/测甲 等残留/同名角色 chip）
  const chips = page.locator(".chip.npc");
  await expect(chips.filter({ hasText: /^武师$/ }).first()).toBeVisible({
    timeout: 10_000,
  });
  await chips.filter({ hasText: /^武师$/ }).first().click();
  await expect(page.locator(".sheet")).toBeVisible({ timeout: 10_000 });
  await expect(
    page.getByRole("button", { name: "拜师" })
  ).toBeVisible({ timeout: 10_000 });
});
