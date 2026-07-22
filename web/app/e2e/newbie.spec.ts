import { test, expect } from "@playwright/test";

// 所有测试共用同一个已有账号（跳过注册流程，避免 Gateway 注册 bug）
const E2E_ID = "abcxyz";
const E2E_PASS = "Test1234x";

test.describe.serial("newbie village", () => {
  test.describe.configure({ timeout: 120_000 });

  test("出生点在未明谷", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/");
    await page.getByRole("tab", { name: "登录" }).click();
    await page.getByLabel("账号（英文 ID）").fill(E2E_ID);
    await page.getByLabel("密码", { exact: true }).fill(E2E_PASS);
    await page.getByRole("button", { name: "进入游戏" }).click();
    await page.locator(".scene-panel").first().waitFor({ state: "visible", timeout: 30_000 });
    await expect(page.locator(".room-title")).toHaveText(/未明谷/, { timeout: 30_000 });
  });

  test("出生点有出口和 NPC", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/");
    await page.getByRole("tab", { name: "登录" }).click();
    await page.getByLabel("账号（英文 ID）").fill(E2E_ID);
    await page.getByLabel("密码", { exact: true }).fill(E2E_PASS);
    await page.getByRole("button", { name: "进入游戏" }).click();
    await page.locator(".scene-panel").first().waitFor({ state: "visible", timeout: 30_000 });
    await expect(page.locator(".exit-pad .cell.open").first()).toBeVisible({ timeout: 15_000 });
    await expect(page.locator(".chip.npc").first()).toBeVisible({ timeout: 15_000 });
  });

  test("新手任务面板显示当前目标", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/");
    await page.getByRole("tab", { name: "登录" }).click();
    await page.getByLabel("账号（英文 ID）").fill(E2E_ID);
    await page.getByLabel("密码", { exact: true }).fill(E2E_PASS);
    await page.getByRole("button", { name: "进入游戏" }).click();
    await page.locator(".scene-panel").first().waitFor({ state: "visible", timeout: 30_000 });
    await expect(page.locator(".newbie-quest-panel")).toBeVisible({ timeout: 15_000 });
    await expect(page.locator(".quest-target")).toBeVisible();
  });
});
