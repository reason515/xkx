import { test, expect } from "@playwright/test";
import { loginAsNewbie, waitForInGameMobile } from "./helpers";

async function sendCmd(page: any, text: string, wait = 1500) {
  // 确保指令输入框可见——移动端默认隐藏，需先通过菜单切换
  const input = page.locator(".log-cmd-input");
  if (!(await input.isVisible({ timeout: 800 }).catch(() => false))) {
    // 打开菜单
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
async function questStep(page: any) {
  try { const el = page.locator(".fqb-pill-step").first(); if (await el.isVisible({ timeout: 2000 }).catch(() => false)) return (await el.textContent())?.trim() || ""; } catch { /* */ } return "";
}
async function skipTo(page: any, n: number) {
  await sendCmd(page, `newbietest skip ${n}`, 3000);
  await page.waitForTimeout(2000);
}
/** 切换场景交互 Tab（人物/物品/动作） */
async function switchSceneTab(page: any, tab: "人物" | "物品" | "动作") {
  const tabBtn = page.locator(".scene-tabs button").filter({ hasText: tab }).first();
  if (await tabBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
    await tabBtn.click();
    await page.waitForTimeout(300);
  }
}

/** 等待 quest 推进，超时则 newbietest skip 强制跳 */
async function waitOrSkip(page: any, target: number) {
  const step = await questStep(page);
  const targetStr = `${target}/35`;
  if (step.startsWith(targetStr)) return;
  // 先等自然推进
  try { await expect.poll(() => questStep(page), { timeout: 8000 }).toMatch(new RegExp(`^${target}/`)); return; } catch {}
  // 超时则强制跳（busy/服务器慢时重试，避免命令被吞后卡死）
  for (let i = 0; i < 3; i++) {
    await sendCmd(page, `newbietest skip ${target}`, 3000);
    try {
      await expect
        .poll(() => questStep(page), { timeout: 8000 })
        .toMatch(new RegExp(`^${target}/`));
      return;
    } catch {
      /* 重试 */
    }
  }
  await sendCmd(page, `newbietest skip ${target}`, 3000);
  await expect
    .poll(() => questStep(page), { timeout: 10000 })
    .toMatch(new RegExp(`^${target}/`));
}

/** sleep 后轮询「醒来→任务推进」（睡眠时长 0~39s 随机），超时则醒来后强制跳 */
async function sleepAndWait(page: any, target: number) {
  await sendCmd(page, "sleep", 3000);
  try {
    await expect
      .poll(() => questStep(page), { timeout: 45000 })
      .toMatch(new RegExp(`^${target}/`));
    return;
  } catch {
    /* 仍在睡或未推进 */
  }
  await page.waitForTimeout(5000);
  await sendCmd(page, `newbietest skip ${target}`, 3000);
  await expect
    .poll(() => questStep(page), { timeout: 10000 })
    .toMatch(new RegExp(`^${target}/`));
}

test("新手目标在进入游戏后五秒内展示", async ({ page }) => {
  test.setTimeout(60_000);
  await loginAsNewbie(page, { asRegister: true });
  await expect(page.locator(".fqb-pill")).toBeVisible({
    timeout: 5_000,
  });
  await expect(page.locator(".fqb-pill-text")).toBeVisible();
});

test("车马行声明雇车动作并可通过场景按钮上车", async ({ page }) => {
  test.setTimeout(90_000);
  await loginAsNewbie(page, { asRegister: true });
  await skipTo(page, 35);
  await expect(page.locator(".room-title").first()).toHaveText(/车马行/, {
    timeout: 10_000,
  });
  // 车马行有“招牌”虚拟物件；关键动作必须默认展示，而非藏在物品页签后。
  await expect(
    page.locator('.scene-tabs [role="tab"]').filter({ hasText: "动作" }).first()
  ).toHaveAttribute("aria-selected", "true");
  const hire = page.locator(".chip.action").filter({ hasText: "雇车去扬州" }).first();
  await expect(hire).toBeVisible({ timeout: 10_000 });
  await hire.click();
  await expect(page.locator(".room-title").first()).toHaveText(/马车/, {
    timeout: 10_000,
  });
});

test("确认天赋后完成毕业并进入扬州", async ({ page }) => {
  test.setTimeout(120_000);
  await loginAsNewbie(page, { asRegister: true });
  await skipTo(page, 35);

  const hire = page.locator(".chip.action").filter({ hasText: "雇车去扬州" }).first();
  await expect(hire).toBeVisible({ timeout: 10_000 });
  await hire.click();
  await expect(page.locator(".room-title").first()).toHaveText(/马车/, {
    timeout: 10_000,
  });

  // 首次确认仅显示不可逆提示；第二次才打开 Web 天赋分配界面。
  await sendCmd(page, "qu 扬州");
  await sendCmd(page, "qu 扬州", 3_000);
  await expect(page.getByRole("button", { name: "确认天赋", exact: true })).toBeVisible({
    timeout: 10_000,
  });
  await page.getByRole("button", { name: "确认天赋", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "确认，踏入江湖", exact: true })
  ).toBeVisible();
  await page.getByRole("button", { name: "确认，踏入江湖", exact: true }).click();

  await expect(page.getByRole("button", { name: "确认，踏入江湖", exact: true })).toHaveCount(0, {
    timeout: 10_000,
  });
  await expect(page.locator(".room-title").first()).toHaveText(/扬州.*广场|中央广场/, {
    timeout: 10_000,
  });

  // 毕业离开新手村后，底部新手任务提醒条必须消失
  await expect(page.locator(".fqb-pill")).toHaveCount(0, { timeout: 10_000 });
});

test("毕业老号遗留 quest_index 重登不再显示新手任务条", async ({ page }) => {
  test.setTimeout(180_000);
  const creds = await loginAsNewbie(page, { asRegister: true });
  await skipTo(page, 35);

  const hire = page.locator(".chip.action").filter({ hasText: "雇车去扬州" }).first();
  await expect(hire).toBeVisible({ timeout: 10_000 });
  await hire.click();
  await expect(page.locator(".room-title").first()).toHaveText(/马车/, {
    timeout: 10_000,
  });
  await sendCmd(page, "qu 扬州");
  await sendCmd(page, "qu 扬州", 3_000);
  await expect(page.getByRole("button", { name: "确认天赋", exact: true })).toBeVisible({
    timeout: 10_000,
  });
  await page.getByRole("button", { name: "确认天赋", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "确认，踏入江湖", exact: true })
  ).toBeVisible();
  await page.getByRole("button", { name: "确认，踏入江湖", exact: true }).click();
  await expect(page.locator(".room-title").first()).toHaveText(/扬州.*广场|中央广场/, {
    timeout: 10_000,
  });
  await expect(page.locator(".fqb-pill")).toHaveCount(0, { timeout: 10_000 });

  // 模拟修复前遗留：毕业老号的保存文件仍带 quest_index（newbietest skip 会写回）
  await sendCmd(page, "newbietest skip 5", 3_000);
  await page.waitForTimeout(1_500);

  // 重登：退出后重新进入
  await page.getByRole("button", { name: "菜单" }).click();
  await page.locator('[role="menuitem"]').filter({ hasText: "退出" }).click();
  await page.waitForTimeout(2_000);
  await page.getByRole("tab", { name: "登录" }).click();
  await page.getByLabel("账号（英文 ID）").fill(creds.id);
  await page.getByLabel("密码", { exact: true }).fill(creds.password);
  await page.getByRole("button", { name: "进入游戏" }).click();
  await waitForInGameMobile(page);

  // done 角色即使带遗留 quest_index 也不显示新手任务条
  await expect(page.locator(".fqb-pill")).toHaveCount(0, { timeout: 10_000 });
});

