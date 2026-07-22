import { test, expect } from "@playwright/test";

const ACCOUNT_ID = "abcxyz";
const ACCOUNT_PASS = "Test1234x";

async function loginExisting(page: import("@playwright/test").Page) {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  await page.getByRole("tab", { name: "登录" }).click();
  await page.getByLabel("账号（英文 ID）").fill(ACCOUNT_ID);
  await page.getByLabel("密码", { exact: true }).fill(ACCOUNT_PASS);
  await page.getByRole("button", { name: "进入游戏" }).click();
  await page.locator(".scene-panel").first().waitFor({ state: "visible", timeout: 30_000 });
}

test.describe.serial("newbie steps", () => {
  test.describe.configure({ timeout: 120_000 });

  test("出生在未明谷，有出口和任务面板", async ({ page }) => {
    test.setTimeout(60_000);
    await loginExisting(page);
    await expect(page.locator(".room-title")).toHaveText(/未明谷/, { timeout: 15_000 });
    await expect(page.locator(".newbie-quest-panel")).toBeVisible({ timeout: 10_000 });
    await expect(page.locator(".exit-pad .cell.open").first()).toBeVisible({ timeout: 10_000 });
  });

  test("可点击出口移动", async ({ page }) => {
    test.setTimeout(60_000);
    await loginExisting(page);
    const firstExit = page.locator(".exit-pad .cell.open").first();
    await expect(firstExit).toBeVisible({ timeout: 10_000 });
    await firstExit.click();
    await page.waitForTimeout(3000);
    const newTitle = await page.locator(".room-title").textContent();
    expect(newTitle).toBeTruthy();
    expect(newTitle).not.toMatch(/^…$/);
  });

  test("NPC 交互面板可打开", async ({ page }) => {
    test.setTimeout(60_000);
    await loginExisting(page);
    await page.waitForTimeout(2000);
    const npcs = page.locator(".chip.npc");
    if (await npcs.count() > 0) {
      await npcs.first().click();
      await expect(page.locator(".overlay")).toBeVisible({ timeout: 10_000 });
      await expect(page.getByRole("button", { name: "打听" }).first()).toBeVisible({ timeout: 5_000 });
    }
  });
});
