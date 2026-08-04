import { test, expect } from "@playwright/test";
import { loginAsE2eAccount } from "./helpers";

/**
 * 回归：游戏过程中断线不应闪现登录页 —— 自动重连并恢复原角色。
 *
 * 背景：旧版网关丢一帧 pong 即 terminate（日志「client ping timeout」），
 * 前端收到 ws 断开后立刻切到登录页，玩家频繁被踢下线。
 * 修复：网关容忍连续 3 次丢包；前端断线后保持游戏界面自动重登
 * （MUD 侧角色断线保留 15 分钟，logind.c 对 netdead 角色静默恢复）。
 */
test("断线后自动重连恢复游戏，不跳登录页", async ({ page }) => {
  test.setTimeout(180_000);
  await loginAsE2eAccount(page);

  // 确认已进入游戏，记下当前房间标题
  const title = page.locator(".room-title").first();
  await expect(title).not.toHaveText("…", { timeout: 30_000 });
  await expect
    .poll(async () => (await title.textContent())?.trim(), { timeout: 30_000 })
    .not.toBe("");

  // 模拟网络抖动：关闭底层 WebSocket（等价于网关心跳误杀/链路闪断）
  await page.evaluate(() => {
    const w = window as unknown as { __xkxWsClose?: () => void };
    w.__xkxWsClose?.();
  });

  // 出现自动重连浮层，且始终不出现登录表单
  const overlay = page.getByTestId("reconnect-overlay");
  await expect(overlay).toBeVisible({ timeout: 15_000 });
  await expect(page.locator(".login-form")).toHaveCount(0);

  // 自动重连成功后浮层消失、回到游戏场景
  await expect(overlay).toBeHidden({ timeout: 90_000 });
  await expect(title).not.toHaveText("…", { timeout: 30_000 });

  // 登录页从未出现
  await expect(page.locator(".login-form")).toHaveCount(0);

  // 重连后的会话可用：发指令有响应（顶栏气血刷新）
  const hp = page.locator(".vitals").first();
  const before = (await hp.textContent()) || "";
  await page.evaluate(() => {
    const w = window as unknown as { __xkxCmd?: (c: string) => void };
    w.__xkxCmd?.("score");
  });
  await expect
    .poll(async () => (await hp.textContent()) || "", { timeout: 20_000 })
    .not.toBe(before);
});
