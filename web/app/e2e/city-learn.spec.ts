import { test, expect } from "@playwright/test";
import { loginAsE2eAccount } from "./helpers";

async function cmd(page: any, text: string, wait = 2200) {
  const input = page.locator(".log-cmd-input");
  let vis = await input.isVisible({ timeout: 800 }).catch(() => false);
  if (!vis) {
    const menuBtn = page.getByRole("button", { name: "菜单" });
    if (await menuBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
      await menuBtn.click();
      await page.waitForTimeout(400);
    }
    const item = page.locator('[role="menuitem"]').filter({ hasText: "指令" }).first();
    if (await item.isVisible({ timeout: 2000 }).catch(() => false)) {
      await item.click();
      await page.waitForTimeout(400);
    }
  }
  await input.fill(text);
  await page.locator(".log-cmd-send").click();
  await page.waitForTimeout(wait);
}

async function openLog(page: any): Promise<string> {
  const summary = page.locator(".log-summary").first();
  const expanded = await summary.getAttribute("aria-expanded").catch(() => "false");
  if (expanded !== "true") await summary.click().catch(() => {});
  await page.waitForTimeout(300);
  return (await page.locator(".log").textContent().catch(() => "")) || "";
}

test("书院夫子免费学读书写字（新手 literate 可学）", async ({ page }) => {
  test.setTimeout(150_000);
  await loginAsE2eAccount(page);
  await cmd(page, "newbietest prep qianzhuang", 3500);
  await cmd(page, "south", 2000);   // 东大街3
  await cmd(page, "west", 2000);    // 东大街2
  await cmd(page, "west", 2000);    // 东大街1
  await cmd(page, "north", 2500);   // 书院
  const npcs = await page.locator(".chip.npc").allInnerTexts().catch(() => []);
  console.log("书院 NPC:", JSON.stringify(npcs));
  await expect(page.locator(".chip.npc").filter({ hasText: "夫子" }).first()).toBeVisible({ timeout: 10_000 });

  // 直接学：learn fuzi literate（新手 literate=10，无 mark/朱，但夫子免费放行；双词 id 用单 token）
  await cmd(page, "learn fuzi literate 3", 3000);
  const log1 = await openLog(page);
  console.log("=== learn fu zi 结果 ===", log1.replace(/\n+/g, " | ").slice(-200));
  await expect(page.locator("body")).toContainText(/心得|指导/, { timeout: 10_000 });
});

test("朱熹技能面板可见（前端学艺入口）", async ({ page }) => {
  test.setTimeout(150_000);
  await loginAsE2eAccount(page, { index: 1 });
  await cmd(page, "newbietest prep qianzhuang", 3500);
  await cmd(page, "south", 2000);
  await cmd(page, "west", 2000);
  await cmd(page, "west", 2000);
  await cmd(page, "north", 2500);   // 书院
  // 点朱熹 chip → EntitySheet → 学艺 → skills 面板（doc 捕获）
  await page.locator(".chip.npc").filter({ hasText: "朱熹" }).first().click();
  await page.waitForTimeout(800);
  const sheetText = (await page.locator(".entity-action-grid").innerText().catch(() => "")) || "";
  console.log("=== EntitySheet 动作 ===", sheetText.replace(/\n+/g, " | "));
  await page.getByRole("button", { name: "学艺" }).click();
  await page.waitForTimeout(1500);
  const learnPanel = (await page.locator(".sheet-scroll").innerText().catch(() => "")) || "";
  console.log("=== 学艺面板 ===", learnPanel.replace(/\n+/g, " | ").slice(0, 300));
  await expect(page.locator(".help-topic.skill-item").first()).toBeVisible({ timeout: 10_000 });
  await expect(page.locator(".help-topic.skill-item").first()).toContainText(/读书识字|literate/, { timeout: 5_000 });
});

test("东大街1 可进入太乙武馆并见教头", async ({ page }) => {
  test.setTimeout(150_000);
  await loginAsE2eAccount(page, { index: 2 });
  await cmd(page, "newbietest prep qianzhuang", 3500);
  await cmd(page, "south", 2000);
  await cmd(page, "west", 2000);
  await cmd(page, "west", 2000);    // 东大街1
  // 场景出口面板应有西北方向（武馆入口；目标名依赖 exitNames 缓存，不校验文字）
  await expect(page.locator(".exit-pad .cell").filter({ hasText: "西北" }).first()).toBeVisible({ timeout: 10_000 });
  // 进武馆
  await cmd(page, "northwest", 2500);
  await expect(page.locator(".room-title").first()).toHaveText(/武馆/, { timeout: 15_000 });
  // 大厅见教头
  await cmd(page, "south", 2500);
  await expect(page.locator(".chip.npc").filter({ hasText: "教头" }).first()).toBeVisible({ timeout: 10_000 });
});
