import { test, expect } from "@playwright/test";

test("desktop full flow", async ({ page }) => {
  test.setTimeout(180_000);

  // 不设 viewport，默认 1280x720 → 桌面模式，能登录
  page.on("websocket", ws => {});
  await page.goto("/");

  // 注册
  await page.getByRole("tab", { name: "注册" }).click();
  await page.getByLabel("账号（英文 ID）").fill("pltFNL");
  await page.getByLabel("密码", { exact: true }).fill("PlTest99x");
  await page.getByLabel("中文名字").fill("测FNL");
  await page.getByRole("button", { name: "注册并进入" }).click();

  // 等进入游戏
  await expect(page.locator('[data-testid="desktop-app"]')).toBeVisible({ timeout: 90_000 });
  const title = page.locator('[data-testid="desktop-room-title"]');
  await expect(title).toHaveText(/未明谷/, { timeout: 30_000 });
  console.log("1. 出生点:", await title.textContent());

  // 检查出口按钮存在
  const exits = page.locator(".desktop-left .exit-pad .cell.open");
  await expect(exits.first()).toBeVisible({ timeout: 10_000 });
  console.log("2. 出口:", await exits.count());

  // 移动
  await exits.first().click();
  await page.waitForTimeout(3000);
  const title2 = page.locator('[data-testid="desktop-room-title"]');
  await expect(title2).not.toHaveText("未明谷", { timeout: 15_000 });
  console.log("3. 移动后房间:", await title2.textContent());

  // 帮助
  await page.getByRole("button", { name: "帮助" }).click();
  await expect(page.locator(".help-section")).toBeVisible({ timeout: 10_000 });
  const hasRecommend = page.getByText("你现在需要知道");
  await expect(hasRecommend).toBeVisible();
  console.log("4. 帮助中心有推荐");
});
