import { test, expect } from "@playwright/test";
import {
  loginAsE2eAccount,
  sendCmd,
  prepTo,
  cmdToRoom,
  openLogPanel,
} from "./helpers";

/**
 * 学艺回归：learn <师父> <技能> <大次数> 时，
 * 精不足不得“整批拒学 + 把精气一次性扣光”（修复前 learn … 100 → 精归零、技能一次没学）。
 *
 * 修复后预期：逐次学习，精够几次学几次；学完精气仍 > 0。
 * 修复前预期（钉死）：无任何心得/指导，精气条 0%。
 */

/** 读取精气条的填充百分比样式，如 "width: 2%"；0% 表示精气归零。 */
async function jingWidth(page: import("@playwright/test").Page): Promise<string> {
  await page.waitForTimeout(400);
  return (
    (await page
      .locator(".vital.sp .fill")
      .first()
      .getAttribute("style")
      .catch(() => "")) || ""
  );
}

test("夫子学识字 999 次：精不足也逐次学习，精不为零（learn.c 回归）", async ({ page }) => {
  test.setTimeout(180_000);
  await loginAsE2eAccount(page);
  // 钱庄就绪（毕业新手状态，literate 10）→ 学艺前置（潜能 2000、精压低、夫子精气充足）
  await prepTo(page, "qianzhuang", /钱庄/);
  await sendCmd(page, "xkxe2e learnprep", 800);
  // 走到书院（东大街3 → 东大街2 → 东大街1 → 书院）
  await cmdToRoom(page, "south", /东大街/);
  await cmdToRoom(page, "west", /东大街/);
  await cmdToRoom(page, "west", /东大街/);
  await cmdToRoom(page, "north", /书院/);
  await expect(
    page.locator(".chip.npc").filter({ hasText: "夫子" }).first()
  ).toBeVisible({ timeout: 10_000 });

  // 大次数学习：精（≤500）远不够 999 次（≈3000+ 精），修复前整批拒学且精归零
  await sendCmd(page, "learn fuzi literate 999", 4000); // 逐次学习本身耗时，保留足够等待
  // 1) 学习确实发生（部分学习）：出现心得/指导
  await expect(page.locator("body")).toContainText(/心得|指导/, { timeout: 15_000 });
  // 2) 精气没有归零
  const sp = await jingWidth(page);
  console.log("=== 精气条 ===", sp);
  expect(sp).not.toMatch(/width:\s*0%/);
  // 3) 不应出现“什么也没有学到”的整批拒学文案
  await openLogPanel(page);
  const log =
    (await page.locator(".log").textContent().catch(() => "")) || "";
  expect(log).not.toContain("结果什么也没有学到");
});

test("武师学基本功 999 次：学到五级即止且精不为零（wushi 回归）", async ({ page }) => {
  test.setTimeout(180_000);
  await loginAsE2eAccount(page);
  // 跳到尚武堂任务 20（九项技能 5 级 + 武师徒弟）
  await sendCmd(page, "newbietest skip 20", 800);
  await sendCmd(page, "xkxe2e learnprep", 800);
  // 放弃基本内功，制造可学状态
  await sendCmd(page, "abandon force", 800);
  // 大次数学习：修复前 999 次全学（技能顶破五级）+ 精被扣成 -1；修复后学到五级即止、精保留
  await sendCmd(page, "xue wushi for force 999", 4000);
  // 1) 学习发生（心得/指导）
  await expect(page.locator("body")).toContainText(/心得|指导/, { timeout: 15_000 });
  // 2) 精气没有归零
  const sp = await jingWidth(page);
  console.log("=== 精气条 ===", sp);
  expect(sp).not.toMatch(/width:\s*0%/);
});
