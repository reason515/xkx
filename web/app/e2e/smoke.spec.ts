import { expect, test } from "@playwright/test";

const e2eId = process.env.XKX_E2E_ID;
const e2ePassword = process.env.XKX_E2E_PASSWORD;

test.describe("smoke", () => {
  test.skip(
    !e2eId || !e2ePassword,
    "需要环境变量 XKX_E2E_ID 与 XKX_E2E_PASSWORD"
  );

  test("登录后可见场景并可移动", async ({ page }) => {
    await page.goto("/");

    await page.getByLabel("账号（英文 ID）").fill(e2eId!);
    await page.getByLabel("密码").fill(e2ePassword!);
    await page.getByRole("button", { name: "进入游戏" }).click();

    const roomTitle = page.locator(".room-title");
    await expect(roomTitle).toBeVisible({ timeout: 90_000 });
    await expect(roomTitle).not.toHaveText("…");

    const firstExit = page.locator(".exit-pad .cell.open").first();
    const exitCount = await firstExit.count();
    test.skip(exitCount === 0, "当前房间无可用出口");

    const titleBefore = (await roomTitle.textContent())?.trim() ?? "";
    await firstExit.click();
    await page.getByRole("button", { name: "前往" }).click();

    await expect(async () => {
      const titleAfter = (await roomTitle.textContent())?.trim() ?? "";
      const logs = await page.locator(".log p").allTextContents();
      const moved =
        titleAfter !== titleBefore ||
        logs.some((line) => /向|走|来到|进入/.test(line));
      expect(moved).toBe(true);
    }).toPass({ timeout: 30_000 });
  });
});
