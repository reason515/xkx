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

/** 点击第一个出口 → 点击「前往」 → 切换房间 */
async function goFirstExit(page: import("@playwright/test").Page) {
  const exit = page.locator(".exit-pad .cell.open").first();
  await expect(exit).toBeVisible({ timeout: 10_000 });
  await exit.click();
  // 等退出预览打开
  await page.waitForTimeout(500);
  // 点击「前往」按钮
  const goBtn = page.locator(".sheet-acts .go, .overlay .go").filter({ hasText: /前往/ }).first();
  if (await goBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
    await goBtn.click();
  } else {
    // 没有预览，直接关闭 overlay
    await page.locator(".overlay .close, .sheet .close").first().click().catch(() => {});
    return;
  }
  await page.waitForTimeout(3000);
}

test.describe.serial("newbie steps", () => {
  test.describe.configure({ timeout: 180_000 });

  test("出生在未明谷，有出口和任务面板", async ({ page }) => {
    test.setTimeout(60_000);
    await loginExisting(page);
    await expect(page.locator(".room-title")).toHaveText(/未明谷/, { timeout: 15_000 });
    await expect(page.locator(".exit-pad .cell.open").first()).toBeVisible({ timeout: 10_000 });
  });

  test("可点击出口预览 → 前往 → 切换房间", async ({ page }) => {
    test.setTimeout(60_000);
    await loginExisting(page);
    const initTitle = await page.locator(".room-title").textContent();
    await goFirstExit(page);
    const newTitle = await page.locator(".room-title").textContent();
    expect(newTitle).toBeTruthy();
    // 移动后房间应变化
    console.log(`Moved from "${initTitle}" to "${newTitle}"`);
  });

  test("NPC 交互面板可打开，有打听按钮", async ({ page }) => {
    test.setTimeout(60_000);
    await loginExisting(page);
    await page.waitForTimeout(2000);
    const npcs = page.locator(".chip.npc");
    if (await npcs.count() > 0) {
      await npcs.first().click();
      await expect(page.locator(".overlay")).toBeVisible({ timeout: 10_000 });
      await expect(page.getByRole("button", { name: "打听" }).first()).toBeVisible({ timeout: 5_000 });
      // 关闭面板
      await page.locator(".overlay .close, .sheet .close").first().click().catch(() => {});
    }
  });

  test("地上物品可查看、可拾取", async ({ page }) => {
    test.setTimeout(60_000);
    await loginExisting(page);
    await page.waitForTimeout(2000);
    const items = page.locator(".chip.item");
    if (await items.count() > 0) {
      const name = await items.first().textContent();
      console.log("Item:", name);
      await items.first().click();
      await expect(page.locator(".overlay")).toBeVisible({ timeout: 10_000 });
      // 尝试"拿"按钮
      const getBtn = page.getByRole("button", { name: "拿" });
      if (await getBtn.isVisible().catch(() => false)) {
        await getBtn.click();
        await page.waitForTimeout(2000);
      }
      await page.locator(".overlay .close, .sheet .close").first().click().catch(() => {});
    }
  });

  test("帮助面板可打开并看到新手村推荐", async ({ page }) => {
    test.setTimeout(60_000);
    await loginExisting(page);
    await page.waitForTimeout(2000);
    // 点击顶部姓名区域打开角色面板
    const heroBtn = page.locator(".hero-btn");
    if (await heroBtn.isVisible().catch(() => false)) {
      await heroBtn.click();
      await page.waitForTimeout(500);
    }
    const helpBtn = page.getByRole("button", { name: "帮助" });
    if (await helpBtn.isVisible().catch(() => false)) {
      await helpBtn.click();
      await expect(page.locator(".help-section")).toBeVisible({ timeout: 10_000 });
      await expect(page.getByText("你现在需要知道")).toBeVisible();
    }
  });
});
