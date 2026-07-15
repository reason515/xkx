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

async function loginAsNewbie(
  page: import("@playwright/test").Page,
  opts?: { id?: string; password?: string; asRegister?: boolean }
) {
  const asRegister = opts?.asRegister ?? (register || !e2eId);
  const id = opts?.id ?? (asRegister || !e2eId ? randomId() : e2eId!);
  const password =
    opts?.password ??
    (asRegister || !e2ePassword ? "Test1234" : e2ePassword!);

  await page.goto("/");

  if (asRegister) {
    await page.getByLabel(/新玩家注册/).check();
    await page.getByLabel("中文名字").fill("测试");
  } else {
    const box = page.getByLabel(/新玩家注册/);
    if (await box.isChecked()) await box.uncheck();
  }

  await page.getByLabel("账号（英文 ID）").fill(id);
  await page.getByLabel("密码").fill(password);
  await page
    .getByRole("button", { name: asRegister ? "注册并进入" : "进入游戏" })
    .click();

  return { id, password };
}

test.describe("smoke", () => {
  test("登录后可见场景且不含登录横幅", async ({ page }) => {
    await loginAsNewbie(page);

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

  test("新手沙滩跟随挂名后原密码仍可重登", async ({ page }) => {
    // 必须用新号，否则已注册角色不会落在沙滩新手链
    test.skip(!register && !!e2eId, "需要 XKX_E2E_REGISTER=1 以走新手沙滩");

    const { id, password } = await loginAsNewbie(page, { asRegister: true });

    const roomTitle = page.locator(".room-title");
    await expect(roomTitle).toBeVisible({ timeout: 90_000 });
    await expect(roomTitle).toHaveText(/沙滩|挂名/, { timeout: 90_000 });

    const followBtn = page
      .locator(".chips .chip.action")
      .filter({ hasText: /跟随/ });
    const registerBtn = page
      .locator(".chips .chip.action")
      .filter({ hasText: /挂名登记|register/i });

    // 未自动传送时点跟随；已在挂名处则直接验标题
    const titleNow = ((await roomTitle.textContent()) || "").trim();
    if (/沙滩/.test(titleNow)) {
      await expect(followBtn.first()).toBeVisible({ timeout: 60_000 });
      const logsBefore = (await page.locator(".log p").allTextContents()).join(
        "\n"
      );
      expect(logsBefore).not.toMatch(/这是一个大厅/);
      await followBtn.first().click();
    }

    await expect(roomTitle).toHaveText(/挂名/, { timeout: 90_000 });
    await expect(page.locator(".room-desc")).toContainText(/大厅|桌子|本子/, {
      timeout: 30_000,
    });
    await expect(registerBtn.first()).toBeVisible({ timeout: 60_000 });
    expect(((await roomTitle.textContent()) || "").trim()).not.toMatch(/沙滩/);

    await registerBtn.first().click();

    await expect(async () => {
      const logs = (await page.locator(".log p").allTextContents()).join("\n");
      expect(logs).not.toMatch(/您的新密码是|请用新的密码连线/);
      expect(logs).toMatch(/挂名登记完成|原来的密码|register\s+\S+@/i);
    }).toPass({ timeout: 30_000 });

    // 断开后用同一密码重新登录，不得出现「密码错误」
    await page.goto("/");
    await loginAsNewbie(page, { id, password, asRegister: false });
    await expect(page.locator(".room-title")).toBeVisible({ timeout: 90_000 });
    await expect(page.locator(".room-title")).not.toHaveText("…", {
      timeout: 90_000,
    });
    const err = page.locator(".login-error, .error, [role='alert']");
    if ((await err.count()) > 0) {
      await expect(err.first()).not.toContainText(/密码错误/);
    }
    const postLogs = (await page.locator(".log p").allTextContents()).join(
      "\n"
    );
    expect(postLogs).not.toMatch(/密码错误/);
  });
});