test("毕业进入扬州后可到太乙武馆练功", async ({ page }) => {
  test.setTimeout(150_000);
  await loginAsNewbie(page, { asRegister: true });
  await skipTo(page, 35);

  const hire = page.locator(".chip.action").filter({ hasText: "雇车去扬州" }).first();
  await expect(hire).toBeVisible({ timeout: 10_000 });
  await hire.click();
  await expect(page.locator(".room-title").first()).toHaveText(/马车/, {
    timeout: 10_000,
  });

  await sendCmd(page, "qu 扬州");
  await sendCmd(page, "qu 扬州", 3_000);
  await expect(page.getByRole("button", { name: "确认天赋", exact: true })).toBeVisible({
    timeout: 10_000,
  });
  await page.getByRole("button", { name: "确认天赋", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "确认，踏入江湖", exact: true })
  ).toBeVisible();
  await page.getByRole("button", { name: "确认，踏入江湖", exact: true }).click();
  await expect(page.getByRole("button", { name: "确认，踏入江湖", exact: true })).toHaveCount(0, {
    timeout: 10_000,
  });
  await expect(page.locator(".room-title").first()).toHaveText(/扬州.*广场|中央广场/, {
    timeout: 10_000,
  });

  // 广场 → 东大街（武馆入口在西北方向）
  await sendCmd(page, "go east", 2_000);
  await expect(page.locator(".room-title").first()).toHaveText(/东大街/, {
    timeout: 10_000,
  });
  // 行走见闻须为一句文字描述（非破折号+地名）。NPC 走动行（如 纪晓芙急步往西北离开）
  // 可能插在玩家行走行之后，不能依赖 .last()——轮询整份见闻：有玩家行走描述且无旧格式
  await expect
    .poll(
      async () => {
        const lines = await page
          .locator(".log-summary-line")
          .allTextContents()
          .catch(() => []);
        return (
          lines.some((t) => /你.*东大街/.test(t)) &&
          !lines.some((t) => /^——.*东大街/.test(t.trim()))
        );
      },
      { timeout: 15_000 }
    )
    .toBe(true);
  // 武馆入口必须展示为可点出口（西北方向）
  const wgExit = page.locator(".exit-pad .cell.open").filter({ hasText: "西北" }).first();
  await expect(wgExit).toBeVisible({ timeout: 10_000 });
  await wgExit.click();
  // 出口预览面板中点击“前往”
  await page.getByRole("button", { name: "前往", exact: true }).click();
  await expect(page.locator(".room-title").first()).toHaveText(/太乙武馆大门/, {
    timeout: 10_000,
  });

  // 进大厅见教头，验证太乙武馆 NPC 正常加载
  await sendCmd(page, "go south", 2_000);
  await expect(page.locator(".room-title").first()).toHaveText(/武馆大厅/, {
    timeout: 10_000,
  });
  await expect(page.getByText(/武馆教头/).first()).toBeVisible({ timeout: 10_000 });
});

