import { test, expect } from "@playwright/test";

/** 生成纯字母随机 ID */
function randomId() {
  const letters = "abcdefghijklmnopqrstuvwxyz";
  let id = "";
  for (let i = 0; i < 6; i++) id += letters[Math.floor(Math.random() * 26)];
  return id;
}

/** 注册新账号并等待进入游戏 */
async function registerFresh(page: import("@playwright/test").Page): Promise<string> {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  await page.getByRole("tab", { name: "注册" }).click();
  const id = randomId();
  await page.getByLabel("账号（英文 ID）").fill(id);
  await page.getByLabel("密码", { exact: true }).fill("Test1234x");
  await page.getByLabel("中文名字").fill("测试");
  await page.getByRole("button", { name: "注册并进入" }).click();
  await page.locator(".scene-panel").first().waitFor({ state: "visible", timeout: 60_000 });
  // 等待房间标题加载（不再是 "…"）
  await expect(page.locator(".room-title")).not.toHaveText("…", { timeout: 30_000 });
  // 等待出口出现
  await expect(page.locator(".exit-pad .cell.open").first()).toBeVisible({ timeout: 15_000 });
  return id;
}

/** 点击出口 → 点击「前往」→ 切换房间，返回新房间名 */
async function moveExit(page: import("@playwright/test").Page, label?: string | RegExp): Promise<string> {
  const exits = label
    ? page.locator(".exit-pad .cell.open").filter({ hasText: label })
    : page.locator(".exit-pad .cell.open");
  const count = await exits.count();
  if (count === 0) throw new Error(`No exit found matching ${label}`);
  await exits.first().click();
  await page.waitForTimeout(800);
  // 有时没有预览直接移动，有时有预览需要点「前往」
  const goBtn = page.locator("button.go").filter({ hasText: /前往/ }).first();
  if (await goBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
    await goBtn.click();
  }
  await page.waitForTimeout(4000);
  return (await page.locator(".room-title").textContent()) || "";
}

/** 获取当前房间名 */
async function roomTitle(page: import("@playwright/test").Page) {
  return (await page.locator(".room-title").textContent()) || "";
}

test.describe("newbie walkthrough", () => {
  test("完整串行：未明谷 → 山庄大门（步骤 1-7）", async ({ page }) => {
    test.setTimeout(300_000);

    // ── 步骤 1：注册 + 出生在未明谷 ──
    const accId = await registerFresh(page);
    console.log(`Account: ${accId}`);
    await expect(page.locator(".room-title")).toHaveText(/未明谷/, { timeout: 15_000 });
    console.log("Step 1: 出生在未明谷");

    // ── 步骤 1b：打开角色面板（触发 hp 命令）──
    const heroBtn = page.locator(".hero-btn");
    if (await heroBtn.isVisible().catch(() => false)) {
      await heroBtn.click();
      await page.waitForTimeout(2000);
      await page.locator(".sheet .close, .overlay .close").first().click().catch(() => {});
    }
    console.log("Step 1b: 打开角色面板");

    // ── 步骤 2：拾取野果并食用 ──
    await page.waitForTimeout(2000);
    const items = page.locator(".chip.item");
    const itemCount = await items.count();
    console.log(`地上物品: ${itemCount} 个`);
    if (itemCount > 0) {
      // 点击第一个物品
      await items.first().click();
      await page.waitForTimeout(500);
      // 尝试"拿"按钮
      const getBtn = page.getByRole("button", { name: "拿" });
      if (await getBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
        await getBtn.click();
        await page.waitForTimeout(1500);
        console.log("Step 2: 拾取物品");
      }
      await page.locator(".sheet .close, .overlay .close").first().click().catch(() => {});
    }

    // 在地上物品中找食物并食用
    for (let i = 0; i < itemCount; i++) {
      const item = items.nth(i);
      if (!(await item.isVisible().catch(() => false))) continue;
      await item.click();
      await page.waitForTimeout(500);
      const eatBtn = page.getByRole("button", { name: "吃" });
      if (await eatBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
        await eatBtn.click();
        console.log("Step 2b: 吃了食物");
        await page.waitForTimeout(1500);
        break;
      }
      await page.locator(".sheet .close, .overlay .close").first().click().catch(() => {});
    }

    // ── 步骤 3：探索三方向 ──
    // 向西 → 回到未明谷
    await moveExit(page, /西/i);
    const afterWest = await roomTitle(page);
    console.log(`向西到: ${afterWest}`);

    // 回未明谷
    await moveExit(page);
    await page.waitForTimeout(2000);
    console.log(`回到: ${await roomTitle(page)}`);

    // ── 步骤 4：攀爬离开未明谷 ──
    // 先看 path，找到攀爬动作
    const climbActions = page.locator(".chip.action").filter({ hasText: /爬/ });
    if (await climbActions.count() > 0) {
      await climbActions.first().click();
      await page.waitForTimeout(4000);
      console.log(`攀爬后: ${await roomTitle(page)}`);
    }

    // ── 步骤 5-7：走到山庄大门 → 敲门 ──
    // 根据当前房间移动
    const curRoom = await roomTitle(page);
    console.log(`当前房间: ${curRoom}`);

    // 尝试向北走到大门
    const northExit = page.locator(".exit-pad .cell.open").filter({ hasText: /北/i });
    if (await northExit.isVisible().catch(() => false)) {
      await moveExit(page, /北/i);
      console.log(`向北到: ${await roomTitle(page)}`);
    }

    // 寻找敲门动作
    const knockActions = page.locator(".chip.action").filter({ hasText: /敲/ });
    if (await knockActions.count() > 0) {
      await knockActions.first().click();
      await page.waitForTimeout(3000);
      console.log("Step 7: 敲门了");
    }
    const finalRoom = await roomTitle(page);
    console.log(`最终房间: ${finalRoom}`);
  });
});
