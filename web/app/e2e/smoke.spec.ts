import { expect, test } from "@playwright/test";

const e2eId = process.env.XKX_E2E_ID;
const e2ePassword = process.env.XKX_E2E_PASSWORD;
const register = process.env.XKX_E2E_REGISTER === "1";

function randomId() {
  const letters = "abcdefghijklmnopqrstuvwxyz";
  let id = "";
  for (let i = 0; i < 6; i++) id += letters[Math.floor(Math.random() * 26)];
  return id;
}

test.describe("smoke", () => {
  test("登录后可见场景且不含登录横幅", async ({ page }) => {
    const id = register || !e2eId ? randomId() : e2eId!;
    const password =
      register || !e2ePassword ? "Test1234" : e2ePassword!;

    await page.goto("/");

    if (register || !e2eId) {
      await page.getByLabel(/新玩家注册/).check();
      await page.getByLabel("中文名字").fill("测试");
    }

    await page.getByLabel("账号（英文 ID）").fill(id);
    await page.getByLabel("密码").fill(password);
    await page
      .getByRole("button", { name: register || !e2eId ? "注册并进入" : "进入游戏" })
      .click();

    const roomTitle = page.locator(".room-title");
    await expect(roomTitle).toBeVisible({ timeout: 90_000 });
    await expect(roomTitle).not.toHaveText("…", { timeout: 90_000 });

    const roomDesc = page.locator(".room-desc");
    await expect(roomDesc).toBeVisible();
    const desc = (await roomDesc.textContent()) || "";
    expect(desc).not.toMatch(/BIG5|Do you want to use|有任何意见|egroups\.com/i);

    const logs = await page.locator(".log p").allTextContents();
    const logBlob = logs.join("\n");
    expect(logBlob).not.toMatch(/Do you want to use BIG5/i);

    // Optional move if exits exist
    const firstExit = page.locator(".exit-pad .cell.open").first();
    if ((await firstExit.count()) > 0) {
      const titleBefore = (await roomTitle.textContent())?.trim() ?? "";
      await firstExit.click();
      await page.getByRole("button", { name: "前往" }).click();
      await expect(async () => {
        const titleAfter = (await roomTitle.textContent())?.trim() ?? "";
        const moved =
          titleAfter !== titleBefore ||
          (await page.locator(".log p").allTextContents()).some((line) =>
            /向|走|来到|进入/.test(line)
          );
        expect(moved).toBe(true);
      }).toPass({ timeout: 30_000 });
    }
  });
});