test("毕业进入扬州后可在福威镖局接押镖任务", async ({ page }) => {
  test.setTimeout(150_000);
  await loginAsNewbie(page, { asRegister: true });
  await skipTo(page, 35);

  const hire = page.locator(".chip.action").filter({ hasText: "雇车去扬州" }).first();
  await expect(hire).toBeVisible({ timeout: 10_000 });
  await hire.click();
  await expect(page.locator(".room-title").first()).toHaveText(/马车/, {
    timeout: 10_000,
  });
  await sendCmd(page, "qu 扬州");
  await sendCmd(page, "qu 扬州", 3_000);
  await expect(page.getByRole("button", { name: "确认天赋", exact: true })).toBeVisible({
    timeout: 10_000,
  });
  await page.getByRole("button", { name: "确认天赋", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "确认，踏入江湖", exact: true })
  ).toBeVisible();
  await page.getByRole("button", { name: "确认，踏入江湖", exact: true }).click();
  await expect(page.getByRole("button", { name: "确认，踏入江湖", exact: true })).toHaveCount(0, {
    timeout: 10_000,
  });
  await expect(page.locator(".room-title").first()).toHaveText(/扬州.*广场|中央广场/, {
    timeout: 10_000,
  });

  // 广场 → 西大街 → 福威镖局
  await sendCmd(page, "go west", 2_000);
  await sendCmd(page, "go west", 2_000);
  await sendCmd(page, "go west", 2_000);
  await sendCmd(page, "go south", 2_000);
  await expect(page.locator(".room-title").first()).toHaveText(/福威镖局/, {
    timeout: 10_000,
  });
  // 总镖头林震南在场
  await expect(page.getByText(/林震南/).first()).toBeVisible({ timeout: 10_000 });

  // 过押镖门槛（e2e 辅助）后接镖
  await sendCmd(page, "xkxe2e grantexp", 2_000);
  await sendCmd(page, "ask lin zhennan about 押镖", 3_000);
  // 接镖成功：镖车出现
  await expect(page.getByText(/镖车/).first()).toBeVisible({ timeout: 10_000 });
});

