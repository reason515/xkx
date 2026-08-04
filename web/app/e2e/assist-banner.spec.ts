import { expect, test } from "@playwright/test";
import { loginAsNewbie, loginAsE2eAccount } from "./helpers";

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

/** 挂机提示统一走场景区绿色挂机条（GrindBanner），不弹 toast */
test("挂机提示只走挂机条，不弹 toast", async ({ page }) => {
  test.setTimeout(180_000);

  // 固定测试账号（已在扬州中央广场，钓鱼挂机可用）
  await loginAsNewbie(page, {
    id: "assistqb",
    password: "Test1234",
    asRegister: false,
  });
  await expect(page.locator(".room-title").first()).not.toHaveText("…", {
    timeout: 60_000,
  });
  await page.waitForTimeout(3000);

  // 打开江湖助手 → 开始钓鱼挂机
  await page.getByRole("button", { name: "菜单" }).click();
  await page.waitForTimeout(400);
  await page.getByRole("menuitem", { name: "江湖助手" }).click();
  await expect(page.locator(".sheet h3")).toHaveText("江湖助手");
  const fishCard = page
    .locator(".assist-task-card")
    .filter({ hasText: "钓鱼挂机" });
  await expect(fishCard).toBeVisible();
  await fishCard.getByRole("button", { name: "开始钓鱼" }).click();

  // 浮层关闭 → 挂机条出现，且显示挂机状态
  await expect(page.locator(".sheet")).toBeHidden({ timeout: 5_000 });
  await expect(page.locator(".grind-banner")).toBeVisible({ timeout: 10_000 });
  await expect(page.locator(".grind-banner-text")).toContainText(
    "钓鱼挂机",
    { timeout: 10_000 }
  );
  // 状态推进（前往水塘 → 开始垂钓），全程不弹 toast
  await expect(page.locator(".grind-banner-text")).toContainText("水塘", {
    timeout: 20_000,
  });
  await expect(page.locator(".toast.show")).toHaveCount(0);
  await expect(page.locator(".grind-banner-text")).toContainText("垂钓", {
    timeout: 40_000,
  });
  await expect(page.locator(".toast.show")).toHaveCount(0);
});

test("请教挂机状态走挂机条并可停止，不弹 toast", async ({ page }) => {
  test.setTimeout(180_000);
  await loginAsE2eAccount(page, { index: 3 });
  // 残留挂机会话先停掉（幂等），保证初始状态干净
  await sendCmd(page, "webassist stop", 1_500).catch(() => {});
  // 跳到尚武堂任务 20（武师在旁）→ 学艺前置（潜能/精气）→ 放弃基本内功制造可学状态
  await sendCmd(page, "newbietest skip 20", 4_000);
  await sendCmd(page, "xkxe2e learnprep", 3_500);
  await sendCmd(page, "abandon force", 2_500);

  // 直接以 webassist 启动请教挂机（学习 25 次，会经历精不足→调息）
  await sendCmd(page, "webassist learn wushi force count 25 1", 2_500);

  // 挂机条出现且显示「请教挂机」状态（不再依赖 toast）
  await expect(page.locator(".grind-banner")).toBeVisible({ timeout: 15_000 });
  await expect(page.locator(".grind-banner-text")).toContainText("请教挂机", {
    timeout: 15_000,
  });
  // 状态推进（已学 N 次 / 精不足调息），全程不弹 toast
  await expect(page.locator(".grind-banner-text")).toContainText(/已学|调息|精不足/, {
    timeout: 30_000,
  });
  await expect(page.locator(".toast.show")).toHaveCount(0);

  // 挂机条上的「停止」按钮可结束请教挂机
  await page.locator(".grind-banner-stop").click();
  await expect(page.locator(".grind-banner")).toBeHidden({ timeout: 10_000 });
  // 停止后不再有学习反馈 toast（会话已结束）
  await expect(page.locator(".toast.show")).toHaveCount(0);
});
