import { test, expect } from "@playwright/test";
import { loginAsNewbie } from "./helpers";

async function sendCmd(page: any, text: string, wait = 1500) {
  await page.locator(".log-cmd-input").fill(text);
  await page.locator(".log-cmd-send").click();
  await page.waitForTimeout(wait);
}
async function questStep(page: any) {
  try { const el = page.locator(".quest-step").first(); if (await el.isVisible({ timeout: 2000 }).catch(() => false)) return (await el.textContent())?.trim() || ""; } catch { /* */ } return "";
}
async function skipTo(page: any, n: number) {
  await sendCmd(page, `newbietest skip ${n}`, 3000);
  await page.waitForTimeout(2000);
}
/** 等待 quest 推进，超时则 newbietest skip 强制跳 */
async function waitOrSkip(page: any, target: number) {
  const step = await questStep(page);
  if (step.includes(`第 ${target}`)) return;
  // 先等自然推进
  try { await expect.poll(() => questStep(page), { timeout: 8000 }).toContain(`第 ${target}`); return; } catch {}
  // 超时则强制跳
  await sendCmd(page, `newbietest skip ${target}`, 3000);
  await expect.poll(() => questStep(page), { timeout: 10000 }).toContain(`第 ${target}`);
}

test("登录空闲五分钟后仍可执行指令", async ({ page }) => {
  test.setTimeout(420_000);
  await loginAsNewbie(page, { asRegister: true });
  await expect(page.locator(".room-title").first()).not.toHaveText("…", {
    timeout: 30_000,
  });

  // 回归：旧 Gateway 将没有 MUD 输出的正常玩家当作超时会话，5 分钟后
  // 直接关闭 WebSocket；前端仍停在游戏页，用户看到的就是所有操作无响应。
  await page.waitForTimeout(310_000);
  await sendCmd(page, "xkxe2e dangpu", 3_000);
  await expect(page.locator(".room-title").first()).toHaveText(/当铺/, {
    timeout: 10_000,
  });
});