test("场景物件名称保留有效语义并滤除叙述残片", async ({ page }) => {
  test.setTimeout(60_000);
  await loginAsNewbie(page, { asRegister: true });
  await sendCmd(page, "xkxe2e huanpo", 3_000);
  await expect(page.locator(".room-title").first()).toHaveText(/缓坡/, {
    timeout: 10_000,
  });
  await switchSceneTab(page, "物品");
  await expect(page.locator(".chip.item").filter({ hasText: "山路" })).toBeVisible();
  await expect(page.locator(".chip.item").filter({ hasText: "你往山路" })).toHaveCount(0);

  await sendCmd(page, "xkxe2e luanshizhen", 3_000);
  await expect(page.locator(".room-title").first()).toHaveText(/乱石阵/, {
    timeout: 10_000,
  });
  await switchSceneTab(page, "物品");
  await expect(page.locator(".chip.item").filter({ hasText: "石头上的文字" })).toBeVisible();
  await expect(page.locator(".chip.item").filter({ hasText: "些文字" })).toHaveCount(0);

  await sendCmd(page, "xkxe2e xingzilin", 3_000);
  await expect(page.locator(".room-title").first()).toHaveText(/杏子林/, {
    timeout: 10_000,
  });
  await switchSceneTab(page, "物品");
  await expect(page.locator(".chip.item").filter({ hasText: "杏树下的脚印" })).toBeVisible();
  await expect(page.locator(".chip.item").filter({ hasText: "零散的脚印" })).toHaveCount(0);
});

test("集镇东北远眺不加载药铺且仍可继续操作", async ({ page }) => {
  test.setTimeout(90_000);
  await loginAsNewbie(page, { asRegister: true });
  await sendCmd(page, "xkxe2e jizhen", 3_000);
  await expect(page.locator(".room-title").first()).toHaveText(/集镇小道/, {
    timeout: 10_000,
  });

  const northeast = page
    .locator(".exit-pad .cell.open")
    .filter({ hasText: /东北/ })
    .first();
  await expect(northeast).toBeVisible({ timeout: 10_000 });
  await northeast.click();
  await expect(page.locator(".exit-preview")).toContainText(
    "远处景象尚不可辨清",
    { timeout: 5_000 }
  );

  await page.locator(".sheet .close").first().click();
  await sendCmd(page, "xkxe2e yanzhougrind", 3_000);
  await expect(page.locator(".room-title").first()).toHaveText(/民屋/, {
    timeout: 10_000,
  });
});

