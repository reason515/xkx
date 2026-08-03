import { test, expect } from "@playwright/test";
import { loginAsNewbie } from "./helpers";

async function sendCmd(page: any, text: string, wait = 2500) {
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

/** 打开完整见闻面板，匹配后关闭（避免遮挡场景按钮）。 */
async function closeLogOverlay(page: any) {
  const close = page.locator(".log-overlay .sheet .close");
  if (await close.isVisible({ timeout: 1500 }).catch(() => false)) {
    await close.click();
    await page.waitForTimeout(400);
  }
}

async function openLog(page: any): Promise<string> {
  const summary = page.locator(".log-summary").first();
  const expanded = await summary
    .getAttribute("aria-expanded")
    .catch(() => "false");
  if (expanded !== "true") await summary.click().catch(() => {});
  return (await page.locator(".log").textContent()) || "";
}

/**
 * 回归：newbietest skip 20+ 为跳过任务进度会静默授予 9 项太乙武功各5级，
 * 曾导致测试者误以为「角色自动学会了一堆技能」。
 * 要求：1) 授予必须给出明确提示（标注为测试数据）；2) 授予的技能集合固定。
 */
test("newbietest skip 20+ 授予技能必须有测试数据提示", async ({ page }) => {
  test.setTimeout(120_000);
  await loginAsNewbie(page);

  // 跳过任务 23（尚武堂·学艺阶段）
  await sendCmd(page, "newbietest skip 23", 4_000);

  // 1) 见闻必须出现「测试数据」授予提示，不能静默白拿技能
  await expect
    .poll(async () => await openLog(page), { timeout: 25_000 })
    .toContain("（测试数据）已自动授予");
  await closeLogOverlay(page);

  // 2) 技能集合固定为 9 项（基本+太乙），全部 5 级
  await page.locator(".hero-avatar").click();
  await page.waitForTimeout(1500);
  await page.locator(".tabs button").filter({ hasText: "武功" }).first().click();
  await page.waitForTimeout(3000);
  const panel = page.locator(".panel.on");
  for (const sk of ["太乙神功", "太乙神游", "太乙剑法", "太乙掌法"]) {
    await expect(panel).toContainText(sk, { timeout: 10_000 });
  }
  await expect(panel).toContainText("基本内功");
  await expect(panel).toContainText("基本轻功");
});

/**
 * 回归：真实学习路径（未用 skip 授予）只提升所学的读书写字，
 * 不会凭空出现其他武功 —— 复现用户报告的场景。
 */
test("只学读书写字不会获得其他武功（abandon 后学习）", async ({ page }) => {
  test.setTimeout(180_000);
  await loginAsNewbie(page);
  await sendCmd(page, "newbietest skip 23", 4_000);

  // 清空测试授予的武功，模拟「什么武功都不会」
  for (const sk of [
    "force", "dodge", "parry", "strike", "sword",
    "taiyi-shengong", "taiyi-you", "taiyi-zhang", "taiyi-jian",
  ]) {
    await sendCmd(page, `abandon ${sk}`, 1000);
  }

  // 学几次读书写字
  await sendCmd(page, "xue wushi for literate 5", 4_000);

  // 角色面板·武功页：只能出现读书写字
  await page.locator(".hero-avatar").click();
  await page.waitForTimeout(1500);
  await page.locator(".tabs button").filter({ hasText: "武功" }).first().click();
  await page.waitForTimeout(3000);
  const panel = page.locator(".panel.on");
  await expect(panel).toContainText("读书写字", { timeout: 10_000 });
  await expect(panel).not.toContainText("太乙神功");
  await expect(panel).not.toContainText("基本内功");
  await expect(panel).not.toContainText("太乙剑法");
});
