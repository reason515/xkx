import { test, expect } from "@playwright/test";

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

/** 点击指定方向的出口→前往→返回新房间名 */
async function goDir(page: import("@playwright/test").Page, dirReg: RegExp): Promise<string> {
  const exit = page.locator(".exit-pad .cell.open").filter({ hasText: dirReg }).first();
  await expect(exit).toBeVisible({ timeout: 10_000 });
  await exit.click();
  await page.waitForTimeout(800);
  const go = page.locator("button.go").filter({ hasText: /前往/ }).first();
  if (await go.isVisible({ timeout: 3000 }).catch(() => false)) await go.click();
  await page.waitForTimeout(4000);
  return (await page.locator(".room-title, [data-testid=desktop-room-title]").first().textContent()) || "";
}

test.describe("newbie village steps 1-7", () => {
  test("完整走通：未明谷 → 山庄大门", async ({ page }) => {
    test.setTimeout(300_000);
    await registerAndSettle(page);
    const room = () => page.locator(".room-title, [data-testid=desktop-room-title]").first();

    // 步1: 出生验证
    await expect(room()).toHaveText(/未明谷/, { timeout: 15_000 });
    await page.evaluate(() => (window as any).__xkxCmd("hp"));
    await page.waitForTimeout(3000);
    console.log("Step 1-2: hp + eat");

    // 步2: 吃 3 个野果
    for (let i = 0; i < 3; i++) {
      await page.evaluate(() => (window as any).__xkxCmd("get ye guo"));
      await page.waitForTimeout(1000);
      await page.evaluate(() => (window as any).__xkxCmd("eat ye guo"));
      await page.waitForTimeout(1000);
    }
    console.log("Step 2: ate 3 fruits");

    // 步3: 探索三方向——西、东、南各走一次再回
    let r = "";
    r = await goDir(page, /西/i);
    console.log(`  → ${r}`);
    r = await goDir(page, /东|east/i);
    console.log(`  ← ${r}`);
    r = await goDir(page, /东|east/i);
    console.log(`  → ${r}`);
    r = await goDir(page, /西/i);
    console.log(`  ← ${r}`);
    r = await goDir(page, /南|south/i);
    console.log(`  → ${r}`);
    r = await goDir(page, /北|north/i);
    console.log(`  ← ${r}`);
    console.log("Step 3: explored all 3 directions");

    // 步4: 攀爬
    await page.evaluate(() => (window as any).__xkxCmd("climb up"));
    await page.waitForTimeout(5000);
    console.log("Step 4: climbed to", (await room().textContent()));

    // 步5: 走到山庄大门 (一路向北直到到达)
    for (let i = 0; i < 5; i++) {
      r = await room().textContent();
      if (/山庄|大门/.test(r)) break;
      r = await goDir(page, /北/i);
      console.log(`  [${i}] → ${r}`);
    }
    await expect(room()).toContainText(/山庄|大门/, { timeout: 10_000 });
    console.log("Step 5-6: arrived at 山庄大门");

    // 步7: 敲门
    await page.evaluate(() => (window as any).__xkxCmd("knock gate"));
    await page.waitForTimeout(3000);
    console.log("Step 7: knocked ✅");
  });
});