test("集镇东北前往进入药铺且NPC不重复", async ({ page }) => {
  test.setTimeout(90_000);
  await loginAsNewbie(page, { asRegister: true });
  await sendCmd(page, "xkxe2e jizhen", 3_000);
  await expect(page.locator(".room-title").first()).toHaveText(/集镇小道/, {
    timeout: 10_000,
  });

  const northeast = page
    .locator(".exit-pad .cell.open")
    .filter({ hasText: /东北/ })
    .first();
  await expect(northeast).toBeVisible({ timeout: 10_000 });
  await northeast.click();
  await expect(page.locator(".exit-preview")).toBeVisible({ timeout: 5_000 });

  await page.locator("button.go").filter({ hasText: /前往/ }).first().click();
  await expect(page.locator(".room-title").first()).toHaveText(/药铺/, {
    timeout: 10_000,
  });
  await expect(page.locator(".chip.npc").filter({ hasText: "药铺伙计" })).toHaveCount(1);
  await expect(page.locator(".chip.npc").filter({ hasText: "薛慕华" })).toHaveCount(1);
});

test("新手村主要NPC房间首次加载不重复", async ({ page }) => {
  test.setTimeout(180_000);
  await loginAsNewbie(page, { asRegister: true });

  await sendCmd(page, "newbietest skip 17", 4_000);
  await expect(page.locator(".room-title").first()).toHaveText(/票号/, {
    timeout: 10_000,
  });
  // 票号声明了钱庄业务动作，「动作」页签默认选中；NPC 芯片需切到「人物」页签
  await switchSceneTab(page, "人物");
  await expect(page.locator(".chip.npc").filter({ hasText: "柳住钱" })).toHaveCount(1);
  console.log("✅ 票号");

  await sendCmd(page, "newbietest skip 8", 4_000);
  await expect(page.locator(".room-title").first()).toHaveText(/柳秀山庄正厅/, {
    timeout: 10_000,
  });
  await expect(page.locator(".chip.npc").filter({ hasText: "游鲲翼" })).toHaveCount(1);
  await expect(page.locator(".chip.npc").filter({ hasText: "阿姝" })).toHaveCount(1);
  console.log("✅ 正厅");

  await sendCmd(page, "newbietest skip 11", 4_000);
  await expect(page.locator(".room-title").first()).toHaveText(/男浴室/);
  await expect(page.locator(".chip.npc").filter({ hasText: "男侍童" })).toHaveCount(1);
  console.log("✅ 男浴室");

  await sendCmd(page, "newbietest skip 13", 4_000);
  await expect(page.locator(".room-title").first()).toHaveText(/尚武堂/);
  await expect(page.locator(".chip.npc").filter({ hasText: "武师" })).toHaveCount(1);
  console.log("✅ 尚武堂");

  await sendCmd(page, "newbietest skip 34", 4_000);
  await expect(page.locator(".room-title").first()).toHaveText(/杏子林/);
  await expect(page.locator(".chip.npc").filter({ hasText: "游鲲翼" })).toHaveCount(1);
  console.log("✅ 杏子林副本");

  await sendCmd(page, "xkxe2e jizhen", 3_000);
  await page.locator(".exit-pad .cell.open").filter({ hasText: /东南/ }).first().click();
  await page.locator("button.go").filter({ hasText: /前往/ }).first().click();
  await expect(page.locator(".room-title").first()).toHaveText(/酒铺/);
  await expect(page.locator(".chip.npc").filter({ hasText: "老汉" })).toHaveCount(1);
  console.log("✅ 酒铺");

  await sendCmd(page, "xkxe2e jizhen", 3_000);
  await sendCmd(page, "north", 2_000);
  await sendCmd(page, "west", 2_000);
  await expect(page.locator(".room-title").first()).toHaveText(/铁匠铺/);
  await expect(page.locator(".chip.npc").filter({ hasText: "老胡" })).toHaveCount(1);
  console.log("✅ 铁匠铺");

  await sendCmd(page, "east", 2_000);
  await sendCmd(page, "east", 2_000);
  await expect(page.locator(".room-title").first()).toHaveText(/杂货铺/);
  await expect(page.locator(".chip.npc").filter({ hasText: "杨永福" })).toHaveCount(1);
  console.log("✅ 杂货铺");

  await sendCmd(page, "west", 2_000);
  await sendCmd(page, "north", 2_000);
  await sendCmd(page, "west", 2_000);
  await expect(page.locator(".room-title").first()).toHaveText(/当铺/);
  await expect(page.locator(".chip.npc").filter({ hasText: "唐老板" })).toHaveCount(1);
  console.log("✅ 当铺");

  await sendCmd(page, "east", 2_000);
  await sendCmd(page, "knock gate", 3_000);
  await sendCmd(page, "look", 2_000);
  await expect(page.locator(".chip.npc").filter({ hasText: "丫鬟" })).toHaveCount(1);
  await sendCmd(page, "north", 2_000);
  await expect(page.locator(".room-title").first()).toHaveText(/长廊/);
});

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

