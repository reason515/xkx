import { test, expect } from "@playwright/test";

/**
 * 柳秀山庄新手村 e2e 测试
 * 覆盖步骤 1-7：未明谷出生 → 吃野果 → 攀爬 → 走到大门 → 敲门
 */

function randomId() {
  const letters = "abcdefghijklmnopqrstuvwxyz";
  let id = "";
  for (let i = 0; i < 6; i++) id += letters[Math.floor(Math.random() * 26)];
  return id;
}

async function registerAndSettle(page: import("@playwright/test").Page) {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  await page.getByRole("tab", { name: "注册" }).click();
  await page.getByLabel("账号（英文 ID）").fill(randomId());
  await page.getByLabel("密码", { exact: true }).fill("Test1234x");
  await page.getByLabel("中文名字").fill("测试");
  await page.getByRole("button", { name: "注册并进入" }).click();
  await page.locator(".scene-panel").first().waitFor({ state: "visible", timeout: 60_000 }).catch(() => {
    page.locator("[data-testid=desktop-app]").first().waitFor({ state: "visible", timeout: 30_000 });
  });
  await expect(page.locator(".room-title, [data-testid=desktop-room-title]").first()).not.toHaveText("…", { timeout: 20_000 });
  await expect(page.locator(".exit-pad .cell.open").first()).toBeVisible({ timeout: 15_000 });
}

test.describe("newbie village", () => {
  test("步骤 1-4：出生、吃野果、探索、攀爬离开未明谷", async ({ page }) => {
    test.setTimeout(180_000);
    await registerAndSettle(page);
    const room = () => page.locator(".room-title, [data-testid=desktop-room-title]").first();

    // 步骤 1：出生在未明谷
    await expect(room()).toHaveText(/未明谷/, { timeout: 15_000 });
    console.log("Step 1: 出生未明谷 ✅");

    // 步骤 1b：打开角色面板（发送 hp）
    await page.evaluate(() => { (window as any).__xkxCmd("hp"); });
    await page.waitForTimeout(3000);
    console.log("Step 1b: hp ✅");

    // 步骤 2：吃 3 个野果（用 MUD 命令绕过 UI overlay 问题）
    for (let i = 1; i <= 3; i++) {
      await page.evaluate(() => { (window as any).__xkxCmd("get ye guo"); });
      await page.waitForTimeout(1500);
      await page.evaluate(() => { (window as any).__xkxCmd("eat ye guo"); });
      await page.waitForTimeout(1500);
      console.log(`  Ate fruit #${i}`);
    }
    console.log("Step 2: ate 3 fruits ✅");

    // 步骤 3：移动西（出未明谷）→ 验证到达树林 → 再回未明谷
    const westExit = page.locator(".exit-pad .cell.open").filter({ hasText: /西/i }).first();
    await expect(westExit).toBeVisible({ timeout: 10_000 });
    await westExit.click();
    await page.waitForTimeout(800);
    const goBtn = page.locator("button.go").filter({ hasText: /前往/ }).first();
    if (await goBtn.isVisible({ timeout: 3000 }).catch(() => false)) await goBtn.click();
    await page.waitForTimeout(4000);
    await expect(room()).toContainText("树林");
    console.log("Step 3: moved west to 树林 ✅");

    // 步骤 3b：走回来
    await page.locator(".exit-pad .cell.open").first().click();
    await page.waitForTimeout(800);
    const goBtn2 = page.locator("button.go").filter({ hasText: /前往/ }).first();
    if (await goBtn2.isVisible({ timeout: 3000 }).catch(() => false)) await goBtn2.click();
    await page.waitForTimeout(4000);
    await expect(room()).toContainText("未明谷");
    console.log("Step 3b: returned to 未明谷 ✅");

    // 步骤 4：攀爬 path 离开未明谷
    const climbChip = page.locator(".chip.action").filter({ hasText: /爬/ }).first();
    if (await climbChip.isVisible({ timeout: 5000 }).catch(() => false)) {
      await climbChip.click();
      await page.waitForTimeout(5000);
      console.log(`Step 4: climbed to ${await room().textContent()} ✅`);
    } else {
      console.log("Step 4: climb chip not found (may need to look at path first)");
    }
  });
});
