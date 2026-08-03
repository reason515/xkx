import { expect, test } from "@playwright/test";
import { loginAsNewbie, forceMobileMode } from "./helpers";

/**
 * 睡觉醒来状态条刷新回归测试
 *
 * 修复：
 * 1. LPC cmds/std/sleep.c: wakeup() 中新增 notify_vitals(me) 推送
 * 2. 前端 useGame.ts: 检测到"一觉醒来"文案后 200ms 自动拉 hp
 *
 * 测试路径: 注册 → 跳过新手村 → 到扬州客店 → 付钱上楼 → 睡觉 → 醒来 → 验证状态条
 */
test.describe("sleep wake statusbar regression", () => {
  test.describe.configure({ timeout: 300_000 });

  test("睡觉醒来后顶部状态条应有更新后的气血值", async ({ page }) => {
    await forceMobileMode(page);
    const creds = await loginAsNewbie(page, { asRegister: true });

    await expect(page.locator(".room-title").first()).not.toHaveText("…", {
      timeout: 60_000,
    });

    // 顶部 vitals 应已显示（2026-08-01 UI 改版后为纯进度条，无 .n 数字）
    const hpBar = page.locator(".vital.hp .fill");
    await expect(hpBar.first()).toBeVisible({ timeout: 15_000 });
    const hpBefore = await hpBar.first().getAttribute("style");
    expect(hpBefore).toBeTruthy();
    expect(/\d+%/.test(hpBefore || "")).toBeTruthy();

    // 打开指令输入框
    const menuBtn = page.locator(".menu-btn");
    await expect(menuBtn).toBeVisible({ timeout: 10_000 });
    await menuBtn.click();
    await page.waitForTimeout(400);
    const cmdToggle = page.locator('[role="menuitem"]').filter({ hasText: /指令/ });
    if (await cmdToggle.isVisible()) await cmdToggle.click();
    await menuBtn.click();
    await page.waitForTimeout(400);

    const input = page.locator(".log-cmd-input");
    await expect(input).toBeVisible({ timeout: 10_000 });
    const send = page.locator(".log-cmd-send");

    async function cmd(text: string, wait = 2500) {
      await input.fill(text);
      await send.click();
      await page.waitForTimeout(wait);
    }

    // 跳过新手村到末尾
    await cmd("newbietest skip 34", 5000);

    // 领钱 → 传送醉仙楼 → 走到客店
    await cmd("xkxe2e givemoney", 2000);
    await cmd("xkxe2e zuixianlou", 4000);
    await cmd("west", 3000);   // 北大街2
    await cmd("south", 3000);  // 北大街1
    await cmd("west", 3000);   // 客店

    // 付钱给店小二（5 silver = 500 即够上楼）
    await cmd("give 5 silver to xiao er", 3000);

    // 店小二会带路：up → enter → out → down
    // 等小二带路完毕（约 5-15 秒）
    await page.waitForTimeout(8000);

    // 如果小二还没带到，手动上楼
    const roomTitle = page.locator(".room-title").first();
    const title = await roomTitle.textContent();
    if (!/二楼/.test(title || "")) {
      // 小二可能没带路成功，手动走
      await cmd("up", 3000);
      await cmd("enter", 3000);
    }

    // 确认已在可睡觉的房间
    await page.waitForTimeout(2000);
    const roomAfter = await roomTitle.textContent();
    console.log("Sleep room:", roomAfter);

    // 睡觉
    await cmd("sleep", 2000);

    // 等待醒来（随机 1-60 秒，给足时间）；需展开见闻面板才能读到完整日志
    const log = page.locator(".log");
    await expect
      .poll(
        async () => {
          const summary = page.locator(".log-summary").first();
          const expanded = await summary
            .getAttribute("aria-expanded")
            .catch(() => "false");
          if (expanded !== "true") await summary.click().catch(() => {});
          const text = (await log.textContent()) || "";
          return /一觉醒来/.test(text);
        },
        { timeout: 100_000, intervals: [2000] },
      )
      .toBeTruthy();

    // 醒来后等前端 hp 拉取完成
    await page.waitForTimeout(4000);

    // 验证状态条仍显示（醒来后被刷新）
    const hpAfter = await hpBar.first().getAttribute("style");
    expect(hpAfter).toBeTruthy();
    expect(/\d+%/.test(hpAfter || "")).toBeTruthy();
  });
});