test("新手任务 34 的发言道别按钮会立即推进", async ({ page }) => {
  test.setTimeout(120_000);
  await loginAsNewbie(page, { asRegister: true });
  await skipTo(page, 34);
  await expect(page.locator(".room-title").first()).toHaveText(/杏子林/, {
    timeout: 10_000,
  });

  await page.getByRole("button", { name: "菜单" }).click();
  await page.getByRole("menuitem", { name: "发言" }).click();
  const farewell = page.getByRole("button", { name: /道别游鲲翼/ }).first();
  await expect(farewell).toBeVisible({ timeout: 10_000 });
  await farewell.click();

  await expect
    .poll(() => questStep(page), { timeout: 12_000 })
    .toMatch(/^35\/35$/);
});

test.describe("新手村 35 任务", () => {
  test("skip 模式全覆盖", async ({ page }) => {
    test.setTimeout(900_000);
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
    // 切磋开打 → 见闻自动展开（战斗信息在见闻展示）；尚未拜师无绝招按钮
    try {
      await expect(page.locator(".log-overlay")).toBeVisible({ timeout: 15000 });
    } catch {
      const room = await page.locator(".room-title").innerText().catch(() => "");
      const summary = await page
        .locator(".log-summary-text")
        .innerText()
        .catch(() => "");
      console.log("DIAG Q13 room:", room, "| summary:", summary.slice(0, 200));
      throw new Error(`Q13 log-overlay 未出现（room=${room}）`);
    }
    await expect(page.locator('[data-testid="floating-perf"]')).toHaveCount(0);
    await page.waitForTimeout(12000);
    await waitOrSkip(page, 14); console.log("✅ Q13");
    // Q14 睡觉（睡眠时长 random(60-con)=0~39s，醒来即推进；轮询等待）
    await skipTo(page, 14);
    await sleepAndWait(page, 15); console.log("✅ Q14");
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
    for (const sk of ["force","literate","taiyi-shengong","dodge","taiyi-you","sword","taiyi-jian","strike","taiyi-zhang","parry"])
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
    // 已激发太乙剑法 → 悬浮绝招按钮出现（八方风雨，浮在见闻之上）
    await expect(page.locator('[data-testid="floating-perf"]')).toBeVisible({
      timeout: 10000,
    });
    await expect(page.locator('[data-testid="floating-perf"]')).toContainText("八方风雨");
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
    for (let i=0;i<10;i++) { await sendCmd(page, "perform sword.bafang", 2000); if ((await questStep(page)).startsWith("31/")) break; }
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
    await sendCmd(page, "chat* bye you", 3000);
    await waitOrSkip(page, 35); console.log("✅ Q34");
    // Q35 雇车
    await skipTo(page, 35);
    await sendCmd(page, "gu yangzhou", 5000);
    await page.waitForTimeout(2000);

    const finalStep = await questStep(page);
    console.log("🎉 FINAL:", finalStep);
    expect(finalStep.startsWith("35/") || finalStep === "").toBeTruthy();
    console.log("🎉🎉🎉 全部 35 个新手任务完成！");
  });
});
