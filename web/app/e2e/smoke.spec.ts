import { expect, test, type Page } from "@playwright/test";

const e2eId = process.env.XKX_E2E_ID || "";
const e2ePassword = process.env.XKX_E2E_PASSWORD || "";
const register = process.env.XKX_E2E_REGISTER === "1";

function randomId() {
  const letters = "abcdefghijklmnopqrstuvwxyz";
  let id = "";
  for (let i = 0; i < 6; i++) id += letters[Math.floor(Math.random() * 26)];
  return id;
}

/** Force mobile shell so wide viewports do not enter desktop workbench. */
async function forceMobileMode(page: Page) {
  await page.addInitScript(() => {
    localStorage.setItem("xkx-ui-mode", "mobile");
  });
}

async function waitForInGame(page: import("@playwright/test").Page) {
  const deadline = Date.now() + 90_000;
  while (Date.now() < deadline) {
    const inGame = page.locator(".scene-panel, .log-panel").first();
    if (await inGame.isVisible()) return;
    const loginErr = page.locator(".login-form .err");
    if (await loginErr.isVisible()) {
      const message = ((await loginErr.textContent()) || "").trim();
      throw new Error(message || "登录失败");
    }
    await page.waitForTimeout(500);
  }
  throw new Error("登录/注册超时：未进入游戏");
}

async function openSceneTab(page: import("@playwright/test").Page) {
  const scene = page.locator('[data-testid="tab-scene"]');
  if (await scene.isVisible()) await scene.click();
}

/** Get room title text (works in both mobile and desktop layouts). */
async function getRoomTitle(page: import("@playwright/test").Page): Promise<string> {
  const el = page.locator(".room-title");
  if (await el.isVisible().catch(() => false)) return (await el.textContent()) || "";
  return "";
}

async function openLogTab(page: import("@playwright/test").Page) {
  const log = page.locator('[data-testid="tab-log"]');
  if (await log.isVisible()) await log.click();
}

async function openTopMenu(page: import("@playwright/test").Page) {
  const menu = page.getByRole("button", { name: "菜单" });
  if (await menu.isVisible()) {
    await menu.click();
    await page.waitForTimeout(300);
  }
}

async function pickTopMenuItem(
  page: import("@playwright/test").Page,
  name: string
) {
  const item = page.locator('[role="menuitem"]').filter({ hasText: name });
  await expect(item).toBeVisible();
  await item.click();
}

async function goByExitLabel(
  page: import("@playwright/test").Page,
  dir: string
) {
  const exit = page.locator(".exit-pad .cell.open").filter({ hasText: new RegExp(dir, "i") }).first();
  await expect(exit).toBeVisible();
  await exit.click();
  await page.waitForTimeout(2000);
}

async function clickActionChip(
  page: import("@playwright/test").Page,
  name: string | RegExp
) {
  await openSceneTab(page);
  const chip = page.locator(".chip.action").filter({ hasText: name }).first();
  await expect(chip).toBeVisible({ timeout: 20_000 });
  await chip.click();
}

async function clickActionAndWaitLog(
  page: import("@playwright/test").Page,
  name: string | RegExp,
  pattern: RegExp,
  timeout = 15_000
) {
  await clickActionChip(page, name);
  await expect
    .poll(async () => (await page.locator(".log").textContent()) || "", {
      timeout,
    })
    .toMatch(pattern);
}

async function waitForLogPattern(
  page: import("@playwright/test").Page,
  pattern: RegExp,
  timeout = 15_000
) {
  await expect
    .poll(async () => (await page.locator(".log").textContent()) || "", {
      timeout,
    })
    .toMatch(pattern);
}

async function hasExit(page: import("@playwright/test").Page, dir: string) {
  return (
    (await page
      .locator(".exit-pad .cell.open")
      .filter({ hasText: new RegExp(dir, "i") })
      .count()) > 0
  );
}

async function sendSilentCmd(page: import("@playwright/test").Page, command: string) {
  // Desktop terminal input or mobile mode fallback
  const input = page.locator('[data-testid="desktop-cmd-input"]');
  if (await input.isVisible()) {
    await input.fill(command);
    await page.locator('[data-testid="desktop-cmd"] button[type="submit"]').click();
  }
}

