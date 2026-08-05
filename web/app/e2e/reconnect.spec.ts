import { test, expect } from "@playwright/test";
import { loginAsE2eAccount } from "./helpers";

/**
 * 回归：游戏过程中断线不应闪现登录页 —— 自动重连并恢复原角色。
 *
 * 背景：旧版网关丢一帧 pong 即 terminate（日志「client ping timeout」），
 * 前端收到 ws 断开后立刻切到登录页且无自动重连，玩家频繁被踢下线。
 * 修复：网关容忍连续 3 次丢包；前端断线后保持游戏界面自动重登
 * （MUD 侧角色断线保留 15 分钟，logind.c 对 netdead 角色静默恢复）。
 *
 * 钉死断言：
 * 1. 断线后出现第二个 WebSocket 连接（自动重连确实发生）；
 * 2. 整个过程中登录表单从未出现（旧版会立刻闪现登录页）；
 * 3. 重连后回到游戏场景，见闻出现「重新连线完毕」（MUD 恢复角色）。
 */
test("断线后自动重连恢复游戏，不跳登录页", async ({ page }) => {
  test.setTimeout(180_000);

  // 记录页面上的 WebSocket 连接数（须在导航前注册）
  let wsCount = 0;
  page.on("websocket", () => {
    wsCount += 1;
  });

  await loginAsE2eAccount(page);

  // 确认已进入游戏
  const title = page.locator(".room-title").first();
  await expect(title).not.toHaveText("…", { timeout: 30_000 });
  expect(wsCount).toBeGreaterThanOrEqual(1);

  // 模拟网络抖动：关闭底层 WebSocket（等价于网关心跳误杀/链路闪断）
  await page.evaluate(() => {
    const w = window as unknown as { __xkxWsClose?: () => void };
    w.__xkxWsClose?.();
  });

  // 修复后：游戏界面保持，登录表单不得出现（旧版这里会立刻闪现登录页）
  await expect
    .poll(async () => page.locator(".login-form").count(), { timeout: 90_000 })
    .toBe(0);

  // 自动重连：出现第二个 WebSocket 连接（旧版无自动重连，恒为 1）
  await expect
    .poll(() => wsCount, { timeout: 90_000 })
    .toBeGreaterThanOrEqual(2);

  // 重连成功：回到游戏场景
  await expect(title).not.toHaveText("…", { timeout: 30_000 });

  // MUD 侧 netdead 角色被静默恢复（logind.c reconnect → 「重新连线完毕」）
  await expect(page.getByTestId("event-log")).toContainText("重新连线完毕", {
    timeout: 30_000,
  });

  // 收尾：登录页始终未出现
  await expect(page.locator(".login-form")).toHaveCount(0);
});
