import { test, expect } from "@playwright/test";
import { loginAsNewbie, waitForInGameMobile } from "./helpers";

async function sendCmd(page: any, text: string, wait = 1500) {
  const input = page.locator(".log-cmd-input");
  if (!(await input.isVisible({ timeout: 800 }).catch(() => false))) {
    const menuBtn = page.getByRole("button", { name: "菜单" });
    if (await menuBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
      await menuBtn.click();
      await page.waitForTimeout(400);
    }
    const cmdItem = page
      .locator('[role="menuitem"]')
      .filter({ hasText: "指令" })
      .first();
    if (await cmdItem.isVisible({ timeout: 2000 }).catch(() => false)) {
      await cmdItem.click();
      await page.waitForTimeout(400);
    }
  }
  await input.fill(text);
  await page.locator(".log-cmd-send").click();
  await page.waitForTimeout(wait);
}

/** 打开见闻页签并返回全文（钱庄业务反馈都在 MUD 文本里）。 */
async function logText(page: any): Promise<string> {
  const log = page.locator('[data-testid="tab-log"]');
  if (await log.isVisible().catch(() => false)) await log.click();
  return (await page.locator(".log").textContent()) || "";
}

async function waitForLogPattern(page: any, pattern: RegExp, timeout = 20_000) {
  await expect
    .poll(async () => await logText(page), { timeout })
    .toMatch(pattern);
}

/**
 * 扬州钱庄必须声明查账/存款/取款按钮：进入后「动作」页签默认选中，
 * 三个按钮可直接看到；存款→查账→取款完整闭环可用。
 */
test("扬州钱庄声明钱庄业务按钮并完成存取款闭环", async ({ page }) => {
  test.setTimeout(120_000);
  await loginAsNewbie(page, { asRegister: true });

  // 传送到扬州钱庄（e2e 专用）
  await sendCmd(page, "xkxe2e qianzhuang", 3_000);
  await expect(page.locator(".room-title").first()).toHaveText(/钱庄/, {
    timeout: 10_000,
  });

  // 钱庄掌柜在场景中
  await expect(page.locator(".chip.npc").filter({ hasText: "黄真" })).toHaveCount(1);

  // LPC 房间声明 web/actions → 「动作」页签默认选中，按钮无需切页签即可见
  await expect(
    page.locator('.scene-tabs [role="tab"]').filter({ hasText: "动作" }).first()
  ).toHaveAttribute("aria-selected", "true");
  const check = page.locator(".chip.action").filter({ hasText: "查账" }).first();
  const cun = page.locator(".chip.action").filter({ hasText: "存款" }).first();
  const qu = page.locator(".chip.action").filter({ hasText: "取款" }).first();
  await expect(check).toBeVisible({ timeout: 10_000 });
  await expect(cun).toBeVisible();
  await expect(qu).toBeVisible();

  // 先查账：没有存款
  await check.click();
  await waitForLogPattern(page, /没有存钱/);

  // 给 20 两白银，走存款按钮（前端 BankingPrompt 拦截 cun）
  await sendCmd(page, "xkxe2e givemoney", 2_000);
  await cun.click();
  const depositSheet = page.locator(".overlay.open .sheet");
  await expect(depositSheet).toBeVisible({ timeout: 5_000 });
  await expect(depositSheet.locator("h3")).toHaveText("存款");
  await depositSheet.locator('.learn-assist-form input[type="number"]').fill("10");
  await depositSheet.getByRole("button", { name: "确认存款" }).click();
  await waitForLogPattern(page, /存进了银号/);

  // 查账：显示存款
  await check.click();
  await waitForLogPattern(page, /共存有.*白银/);

  // 取款按钮（前端 BankingPrompt 拦截 qu）
  await qu.click();
  const withdrawSheet = page.locator(".overlay.open .sheet");
  await expect(withdrawSheet).toBeVisible({ timeout: 5_000 });
  await expect(withdrawSheet.locator("h3")).toHaveText("取款");
  await withdrawSheet.locator('.learn-assist-form input[type="number"]').fill("5");
  await withdrawSheet.getByRole("button", { name: "确认取款" }).click();
  await waitForLogPattern(page, /取出.*白银/);
});

/**
 * 新手村柳秀票号同样声明钱庄业务按钮（查账/存款/取款），
 * 保证毕业前玩家也能用同样的入口。
 */
test("柳秀票号声明钱庄业务按钮", async ({ page }) => {
  test.setTimeout(120_000);
  await loginAsNewbie(page, { asRegister: true });

  await sendCmd(page, "newbietest skip 17", 4_000);
  await expect(page.locator(".room-title").first()).toHaveText(/票号/, {
    timeout: 10_000,
  });

  await expect(
    page.locator('.scene-tabs [role="tab"]').filter({ hasText: "动作" }).first()
  ).toHaveAttribute("aria-selected", "true");
  const check = page.locator(".chip.action").filter({ hasText: "查账" }).first();
  const cun = page.locator(".chip.action").filter({ hasText: "存款" }).first();
  const qu = page.locator(".chip.action").filter({ hasText: "取款" }).first();
  await expect(check).toBeVisible({ timeout: 10_000 });
  await expect(cun).toBeVisible();
  await expect(qu).toBeVisible();
});