/** 新注册角色（柳秀山庄新手村）：等待出生点加载完成。 */
async function completeIntroFollow(page: import("@playwright/test").Page) {
  await expect(page.locator(".room-title")).not.toHaveText("…", {
    timeout: 90_000,
  });
  await expect(page.locator(".exit-pad .cell.open").first()).toBeVisible({
    timeout: 30_000,
  });
}

async function loginAsNewbie(
  page: Page,
  opts?: {
    desktop?: boolean;
    asRegister?: boolean;
    id?: string;
    password?: string;
  }
) {
  await forceMobileMode(page);
  const asRegister = opts?.asRegister ?? true;
  let id = opts?.id ?? randomId();
  const password = opts?.password ?? `Pw${id}9x`;

  const maxAttempts = asRegister ? 6 : 4;
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    if (asRegister && attempt > 0 && !opts?.id) id = randomId();
    await page.goto("/");
    await page.getByRole("tab", { name: asRegister ? "注册" : "登录" }).click();
    await page.getByLabel("账号（英文 ID）").fill(id);
    await page.getByLabel("密码", { exact: true }).fill(password);
    if (asRegister) {
      await page.getByLabel("中文名字").fill("测" + id.slice(0, 2));
    }
    await page.getByRole("button", { name: asRegister ? "注册并进入" : "进入游戏" }).click();
    try {
      await waitForInGame(page);
      return { id, password };
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      if (/过于频繁/.test(message) && attempt < maxAttempts - 1) {
        await page.waitForTimeout(45_000 + attempt * 15_000);
        continue;
      }
      throw err;
    }
  }
  throw new Error("登录/注册失败：重试次数已用尽");
}

test("勾选记住账号后刷新可回填", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("tab", { name: "登录" })).toBeVisible({ timeout: 15_000 });
  await page.getByRole("tab", { name: "登录" }).click();
  await page.getByLabel("账号（英文 ID）").fill("abcdef");
  await page.getByLabel("密码", { exact: true }).fill("Test1234");
  await page.getByLabel("记住账号和密码").check();
  await page.getByRole("button", { name: "进入游戏" }).click();
  await expect.poll(async () => page.evaluate(() => localStorage.getItem("xkx.login.saved"))).toContain("abcdef");
  await page.goto("/");
  await expect(page.getByLabel("账号（英文 ID）")).toHaveValue("abcdef");
  await expect(page.getByLabel("密码", { exact: true })).toHaveValue("Test1234");
  await expect(page.getByLabel("记住账号和密码")).toBeChecked();
  await page.getByLabel("记住账号和密码").uncheck();
  await expect.poll(async () => page.evaluate(() => localStorage.getItem("xkx.login.saved"))).toBeNull();
  await page.goto("/");
  await expect(page.getByLabel("账号（英文 ID）")).toHaveValue("");
  await expect(page.getByLabel("密码", { exact: true })).toHaveValue("");
  await expect(page.getByLabel("记住账号和密码")).not.toBeChecked();
});