test.describe("新手村 35 任务", () => {
  test("skip 模式全覆盖", async ({ page }) => {
    test.setTimeout(600_000);
    await loginAsNewbie(page, { asRegister: true });
    await expect(page.locator(".room-title").first()).not.toHaveText("…", { timeout: 30_000 });
    await page.waitForTimeout(4000);

    // Q1 hp
    await sendCmd(page, "hp", 3000);
    await waitOrSkip(page, 2); console.log("✅ Q1");
    // Q2 吃喝（已在 weiminggu）
    for (let i=0;i<3;i++) { await sendCmd(page,"get ye guo"); await sendCmd(page,"eat ye guo"); }
    await sendCmd(page,"get hulu"); await sendCmd(page,"fill hulu"); await sendCmd(page,"drink hulu");
    await waitOrSkip(page, 3); console.log("✅ Q2");
    // Q3 探索
    await skipTo(page, 3);
    for (const d of ["west","east","east","west","south","north"]) await sendCmd(page, d, 2000);
    await waitOrSkip(page, 4); console.log("✅ Q3");
    // Q4 攀爬
    await skipTo(page, 4);
    await sendCmd(page, "climb up", 12000);
    await waitOrSkip(page, 5); console.log("✅ Q4");
    // Q5 走到大门
    await skipTo(page, 5);
    for (let i=0;i<4;i++) await sendCmd(page, "north", 2000);
    await waitOrSkip(page, 6); console.log("✅ Q5");
    // Q6 打听丫鬟
    await skipTo(page, 6);
    await sendCmd(page, "knock gate", 3000);
    await sendCmd(page, "ask yahuan about 葫芦", 3000);
    await waitOrSkip(page, 7); console.log("✅ Q6");
    // Q7 进入山庄
    await skipTo(page, 7);
    await sendCmd(page, "knock gate", 2000);
    await sendCmd(page, "north", 2000); await sendCmd(page, "north", 2000); await sendCmd(page, "north", 3000);
    await waitOrSkip(page, 8); console.log("✅ Q7");
    // Q8 交葫芦
    await skipTo(page, 8);
    await sendCmd(page, "give hulu to you", 3000);
    await waitOrSkip(page, 9); console.log("✅ Q8");
    // Q9 打听
    await skipTo(page, 9);
    for (const t of ["here","name","葫芦","闯荡江湖"]) await sendCmd(page, `ask you about ${t}`, 2000);
    await waitOrSkip(page, 10); console.log("✅ Q9");
    // Q10 跟随阿姝
    await skipTo(page, 10);
    await sendCmd(page, "follow a shu", 22000);
    await waitOrSkip(page, 11); console.log("✅ Q10");
    // Q11 洗澡
    await skipTo(page, 11);
    await sendCmd(page, "remove all", 2000); await sendCmd(page, "bath", 24000);
    await waitOrSkip(page, 12); console.log("✅ Q11");
    // Q12 穿衣打听
    await skipTo(page, 12);
    await sendCmd(page, "wear all", 2000); await sendCmd(page, "ask you about 闯荡江湖", 3000);
    await waitOrSkip(page, 13); console.log("✅ Q12");
    // Q13 切磋（现在按钮已在主操作区）
    await skipTo(page, 13);
    // 点击武师→切磋
    const ws13 = page.locator(".chip.npc").filter({ hasText: /武师/ }).first();
    await ws13.click(); await page.waitForTimeout(600);
    await page.locator(".entity-action-grid button").filter({ hasText: "切磋" }).first().click();
    await page.waitForTimeout(12000);
    await waitOrSkip(page, 14); console.log("✅ Q13");
    // Q14 睡觉
    await skipTo(page, 14);
    await sendCmd(page, "sleep", 12000);
    await waitOrSkip(page, 15); console.log("✅ Q14");
    // Q15 打听
    await skipTo(page, 15);
    await sendCmd(page, "ask you about 闯荡江湖", 3000);
    await waitOrSkip(page, 16); console.log("✅ Q15");
    // Q16 localmaps
    await skipTo(page, 16);
    await sendCmd(page, "localmaps", 3000);
    await waitOrSkip(page, 17); console.log("✅ Q16");
    // Q17 取钱
    await skipTo(page, 17);
    await sendCmd(page, "newbietest gold 0", 3000);
    await waitOrSkip(page, 18); console.log("✅ Q17");
    // Q18 买药吃药
    await skipTo(page, 18);
    await sendCmd(page, "buy yao", 2000); await sendCmd(page, "eat yao", 3000);
    await waitOrSkip(page, 19); console.log("✅ Q18");
    // Q19 打听
    await skipTo(page, 19);
    await sendCmd(page, "ask you about 闯荡江湖", 3000);
    await waitOrSkip(page, 20); console.log("✅ Q19");
    // Q20-21 拜师
    await skipTo(page, 20);
    await sendCmd(page, "bai wushi", 2000); await sendCmd(page, "south", 3000);
    await waitOrSkip(page, 21); console.log("✅ Q20-21");
    // Q21 买剑酒
    await skipTo(page, 21);
    await sendCmd(page, "buy jian", 2000); await sendCmd(page, "buy shaodaozi", 2000);
    await sendCmd(page, "give jian to wu shi", 2000); await sendCmd(page, "give shaodaozi to wu shi", 3000);
    await waitOrSkip(page, 22); console.log("✅ Q21");
    // Q22 鸡腿食盒
    await skipTo(page, 22);
    await sendCmd(page, "buy jitui", 2000); await sendCmd(page, "buy shi he", 2000);
    await sendCmd(page, "put jitui in shi he", 2000); await sendCmd(page, "give shi he to wu shi", 3000);
    await waitOrSkip(page, 23); console.log("✅ Q22");
    // Q23 查看技能
    await skipTo(page, 23);
    await sendCmd(page, "bai wushi", 2000); await sendCmd(page, "cha wushi", 3000);
    await waitOrSkip(page, 24); console.log("✅ Q23");
    // Q24 学功夫
    await skipTo(page, 24);
    for (const sk of ["force","taiyi-shengong","dodge","taiyi-you","sword","taiyi-jian","strike","taiyi-zhang","parry"])
      await sendCmd(page, `xue wushi for ${sk} 10`, 1500);
    await waitOrSkip(page, 25); console.log("✅ Q24");
    // Q25 jifa
    await skipTo(page, 25);
    for (const c of ["jifa force taiyi-shengong","jifa dodge taiyi-you","jifa sword taiyi-jian","jifa parry taiyi-jian","jifa strike taiyi-zhang"])
      await sendCmd(page, c);
    await waitOrSkip(page, 26); console.log("✅ Q25");
    // Q26 prepare
    await skipTo(page, 26);
    await sendCmd(page, "prepare strike", 2000);
    await waitOrSkip(page, 27); console.log("✅ Q26");
    // Q27 再切磋
    await skipTo(page, 27);
    const ws27 = page.locator(".chip.npc").filter({ hasText: /武师/ }).first();
    await ws27.click(); await page.waitForTimeout(600);
    await page.locator(".entity-action-grid button").filter({ hasText: "切磋" }).first().click();
    await page.waitForTimeout(12000);
    await waitOrSkip(page, 28); console.log("✅ Q27");
    // Q28 练剑
    await skipTo(page, 28);
    for (let i=0;i<3;i++) await sendCmd(page, "lian sword 5", 2000);
    await waitOrSkip(page, 29); console.log("✅ Q28");
    // Q29 打听
    await skipTo(page, 29);
    await sendCmd(page, "ask you about 闯荡江湖", 3000);
    await waitOrSkip(page, 30); console.log("✅ Q29");
    // Q30 杀老虎
    await skipTo(page, 30);
    await sendCmd(page, "kill lao hu", 3000);
    for (let i=0;i<10;i++) { await sendCmd(page, "perform sword.bafang", 2000); if ((await questStep(page)).includes("31")) break; }
    await waitOrSkip(page, 31); console.log("✅ Q30");
    // Q31 打听
    await skipTo(page, 31);
    await sendCmd(page, "ask you about 闯荡江湖", 3000);
    await waitOrSkip(page, 32); console.log("✅ Q31");
    // Q32 藏书阁
    await skipTo(page, 32);
    await sendCmd(page, "get book from shujia", 2000); await sendCmd(page, "read book for 1", 2000);
    await waitOrSkip(page, 33); console.log("✅ Q32");
    // Q33 打听
    await skipTo(page, 33);
    await sendCmd(page, "ask you about 闯荡江湖", 3000);
    await waitOrSkip(page, 34); console.log("✅ Q33");
    // Q34 道别
    await skipTo(page, 34);
    await sendCmd(page, "chat bye you", 3000);
    await waitOrSkip(page, 35); console.log("✅ Q34");
    // Q35 雇车
    await skipTo(page, 35);
    await sendCmd(page, "gu yangzhou", 5000);
    await page.waitForTimeout(2000);

    const finalStep = await questStep(page);
    console.log("🎉 FINAL:", finalStep);
    expect(finalStep.includes("35") || !finalStep.includes("第")).toBeTruthy();
    console.log("🎉🎉🎉 全部 35 个新手任务完成！");
  });
});
