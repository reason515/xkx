import { expect, test } from "@playwright/test";
import {
  loginAsE2eAccount,
  sendCmd,
  prepTo,
  cmdToRoom,
  cmdExpectLog,
  waitForBodyText,
  waitForLogText,
} from "./helpers";

/**
 * 扬州配药打工挂机（新手零战斗挣钱）
 * 账号池登录 + newbietest prep 直达；固定 sleep 全部换成条件等待。
 */
test("配药打工挂机：领药方→配药→交药领赏闭环", async ({ page }) => {
  test.setTimeout(180_000);
  await loginAsE2eAccount(page);
  // 若上一轮用例残留挂机（断线后 assist 会话可能仍存活），先停掉再 prep，
  // 否则残留挂机会自行走动（如走进配药房），破坏本用例的初始状态假设
  await sendCmd(page, "webassist stop", 800).catch(() => {});
  await prepTo(page, "yaopu", /药铺/);

  // 打开江湖助手 → 配药打工
  await page.getByRole("button", { name: "菜单" }).click();
  await page.waitForTimeout(300);
  await page.getByRole("menuitem", { name: "江湖助手" }).click();
  await expect(page.locator(".sheet h3")).toHaveText("江湖助手");
  const peiyaoCard = page
    .locator(".assist-task-card")
    .filter({ hasText: "配药打工" });
  await expect(peiyaoCard).toBeVisible();
  await peiyaoCard.getByRole("button", { name: "开始配药" }).click();

  // 挂机条出现配药状态
  await expect(page.locator("body")).toContainText(/配药挂机|配药打工/, {
    timeout: 20_000,
  });

  // 等待完成至少一单：挂机条/见闻出现领赏、交药或奖励（条件等待）
  await waitForBodyText(
    page,
    /领赏|银子的奖励|经验.*奖励|接下一单|配药挂机 · 药已配好，回药铺/,
    120_000
  );
  // 展开见闻确认完成了一单（有交药奖励）
  await waitForLogText(page, /领赏|银子的奖励|经验.*奖励/, 30_000);

  // 收尾：停止挂机，避免残留会话影响下一轮用例（同账号复用）
  await sendCmd(page, "webassist stop", 800).catch(() => {});
});

test("配药任务：毕业新手（6000经验）可接单，超20000才拒绝", async ({ page }) => {
  test.setTimeout(120_000);
  await loginAsE2eAccount(page);
  // 同账号复用：先停掉可能残留的挂机，防止其走动干扰 ask ping
  await sendCmd(page, "webassist stop", 800).catch(() => {});
  await prepTo(page, "yaopu", /药铺/);

  // 6000 经验：应能领到药方（收到"药方"字样，且不是拒绝文案）
  await cmdExpectLog(page, "ask ping about 工作", /药方|太埋没您拉/, 12_000);
  const log1 = (await page.locator(".log").textContent().catch(() => "")) || "";
  expect(log1).toContain("药方");
  expect(log1).not.toContain("太埋没您拉");

  // 清掉药方后改超门槛经验：100000 应被拒绝
  await sendCmd(page, "drop yao fang").catch(() => {});
  await sendCmd(page, "xkxe2e grantexp", 800);
  await cmdExpectLog(page, "ask ping about 工作", /药方|太埋没您拉/, 12_000);
  const log2 = (await page.locator(".log").textContent().catch(() => "")) || "";
  expect(log2).toContain("太埋没您拉");
});

test("配药房夜晚不被困：店内可回药铺，临街入口仍关闭", async ({ page }) => {
  test.setTimeout(120_000);
  await loginAsE2eAccount(page);
  // 同账号复用：先停掉可能残留的挂机，防止其走动干扰位置断言
  await sendCmd(page, "webassist stop", 800).catch(() => {});
  await prepTo(page, "yaopu", /药铺/);

  // 临时切到夜晚（e2e 辅助：45 秒后自动恢复真实时段）
  await sendCmd(page, "xkxe2e night", 800);

  // 1) 临街入口：东大街 → 药铺 夜晚仍被拦（"晚上不开"）——夜晚锁语义保留
  await cmdToRoom(page, "south", /东大街/); // 药铺 → 东大街（出店不拦）
  await cmdToRoom(page, "north", /东大街/); // 东大街 → 药铺（夜晚临街应拦）
  await waitForLogText(page, /晚上不开/, 12_000);

  // 2) 店内通道：配药房 → 药铺 不再被锁（修复后不被困）
  await prepTo(page, "yaopu", /药铺/); // prep 直达药铺（绕过临街锁）
  await cmdToRoom(page, "north", /配药房/); // 药铺 → 配药房（配药房非 day_shop，可进）
  await cmdToRoom(page, "south", /药铺/); // 配药房 → 药铺（修复后放行，不再困人）

  // 3) 收尾：提前恢复真实时段，缩短全局夜晚窗口
  await sendCmd(page, "xkxe2e restorephase", 800);
});
