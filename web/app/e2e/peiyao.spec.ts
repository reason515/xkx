import { expect, test } from "@playwright/test";
import { loginAsE2eAccount, E2E_ACCOUNTS } from "./helpers";

/**
 * 扬州配药打工挂机（新手零战斗挣钱）
 * 使用 e2e 账号池（登录 + newbietest reset），避免每次注册新号触发限流。
 */
async function sendCmd(page: any, text: string, wait = 2500) {
  const input = page.locator(".log-cmd-input");
  if (!(await input.isVisible({ timeout: 800 }).catch(() => false))) {
    const menuBtn = page.getByRole("button", { name: "菜单" });
    if (await menuBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
      await menuBtn.click();
      await page.waitForTimeout(400);
    }
    const cmdItem = page
      .locator('[role="menuitem"]')
      .filter({ hasText: "指令" })
      .first();
    if (await cmdItem.isVisible({ timeout: 2000 }).catch(() => false)) {
      await cmdItem.click();
      await page.waitForTimeout(400);
    }
  }
  await input.fill(text);
  await page.locator(".log-cmd-send").click();
  await page.waitForTimeout(wait);
}

/** 展开见闻面板（折叠时 .log 不在 DOM，读不到内容）。 */
async function openLogPanel(page: any) {
  const summary = page.locator(".log-summary").first();
  const expanded = await summary
    .getAttribute("aria-expanded")
    .catch(() => "false");
  if (expanded !== "true") await summary.click().catch(() => {});
  await page.waitForTimeout(300);
}

/** 等见闻出现指定文本（条件等待，替代固定 sleep）。 */
async function waitForLog(page: any, pattern: RegExp, timeout = 20_000) {
  await expect
    .poll(async () => {
      await openLogPanel(page);
      const t = (await page.locator(".log").textContent().catch(() => "")) || "";
      return pattern.test(t);
    }, { timeout })
    .toBeTruthy();
}

/** 等页面任意位置（含挂机条/见闻）出现指定文本。 */
async function waitForBodyText(page: any, pattern: RegExp, timeout = 20_000) {
  await expect
    .poll(async () => {
      const t = (await page.locator("body").innerText().catch(() => "")) || "";
      return pattern.test(t);
    }, { timeout })
    .toBeTruthy();
}

async function walkToYaopu(page: any) {
  // 一键直达扬州药铺（毕业新手状态：经验 6000、基础技能 20、存款 5000）
  await sendCmd(page, "newbietest prep yaopu", 2_500);
  await expect(page.locator(".room-title").first()).toHaveText(/药铺/, {
    timeout: 15_000,
  });
}

test("配药打工挂机：领药方→配药→交药领赏闭环", async ({ page }) => {
  test.setTimeout(180_000);
  await loginAsE2eAccount(page);
  // prep yaopu：清状态 + 传送扬州药铺（毕业新手 6000 经验），一步到位
  await walkToYaopu(page);

  // 打开江湖助手 → 配药打工
  await page.getByRole("button", { name: "菜单" }).click();
  await page.waitForTimeout(400);
  await page.getByRole("menuitem", { name: "江湖助手" }).click();
  await expect(page.locator(".sheet h3")).toHaveText("江湖助手");
  const peiyaoCard = page.locator(".assist-task-card").filter({ hasText: "配药打工" });
  await expect(peiyaoCard).toBeVisible();
  await peiyaoCard.getByRole("button", { name: "开始配药" }).click();

  // 挂机条出现配药状态
  await expect(page.locator("body")).toContainText(/配药挂机|配药打工/, { timeout: 20_000 });

  // 等待完成至少一单：挂机条/见闻出现领赏、交药或奖励（条件等待）
  await waitForBodyText(
    page,
    /领赏|银子的奖励|经验.*奖励|接下一单|配药挂机 · 药已配好，回药铺/,
    120_000
  );
  // 展开见闻确认完成了一单（有交药奖励）
  await waitForLog(page, /领赏|银子的奖励|经验.*奖励/, 30_000);
});

test("配药任务：毕业新手（6000经验）可接单，超20000才拒绝", async ({ page }) => {
  test.setTimeout(150_000);
  await loginAsE2eAccount(page, { index: 1 });
  // prep yaopu：经验 6000（毕业 5000 + 少量增长），正好在配药门槛内
  await walkToYaopu(page);

  // 6000 经验：应能领到药方（收到"药方"字样，且不是拒绝文案）
  await sendCmd(page, "ask ping about 工作", 3_000);
  await waitForLog(page, /药方|太埋没您拉/, 15_000);
  const log1 = (await page.locator(".log").textContent().catch(() => "")) || "";
  expect(log1).toContain("药方");
  expect(log1).not.toContain("太埋没您拉");

  // 清掉药方后改超门槛经验：100000 应被拒绝
  await sendCmd(page, "drop yao fang", 2_000).catch(() => {});
  await sendCmd(page, "xkxe2e grantexp", 3_000);
  await sendCmd(page, "ask ping about 工作", 3_000);
  await waitForLog(page, /药方|太埋没您拉/, 15_000);
  const log2 = (await page.locator(".log").textContent().catch(() => "")) || "";
  expect(log2).toContain("太埋没您拉");
});

test("配药房夜晚不被困：店内可回药铺，临街入口仍关闭", async ({ page }) => {
  test.setTimeout(150_000);
  await loginAsE2eAccount(page, { index: 2 });
  await walkToYaopu(page);

  // 临时切到夜晚（e2e 辅助：45 秒后自动恢复真实时段）
  await sendCmd(page, "xkxe2e night", 1_500);

  // 1) 临街入口：东大街 → 药铺 夜晚仍被拦（"晚上不开"）——夜晚锁语义保留
  await sendCmd(page, "south", 2_500); // 药铺 → 东大街（出店不拦）
  await expect(page.locator(".room-title").first()).toHaveText(/东大街/, {
    timeout: 10_000,
  });
  await sendCmd(page, "north", 2_500); // 东大街 → 药铺（夜晚临街应拦）
  await expect(page.locator(".room-title").first()).toHaveText(/东大街/, {
    timeout: 10_000,
  });
  await waitForLog(page, /晚上不开/, 15_000);

  // 2) 店内通道：配药房 → 药铺 不再被锁（修复后不被困）
  await walkToYaopu(page); // prep 直达药铺（绕过临街锁）
  await sendCmd(page, "north", 2_500); // 药铺 → 配药房（配药房非 day_shop，可进）
  await expect(page.locator(".room-title").first()).toHaveText(/配药房/, {
    timeout: 10_000,
  });
  await sendCmd(page, "south", 3_000); // 配药房 → 药铺（修复后放行，不再困人）
  await expect(page.locator(".room-title").first()).toHaveText(/药铺/, {
    timeout: 10_000,
  });

  // 3) 收尾：提前恢复真实时段，缩短全局夜晚窗口
  await sendCmd(page, "xkxe2e restorephase", 1_500);
});
