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
  let id = opts?.id ?? (asRegister || !e2eId ? randomId() : e2eId!);
  const password =
    opts?.password ??
    (asRegister || !e2ePassword ? "Test1234" : e2ePassword!);

  for (let attempt = 0; attempt < 4; attempt++) {
    if (asRegister && attempt > 0) id = randomId();
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

    const rateLimited = page.locator(".login-form .err").filter({
      hasText: /过于频繁/,
    });
    try {
      await expect(rateLimited).toBeVisible({ timeout: 2_500 });
      await page.waitForTimeout(15_000 * (attempt + 1));
      continue;
    } catch {
      /* not rate-limited */
    }
    break;
  }

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
    expect(logBlob).not.toMatch(/@@JSON@@|@@ENDJSON@@/);

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

  test("新注册进可走动沙滩且原密码可重登", async ({ page }) => {
    // Web 已跳过迎宾/挂名：应直接落在有出口的沙滩，密码不变可重登
    test.skip(!register && !!e2eId, "需要 XKX_E2E_REGISTER=1");

    const { id, password } = await loginAsNewbie(page, { asRegister: true });

    const roomTitle = page.locator(".room-title");
    await expect(roomTitle).toBeVisible({ timeout: 90_000 });
    await expect(roomTitle).toHaveText(/沙滩/, { timeout: 90_000 });
    expect(((await roomTitle.textContent()) || "").trim()).not.toMatch(/挂名/);

    await expect(page.locator(".exit-pad .cell.open").first()).toBeVisible({
      timeout: 60_000,
    });

    const logs = (await page.locator(".log p").allTextContents()).join("\n");
    expect(logs).not.toMatch(/@@JSON@@|@@ENDJSON@@/);

    await page.goto("/");
    await loginAsNewbie(page, { id, password, asRegister: false });
    await expect(page.locator(".room-title")).toBeVisible({ timeout: 90_000 });
    await expect(page.locator(".room-title")).not.toHaveText("…", {
      timeout: 90_000,
    });
    const err = page.locator(".login-form .err");
    if ((await err.count()) > 0) {
      await expect(err.first()).not.toContainText(/密码错误/);
    }
    const postLogs = (await page.locator(".log p").allTextContents()).join(
      "\n"
    );
    expect(postLogs).not.toMatch(/密码错误/);
    expect(postLogs).not.toMatch(/@@JSON@@|@@ENDJSON@@/);
  });
});