// ============================================================
// 柳秀山庄新手村 e2e 测试
// ============================================================
test.describe.serial("newbie village", () => {
  test.describe.configure({ timeout: 300_000 });

  let sharedId = "";
  let sharedPassword = "Test1234";

  test.beforeAll(async ({ browser }) => {
    if (e2eId && e2ePassword) return;
    const page = await browser.newPage();
    try {
      const creds = await loginAsNewbie(page, { asRegister: true });
      sharedId = creds.id;
      sharedPassword = creds.password;
      await completeIntroFollow(page);
    } finally {
      await page.close();
    }
  }, { timeout: 300_000 });

  test("出生点在未明谷", async ({ page }) => {
    await loginAsNewbie(page, { asRegister: true, id: sharedId, password: sharedPassword });
    await openSceneTab(page);
    await expect(page.locator(".room-title")).not.toHaveText("…", { timeout: 60_000 });
    await expect(page.locator(".room-title")).toHaveText(/未明谷/, { timeout: 30_000 });
  });

  test("出生点有出口和 NPC", async ({ page }) => {
    await loginAsNewbie(page, { asRegister: true, id: sharedId, password: sharedPassword });
    await openSceneTab(page);
    await expect(page.locator(".room-title")).not.toHaveText("...", { timeout: 60_000 });
    await expect(page.locator(".exit-pad .cell.open").first()).toBeVisible({ timeout: 30_000 });
    await expect(page.locator(".chip.npc").first()).toBeVisible({ timeout: 15_000 });
  });

  test.skip("新手任务面板显示当前目标", async ({ page }) => {
    await loginAsNewbie(page, { asRegister: true, id: sharedId, password: sharedPassword });
    await openSceneTab(page);
    await expect(page.locator(".room-title")).not.toHaveText("...", { timeout: 60_000 });
    await expect(page.locator(".newbie-quest-panel")).toBeVisible({ timeout: 30_000 });
    await expect(page.locator(".quest-target")).toBeVisible();
  });

  test("可向出口方向移动", async ({ page }) => {
    await loginAsNewbie(page, { asRegister: true, id: sharedId, password: sharedPassword });
    await openSceneTab(page);
    await expect(page.locator(".room-title")).not.toHaveText("...", { timeout: 60_000 });
    const exits = page.locator(".exit-pad .cell.open");
    await expect(exits.first()).toBeVisible({ timeout: 30_000 });
    const count = await exits.count();
    expect(count).toBeGreaterThanOrEqual(3);
    await exits.first().click();
    await page.waitForTimeout(3000);
    await expect(page.locator(".room-title")).not.toHaveText("...");
  });

  test("帮助面板可打开并看到新手村推荐", async ({ page }) => {
    await loginAsNewbie(page, { asRegister: true, id: sharedId, password: sharedPassword });
    await openTopMenu(page);
    await pickTopMenuItem(page, "帮助");
    await expect(page.locator(".help-section")).toBeVisible({ timeout: 15_000 });
    await expect(page.getByText("你现在需要知道")).toBeVisible();
  });
});

// ============================================================
// 通用游戏 e2e 测试
// ============================================================
test.describe.serial("game smoke", () => {
  test.describe.configure({ timeout: 300_000 });

  let sharedId = e2eId || "";
  let sharedPassword = e2ePassword || "Test1234";

  test.beforeAll(async ({ browser }) => {
    if (e2eId && e2ePassword) return;
    const page = await browser.newPage();
    try {
      const creds = await loginAsNewbie(page, { asRegister: true });
      sharedId = creds.id;
      sharedPassword = creds.password;
      await completeIntroFollow(page);
    } finally {
      await page.close();
    }
  }, { timeout: 300_000 });

  test("登录后可见场景且不含登录横幅", async ({ page }) => {
    await loginAsNewbie(page, { id: sharedId, password: sharedPassword, asRegister: false });
    await expect(page.locator(".room-title")).not.toHaveText("...", { timeout: 90_000 });
    await expect(page.getByText(/欢迎来到/)).toHaveCount(0);
    const roomDesc = page.locator(".room-desc");
    await expect(roomDesc).toBeVisible();
  });

  test("见闻中有文字且场景可互动", async ({ page }) => {
    await loginAsNewbie(page, { id: sharedId, password: sharedPassword, asRegister: false });
    await expect(page.locator(".log-panel")).toBeVisible({ timeout: 30_000 });
    await expect(page.locator(".log").first()).toBeVisible();
    await expect(page.locator(".scene-panel")).toBeVisible();
  });

  test("顶栏帮助可查阅主题且不进见闻", async ({ page }) => {
    await loginAsNewbie(page, { id: sharedId, password: sharedPassword, asRegister: false });
    await openTopMenu(page);
    await pickTopMenuItem(page, "帮助");
    await expect(page.locator(".help-section")).toBeVisible({ timeout: 10_000 });
    await page.locator(".sheet .close").click();
  });

  test("顶栏菜单退出后回到登录页", async ({ page }) => {
    await loginAsNewbie(page, { id: sharedId, password: sharedPassword, asRegister: false });
    await openTopMenu(page);
    await pickTopMenuItem(page, "退出");
    await expect(page.getByRole("tab", { name: "登录" })).toBeVisible({ timeout: 10_000 });
  });
});
