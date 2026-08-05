import { test, expect } from "@playwright/test";
import {
  loginAsE2eAccount,
  sendCmd,
  prepTo,
  cmdToRoom,
  cmdExpectLog,
  waitForRoomText,
} from "./helpers";

test("书院夫子免费学读书写字（新手 literate 可学）", async ({ page }) => {
  test.setTimeout(120_000);
  await loginAsE2eAccount(page);
  await prepTo(page, "qianzhuang", /钱庄/);
  await cmdToRoom(page, "south", /东大街/); // 东大街3
  await cmdToRoom(page, "west", /东大街/); // 东大街2
  await cmdToRoom(page, "west", /东大街/); // 东大街1
  await cmdToRoom(page, "north", /书院/);
  await expect(
    page.locator(".chip.npc").filter({ hasText: "夫子" }).first()
  ).toBeVisible({ timeout: 10_000 });

  // 直接学：learn fuzi literate（新手 literate=10，无 mark/朱，但夫子免费放行；双词 id 用单 token）
  await cmdExpectLog(page, "learn fuzi literate 3", /心得|指导/, 12_000);
});

test("朱熹技能面板可见（前端学艺入口）", async ({ page }) => {
  test.setTimeout(120_000);
  await loginAsE2eAccount(page);
  await prepTo(page, "qianzhuang", /钱庄/);
  await cmdToRoom(page, "south", /东大街/);
  await cmdToRoom(page, "west", /东大街/);
  await cmdToRoom(page, "west", /东大街/);
  await cmdToRoom(page, "north", /书院/);
  // 点朱熹 chip → EntitySheet → 学艺 → skills 面板（doc 捕获）
  await page.locator(".chip.npc").filter({ hasText: "朱熹" }).first().click();
  await expect(page.locator(".sheet")).toBeVisible({ timeout: 10_000 });
  await page.getByRole("button", { name: "学艺" }).click();
  await expect(page.locator(".help-topic.skill-item").first()).toBeVisible({
    timeout: 12_000,
  });
  await expect(page.locator(".help-topic.skill-item").first()).toContainText(
    /读书识字|literate/,
    { timeout: 5_000 }
  );
});

test("东大街1 可进入太乙武馆并见教头", async ({ page }) => {
  test.setTimeout(120_000);
  await loginAsE2eAccount(page);
  await prepTo(page, "qianzhuang", /钱庄/);
  await cmdToRoom(page, "south", /东大街/);
  await cmdToRoom(page, "west", /东大街/);
  await cmdToRoom(page, "west", /东大街/); // 东大街1
  // 场景出口面板应有西北方向（武馆入口；目标名依赖 exitNames 缓存，不校验文字）
  await expect(
    page.locator(".exit-pad .cell").filter({ hasText: "西北" }).first()
  ).toBeVisible({ timeout: 10_000 });
  // 进武馆
  await cmdToRoom(page, "northwest", /武馆/);
  // 大厅见教头
  await cmdToRoom(page, "south", /武馆大厅/);
  await expect(
    page.locator(".chip.npc").filter({ hasText: "教头" }).first()
  ).toBeVisible({ timeout: 10_000 });
  await waitForRoomText(page, /武馆大厅/);
});
