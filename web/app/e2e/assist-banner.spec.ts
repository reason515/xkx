import { expect, test } from "@playwright/test";
import { loginAsNewbie } from "./helpers";

/** 挂机提示统一走场景区绿色挂机条（GrindBanner），不弹 toast */
test("挂机提示只走挂机条，不弹 toast", async ({ page }) => {
  test.setTimeout(180_000);

  // 固定测试账号（已在扬州中央广场，钓鱼挂机可用）
  await loginAsNewbie(page, {
    id: "assistqa",
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
