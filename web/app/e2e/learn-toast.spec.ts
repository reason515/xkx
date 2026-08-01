import { test, expect } from "@playwright/test";
import { loginAsNewbie } from "./helpers";

async function sendCmd(page: any, text: string, wait = 1500) {
  const input = page.locator(".log-cmd-input");
  if (!(await input.isVisible({ timeout: 800 }).catch(() => false))) {
    const menuBtn = page.getByRole("button", { name: "菜单" });
    if (await menuBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
      await menuBtn.click();
      await page.waitForTimeout(400);
    }
    const cmdItem = page.locator('[role="menuitem"]').filter({ hasText: "指令" }).first();
    if (await cmdItem.isVisible({ timeout: 2000 }).catch(() => false)) {
      await cmdItem.click();
      await page.waitForTimeout(400);
    }
  }
  await input.fill(text);
  await page.locator(".log-cmd-send").click();
  await page.waitForTimeout(wait);
}

test("学艺反馈以 toast 展示见闻中的实际文本", async ({ page }) => {
  test.setTimeout(150_000);
  await loginAsNewbie(page);
  // skip 20：9 项技能 5 级 + 武师（尚武堂）
  await sendCmd(page, "newbietest skip 20", 4000);
  // 放弃基本内功，制造可学状态
  await sendCmd(page, "abandon force", 2500);
  // 重新学艺 → 反馈「你听了武师的指导…」应以 toast 弹出
  await sendCmd(page, "xue wushi for force 5", 4000);
  await expect(page.locator(".toast")).toHaveClass(/show/, { timeout: 10_000 });
  const toastText = await page.locator(".toast").innerText();
  console.log("TOAST:", toastText.slice(0, 100));
  expect(toastText).toMatch(/心得|指导|进步/);
});
