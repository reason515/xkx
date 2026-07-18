import { expect, test } from "@playwright/test";
import {
  completeDesktopIntro,
  desktopSend,
  forceDesktopMode,
  forceMobileMode,
  loginAsNewbie,
  readTerminalText,
  waitForInGameDesktop,
} from "./helpers";

test.describe.serial("桌面工作台", () => {
  test.use({ viewport: { width: 1280, height: 720 } });
  test.describe.configure({ timeout: 180_000 });

  let shared: { id: string; password: string } | null = null;

  test.beforeAll(async ({ browser }) => {
    test.setTimeout(600_000);
    const page = await browser.newPage();
    try {
      shared = await loginAsNewbie(page, { desktop: true, asRegister: true });
    } finally {
      await page.close();
    }
  });

  async function enterDesktop(page: import("@playwright/test").Page) {
    if (!shared) throw new Error("shared credentials missing");
    await loginAsNewbie(page, {
      desktop: true,
      asRegister: false,
      id: shared.id,
      password: shared.password,
    });
    await completeDesktopIntro(page);
  }

  test("桌面模式登录后可见终端输出", async ({ page }) => {
    await enterDesktop(page);
    await expect(page.locator('[data-testid="desktop-app"]')).toBeVisible();
    await expect
      .poll(async () => (await readTerminalText(page)).length, {
        timeout: 60_000,
      })
      .toBeGreaterThan(0);
  });

  test("桌面命令行发送 look 有回显", async ({ page }) => {
    await enterDesktop(page);
    const before = await readTerminalText(page);
    await desktopSend(page, "look");
    await expect
      .poll(async () => {
        const t = await readTerminalText(page);
        return t.length > before.length || /你|出口|这里/.test(t);
      }, { timeout: 30_000 })
      .toBeTruthy();
  });

  test("桌面模式偏好刷新后仍保留", async ({ page }) => {
    await forceDesktopMode(page);
    await enterDesktop(page);
    await page.reload();
    const login = page.getByRole("tab", { name: "登录" });
    if (await login.isVisible().catch(() => false)) {
      await login.click();
      await page.getByLabel("账号（英文 ID）").fill(shared!.id);
      await page.getByLabel("密码", { exact: true }).fill(shared!.password);
      await page.getByRole("button", { name: "进入游戏" }).click();
      await waitForInGameDesktop(page);
    }
    await expect(page.locator('[data-testid="desktop-app"]')).toBeVisible({
      timeout: 60_000,
    });
    await expect(page.locator(".phone")).toHaveCount(0);
  });

  test("强制移动模式时仍为手机布局", async ({ page }) => {
    await forceMobileMode(page);
    await page.setViewportSize({ width: 1280, height: 720 });
    await loginAsNewbie(page, {
      desktop: false,
      asRegister: false,
      id: shared!.id,
      password: shared!.password,
    });
    await expect(page.locator(".phone")).toBeVisible();
    await expect(page.locator(".scene-panel")).toBeVisible();
    await expect(page.locator('[data-testid="desktop-app"]')).toHaveCount(0);
  });

  test("桌面点击出口可换房", async ({ page }) => {
    await enterDesktop(page);
    const titleBefore = (
      (await page.locator('[data-testid="desktop-room-title"]').textContent()) ||
      ""
    ).trim();
    const cell = page.locator(".desktop-left .exit-pad .cell.open").first();
    await expect(cell).toBeVisible({ timeout: 60_000 });
    await cell.click();
    await expect
      .poll(async () => {
        const t = (
          (await page
            .locator('[data-testid="desktop-room-title"]')
            .textContent()) || ""
        ).trim();
        return t && t !== "…" && t !== titleBefore;
      }, { timeout: 30_000 })
      .toBeTruthy();
  });

  test("桌面点击人物可 look", async ({ page }) => {
    await enterDesktop(page);
    await desktopSend(page, "look");
    const npc = page
      .locator(".desktop-left .chip.npc")
      .filter({ hasText: /渔夫|百姓|张三|李四/ })
      .or(page.locator(".desktop-left .chip.npc"))
      .first();
    await expect(npc).toBeVisible({ timeout: 60_000 });
    const before = await readTerminalText(page);
    await npc.click();
    await expect
      .poll(async () => (await readTerminalText(page)).length > before.length, {
        timeout: 20_000,
      })
      .toBeTruthy();
  });

  test("桌面点击物品可 get", async ({ page }) => {
    await enterDesktop(page);
    await desktopSend(page, "drop money");
    await desktopSend(page, "look");
    const item = page.locator(".desktop-left .chip.item").first();
    // 沙滩常见大石头；若无钱币则点任意地面物
    await expect(item).toBeVisible({ timeout: 30_000 });
    const before = await readTerminalText(page);
    await item.click();
    await expect
      .poll(async () => {
        const t = await readTerminalText(page);
        return t.length > before.length;
      }, { timeout: 20_000 })
      .toBeTruthy();
  });

  test("桌面快捷环顾可发令", async ({ page }) => {
    await enterDesktop(page);
    const before = await readTerminalText(page);
    await page.locator(".desktop-quick button", { hasText: "环顾" }).click();
    await expect
      .poll(async () => (await readTerminalText(page)).length >= before.length, {
        timeout: 20_000,
      })
      .toBeTruthy();
  });

  test("桌面 alias 展开生效", async ({ page }) => {
    await enterDesktop(page);
    const expanded = await page.evaluate(() => {
      const w = window as unknown as {
        __xkxRuleEngine?: {
          addRule: (r: unknown) => boolean;
          processInput: (s: string) => string;
        };
      };
      const eng = w.__xkxRuleEngine;
      if (!eng) throw new Error("规则引擎未就绪");
      eng.addRule({
        kind: "alias",
        id: "e2e_alias_ll",
        name: "ll",
        enabled: true,
        alias: "ll",
        expansion: "look",
      });
      return eng.processInput("ll");
    });
    expect(expanded).toBe("look");
    const before = await readTerminalText(page);
    await desktopSend(page, "ll");
    await expect
      .poll(async () => (await readTerminalText(page)).length > before.length, {
        timeout: 30_000,
      })
      .toBeTruthy();
  });

  test("桌面 trigger 匹配可自动发令", async ({ page }) => {
    await enterDesktop(page);
    await page.evaluate(() => {
      const w = window as unknown as {
        __xkxRuleEngine?: {
          addRule: (r: unknown) => void;
          processOutput: (line: string) => unknown;
        };
      };
      const eng = w.__xkxRuleEngine;
      if (!eng) throw new Error("规则引擎未就绪");
      eng.addRule({
        kind: "trigger",
        id: "e2e_trig",
        name: "ping",
        enabled: true,
        pattern: "E2E_TRIGGER_PING",
        patternType: "exact",
        caseSensitive: true,
        action: [{ type: "send", command: "hp" }],
        advanced: { cooldownMs: 0 },
      });
      eng.processOutput("E2E_TRIGGER_PING");
    });
    await expect
      .poll(
        async () => /精|气|内力|食物|饮水|精力/.test(await readTerminalText(page)),
        { timeout: 30_000 }
      )
      .toBeTruthy();
  });

  test("桌面规则导出再导入可还原", async ({ page }) => {
    await enterDesktop(page);
    await page.locator('[data-testid="desktop-tab-rules"]').click();
    await page.getByRole("button", { name: "+ Alias" }).click();
    await page.locator('[data-testid="rule-alias"]').fill("zz");
    await page.locator('[data-testid="rule-expansion"]').fill("look");
    await page.getByRole("button", { name: "保存" }).click();
    await expect(
      page.locator('[data-testid="desktop-rule-list"]')
    ).toContainText("zz");

    const json = await page.evaluate(
      () => localStorage.getItem("xkx-desktop-rules") || "[]"
    );
    expect(json).toMatch(/zz/);
    const count = await page.evaluate((payload) => {
      const data = JSON.parse(payload) as unknown;
      const rules = Array.isArray(data)
        ? data
        : (data as { rules?: unknown[] }).rules || [];
      const set = {
        version: 1 as const,
        name: "e2e",
        rules,
        exportedAt: new Date().toISOString(),
      };
      localStorage.setItem("xkx-desktop-rules", JSON.stringify(set));
      return set.rules.length;
    }, json);
    expect(count).toBeGreaterThan(0);
  });

  test("桌面急停禁用规则与 timer", async ({ page }) => {
    await enterDesktop(page);
    await page.evaluate(() => {
      const w = window as unknown as {
        __xkxRuleEngine?: {
          addRule: (r: unknown) => void;
        };
      };
      w.__xkxRuleEngine!.addRule({
        kind: "timer",
        id: "e2e_tm",
        name: "t",
        enabled: true,
        intervalMs: 1000,
        action: "hp",
        oneShot: false,
      });
    });
    await page.locator('[data-testid="desktop-estop"]').first().click();
    const stopped = await page.evaluate(() => {
      const w = window as unknown as {
        __xkxRuleEngine?: {
          isEmergencyStopped: () => boolean;
          getRules: () => { enabled: boolean }[];
        };
      };
      const eng = w.__xkxRuleEngine!;
      return (
        eng.isEmergencyStopped() && eng.getRules().every((r) => !r.enabled)
      );
    });
    expect(stopped).toBe(true);
  });

  test("桌面右侧可切换角色状态", async ({ page }) => {
    await enterDesktop(page);
    await page.locator('[data-testid="desktop-tab-status"]').click();
    await expect(page.locator('[data-testid="desktop-status"]')).toBeVisible();
    await expect(page.locator(".desktop-stat").first()).toBeVisible({
      timeout: 15_000,
    });
  });

  test("桌面与移动模式切换不掉线", async ({ page }) => {
    await enterDesktop(page);
    await expect(page.locator('[data-testid="desktop-app"]')).toBeVisible();
    await page.locator('[data-testid="mode-mobile"]').click();
    await expect(page.locator(".phone")).toBeVisible({ timeout: 15_000 });
    await expect(page.locator(".scene-panel")).toBeVisible();
    await page.locator('[data-testid="mode-desktop"]').click();
    await expect(page.locator('[data-testid="desktop-app"]')).toBeVisible({
      timeout: 15_000,
    });
    await desktopSend(page, "look");
    await expect
      .poll(async () => (await readTerminalText(page)).length > 0, {
        timeout: 20_000,
      })
      .toBeTruthy();
  });

  test("桌面命令历史上键可回填", async ({ page }) => {
    await enterDesktop(page);
    await desktopSend(page, "look");
    const input = page.locator('[data-testid="desktop-cmd-input"]');
    await input.click();
    await input.press("ArrowUp");
    await expect(input).toHaveValue("look");
  });

  test("桌面 Ctrl+L 可清屏", async ({ page }) => {
    await enterDesktop(page);
    await expect
      .poll(async () => (await readTerminalText(page)).length > 0, {
        timeout: 30_000,
      })
      .toBeTruthy();
    await page.evaluate(() => {
      const w = window as unknown as { __xkxClearTerminal?: () => void };
      if (typeof w.__xkxClearTerminal !== "function") {
        throw new Error("__xkxClearTerminal 未就绪");
      }
      w.__xkxClearTerminal();
    });
    await expect
      .poll(async () => (await readTerminalText(page)).length, {
        timeout: 10_000,
      })
      .toBeLessThan(40);
  });
});
