import { test, expect } from "@playwright/test";

function randomId() {
  const letters = "abcdefghijklmnopqrstuvwxyz";
  let id = "";
  for (let i = 0; i < 6; i++) id += letters[Math.floor(Math.random() * 26)];
  return id;
}

async function loginNew(page: import("@playwright/test").Page) {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  await page.getByRole("tab", { name: "注册" }).click();
  await page.getByLabel("账号（英文 ID）").fill(randomId());
  await page.getByLabel("密码", { exact: true }).fill("Test1234x");
  await page.getByLabel("中文名字").fill("测试");
  await page.getByRole("button", { name: "注册并进入" }).click();
  await page.locator(".scene-panel").first().waitFor({ state: "visible", timeout: 30_000 });
}

test.describe.serial("newbie village", () => {
  test.describe.configure({ timeout: 60_000 });

  test("出生点在未明谷", async ({ page }) => {
    await loginNew(page);
    await expect(page.locator(".room-title")).toHaveText(/未明谷/, { timeout: 15_000 });
  });

  test("出生点有出口和 NPC", async ({ page }) => {
    await loginNew(page);
    await expect(page.locator(".exit-pad .cell.open").first()).toBeVisible({ timeout: 10_000 });
    await expect(page.locator(".chip.npc").first()).toBeVisible({ timeout: 10_000 });
  });

  test("新手任务面板显示当前目标", async ({ page }) => {
    await loginNew(page);
    await expect(page.locator(".newbie-quest-panel")).toBeVisible({ timeout: 15_000 });
    await expect(page.locator(".quest-target")).toBeVisible();
  });
});
