import { expect, type Page } from "@playwright/test";

export function randomId() {
  const letters = "abcdefghijklmnopqrstuvwxyz";
  let id = "";
  for (let i = 0; i < 6; i++) id += letters[Math.floor(Math.random() * 26)];
  return id;
}

/** Force mobile shell so wide viewports do not enter desktop workbench. */
export async function forceMobileMode(page: Page) {
  await page.addInitScript(() => {
    localStorage.setItem("xkx-ui-mode", "mobile");
  });
}

export async function forceDesktopMode(page: Page) {
  await page.addInitScript(() => {
    localStorage.setItem("xkx-ui-mode", "desktop");
  });
}

export async function waitForInGameMobile(page: Page) {
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

export async function waitForInGameDesktop(page: Page) {
  const deadline = Date.now() + 90_000;
  while (Date.now() < deadline) {
    const shell = page.locator('[data-testid="desktop-app"]');
    if (await shell.isVisible()) return;
    const loginErr = page.locator(".login-form .err");
    if (await loginErr.isVisible()) {
      const message = ((await loginErr.textContent()) || "").trim();
      throw new Error(message || "登录失败");
    }
    await page.waitForTimeout(500);
  }
  throw new Error("桌面模式登录超时");
}

export async function loginAsNewbie(
  page: Page,
  opts?: {
    desktop?: boolean;
    asRegister?: boolean;
    id?: string;
    password?: string;
  }
) {
  if (opts?.desktop) await forceDesktopMode(page);
  else await forceMobileMode(page);

  const asRegister = opts?.asRegister ?? true;
  let id = opts?.id ?? randomId();
  const password = opts?.password ?? `Pw${id}9x`;

  const maxAttempts = asRegister ? 6 : 4;
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    if (asRegister && attempt > 0 && !opts?.id) id = randomId();
    await page.goto("/");
    await page
      .getByRole("tab", { name: asRegister ? "注册" : "登录" })
      .click();
    await page.getByLabel("账号（英文 ID）").fill(id);
    await page.getByLabel("密码", { exact: true }).fill(password);
    if (asRegister) {
      await page.getByLabel("中文名字").fill(`测${id.slice(0, 2)}`);
    }
    await page
      .getByRole("button", { name: asRegister ? "注册并进入" : "进入游戏" })
      .click();

    try {
      if (opts?.desktop) await waitForInGameDesktop(page);
      else await waitForInGameMobile(page);
      return { id, password };
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      if (/过于频繁/.test(message) && attempt < maxAttempts - 1) {
        // MUD 注册限流：退避等待（勿在 beforeAll 默认 120s 内耗尽）
        await page.waitForTimeout(45_000 + attempt * 15_000);
        continue;
      }
      throw err;
    }
  }
  throw new Error("登录/注册失败：重试次数已用尽");
}

/**
 * e2e 账号池：固定账号复用，避免每次测试注册新号触发 MUD 注册限流
 * （网关 maxRegisterPerHour=30/IP，撞限流后 helpers 退避重试可拖数分钟）。
 * 每个账号首次使用时注册一次，之后登录 + newbietest reset 回到初始状态。
 */
export const E2E_ACCOUNTS = [
  { id: "testera", password: "E2ePass123" },
  { id: "testerb", password: "E2ePass123" },
  { id: "testerc", password: "E2ePass123" },
  { id: "testerd", password: "E2ePass123" },
];

/**
 * 登录账号池账号：优先登录已有账号（asRegister=false，3~5 秒）；
 * 账号不存在（首次）自动注册。按 TEST_WORKER_INDEX 分配账号，多 worker 并行不互踢。
 * 登录后调用方自行 newbietest reset / skip 到目标状态。
 */
export async function loginAsE2eAccount(
  page: Page,
  opts?: { desktop?: boolean; index?: number }
) {
  const worker = Number(process.env.TEST_WORKER_INDEX ?? 0);
  const account =
    E2E_ACCOUNTS[(opts?.index ?? worker) % E2E_ACCOUNTS.length];
  try {
    return await loginAsNewbie(page, {
      desktop: opts?.desktop,
      asRegister: false,
      id: account.id,
      password: account.password,
    });
  } catch {
    // 账号不存在：注册创建（限流窗口内只有首次会撞，之后都是登录）
    return loginAsNewbie(page, {
      desktop: opts?.desktop,
      asRegister: true,
      id: account.id,
      password: account.password,
    });
  }
}

export async function readTerminalText(page: Page): Promise<string> {
  const term = page.locator('[data-testid="desktop-terminal"]');
  await expect(term).toBeVisible({ timeout: 15_000 });
  return page.evaluate(() => {
    const root = document.querySelector(
      '[data-testid="desktop-terminal"]'
    ) as HTMLElement | null;
    if (!root) return "";
    return (root.innerText || root.textContent || "").trim();
  });
}

export async function desktopSend(page: Page, command: string) {
  const input = page.locator('[data-testid="desktop-cmd-input"]');
  await expect(input).toBeVisible();
  await input.fill(command);
  await page
    .locator('[data-testid="desktop-cmd"] button[type="submit"]')
    .click();
}

/** 新注册角色（柳秀山庄新手村）：确认出生点有出口即可。 */
export async function completeDesktopIntro(page: Page) {
  await expect(page.locator('[data-testid="desktop-app"]')).toBeVisible();
  const hasExit = async () =>
    (await page.locator(".desktop-left .exit-pad .cell.open").count()) > 0;
  // 新手村出生点有出口，无需额外引导
  await expect
    .poll(async () => hasExit(), { timeout: 60_000 })
    .toBeTruthy();
}
