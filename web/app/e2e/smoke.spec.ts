import { expect, test } from "@playwright/test";

const e2eId = process.env.XKX_E2E_ID;
const e2ePassword = process.env.XKX_E2E_PASSWORD;
const register = process.env.XKX_E2E_REGISTER === "1";

function randomId() {
  const letters = "abcdefghijklmnopqrstuvwxyz";
  let id = "";
  for (let i = 0; i < 6; i++) id += letters[Math.floor(Math.random() * 26)];
  return id;
}

async function waitForInGame(page: import("@playwright/test").Page) {
  const deadline = Date.now() + 90_000;
  while (Date.now() < deadline) {
    const logTab = page.getByRole("tab", { name: "见闻" });
    if (await logTab.isVisible()) return;

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
  await page.getByRole("tab", { name: "场景" }).click();
  await expect(page.locator(".room-title")).toBeVisible();
}

async function openLogTab(page: import("@playwright/test").Page) {
  await page.getByRole("tab", { name: "见闻" }).click();
  await expect(page.locator(".log-panel")).toBeVisible();
}

/** 点出口九宫格上的方位并确认前往 */
async function goByExitLabel(
  page: import("@playwright/test").Page,
  label: string
) {
  await openSceneTab(page);
  const exact = new RegExp(`^\\s*${label}\\s*$`);
  const cell = page
    .locator(".exit-pad .cell.open")
    .filter({ has: page.locator(".d", { hasText: exact }) })
    .or(
      page
        .locator(".exit-extra .chip.exit")
        .filter({ has: page.locator(".dir", { hasText: exact }) })
    )
    .first();
  await expect(cell).toBeVisible({ timeout: 15_000 });
  await cell.click();
  await page.getByRole("button", { name: "前往" }).click();
  await expect(page.getByRole("tab", { name: "见闻" })).toHaveAttribute(
    "aria-selected",
    "true"
  );
  await expect(page.locator(".log-panel")).toBeVisible();
  await openSceneTab(page);
  await expect(page.locator(".room-title")).not.toHaveText("…", {
    timeout: 20_000,
  });
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
  await openLogTab(page);
  await expect
    .poll(
      async () => {
        const lines = await page.locator(".log p").allTextContents();
        return lines.slice(-12).join("\n");
      },
      { timeout }
    )
    .toMatch(pattern);
}

async function waitForLogPattern(
  page: import("@playwright/test").Page,
  pattern: RegExp,
  timeout = 20_000
) {
  await openLogTab(page);
  await expect
    .poll(
      async () => {
        const lines = await page.locator(".log p").allTextContents();
        return lines.slice(-24).join("\n");
      },
      { timeout }
    )
    .toMatch(pattern);
}

async function hasExit(
  page: import("@playwright/test").Page,
  label: string
): Promise<boolean> {
  await openSceneTab(page);
  const exact = new RegExp(`^\\s*${label}\\s*$`);
  const cell = page
    .locator(".exit-pad .cell.open")
    .filter({ has: page.locator(".d", { hasText: exact }) })
    .or(
      page
        .locator(".exit-extra .chip.exit")
        .filter({ has: page.locator(".dir", { hasText: exact }) })
    )
    .first();
  return cell.isVisible().catch(() => false);
}

async function sendSilentCmd(
  page: import("@playwright/test").Page,
  command: string
) {
  await page.evaluate((c) => {
    const w = window as unknown as { __xkxCmd?: (cmd: string) => void };
    if (typeof w.__xkxCmd !== "function") {
      throw new Error("__xkxCmd 未就绪");
    }
    w.__xkxCmd(c);
  }, command);
}

/** 锁沙滩：跟随张三/李四 → 主沙滩（有出口、无挂名处） */
async function completeIntroFollow(page: import("@playwright/test").Page) {
  await openSceneTab(page);
  await expect(page.locator(".room-title")).toHaveText(/沙滩/, {
    timeout: 90_000,
  });

  // 若已在主沙滩（有出口且有渔夫），跳过
  const alreadyMain =
    (await page.locator(".exit-pad .cell.open").count()) > 0 &&
    (await page.locator(".chip.npc").filter({ hasText: /渔夫/ }).count()) > 0;
  if (alreadyMain) return;

  const followChip = page
    .locator(".chip.action")
    .filter({ hasText: /跟随(张三|李四)/ })
    .first();
  await expect(followChip).toBeVisible({ timeout: 60_000 });
  const label = ((await followChip.textContent()) || "").trim();
  expect(label).toMatch(/跟随(张三|李四)/);
  await followChip.click();

  await expect
    .poll(
      async () => {
        await openSceneTab(page);
        const title = ((await page.locator(".room-title").textContent()) || "").trim();
        const exits = await page.locator(".exit-pad .cell.open").count();
        const logs = (await page.locator(".log p").allTextContents()).join("\n");
        if (/挂名/.test(title) || /挂名处/.test(logs)) return "register";
        if (exits > 0 && /沙滩/.test(title)) return "main";
        if (/先在岛上四处看看|熟悉一下环境/.test(logs) && exits > 0) return "main";
        return "wait";
      },
      { timeout: 60_000 }
    )
    .toBe("main");

  await openSceneTab(page);
  await expect(page.locator(".room-title")).toHaveText(/沙滩/);
  expect(((await page.locator(".room-title").textContent()) || "").trim()).not.toMatch(
    /挂名/
  );
  await expect(page.locator(".exit-pad .cell.open").first()).toBeVisible({
    timeout: 20_000,
  });
}

/** 场景人物 → 问 → 点选话题（完整打听列表在面板内，不依赖场景动作 chip） */
async function askNpcViaEntitySheet(
  page: import("@playwright/test").Page,
  npcName: RegExp | string,
  topic: string
) {
  await openSceneTab(page);
  await page.locator(".chip.npc").filter({ hasText: npcName }).click();
  await expect(page.getByRole("button", { name: "问", exact: true })).toBeVisible();
  await page.getByRole("button", { name: "问", exact: true }).click();
  const topicBtn = page.getByRole("button", { name: topic, exact: true });
  await expect(topicBtn).toBeVisible({ timeout: 15_000 });
  await topicBtn.click();
}

/** 获许可后：等船 → 上船 → 靠岸 → 下船到对岸 */
async function leaveIslandAfterPermit(page: import("@playwright/test").Page) {
  await openSceneTab(page);
  await expect(page.locator(".room-title")).toHaveText(/沙滩/, { timeout: 30_000 });

  // 进出沙滩可重触发召船；有许可时进房会 check_trigger
  let boarded = false;
  for (let i = 0; i < 6 && !boarded; i++) {
    if (await hasExit(page, "进")) {
      await goByExitLabel(page, "进");
      boarded = true;
      break;
    }
    // 北走再回沙滩，重新触发 init/check_trigger
    if (await hasExit(page, "北")) {
      await goByExitLabel(page, "北");
      if (await hasExit(page, "南")) await goByExitLabel(page, "南");
    }
    await sendSilentCmd(page, "look");
    await page.waitForTimeout(5_000);
    await openSceneTab(page);
  }
  expect(boarded).toBe(true);

  await waitForLogPattern(page, /船靠岸了|船身微微一震/, 60_000);
  await expect.poll(async () => hasExit(page, "出"), { timeout: 30_000 }).toBe(true);
  await goByExitLabel(page, "出");

  await openSceneTab(page);
  await expect(page.locator(".room-title")).toHaveText(/沙滩/, { timeout: 20_000 });
  await expect(
    page.locator(".chip.item, .chip.npc").filter({ hasText: /大车|车夫/ }).first()
  ).toBeVisible({ timeout: 20_000 });
}

/** 沙滩 → 瀑布（停留，不跳瀑；尽量快，避免引路使拖走） */
async function walkToWaterfall(page: import("@playwright/test").Page) {
  for (const label of ["北", "北", "北", "北"]) {
    await goByExitLabel(page, label);
  }
  await goByExitLabel(page, "北上");
  await openSceneTab(page);
  await expect(page.locator(".room-title")).toHaveText(/瀑布/, {
    timeout: 20_000,
  });
}

/** 沙滩 → 大山洞（含瀑布爬树/脱衣/穿衣/跳瀑；尽量快，避免引路使拖走） */
async function walkToDadongBoard(page: import("@playwright/test").Page) {
  await walkToWaterfall(page);

  // 尽快连点，缩短被引路使拖走的窗口；每步确认仍在瀑布
  const steps: [string, RegExp][] = [
    ["爬树取雨衣", /拿下一件雨衣|爬上树/],
    ["脱下布衣", /脱了下来/],
    ["穿上雨衣", /穿上一件油布雨衣|穿上.*雨衣/],
    ["跳进瀑布", /纵身跃|跳了进/],
  ];
  for (const [name, pattern] of steps) {
    await openSceneTab(page);
    if (!/瀑布/.test((await page.locator(".room-title").textContent()) || "")) {
      // 被 NPC 拖走时退回望海亭再上瀑布
      const south = page
        .locator(".exit-extra .chip.exit")
        .filter({ has: page.locator(".dir", { hasText: /^南下$/ }) });
      if (await south.first().isVisible().catch(() => false)) {
        await goByExitLabel(page, "南下");
      }
      await goByExitLabel(page, "北上");
    }
    await clickActionAndWaitLog(page, name, pattern, 10_000);
  }

  await openSceneTab(page);
  await expect(page.locator(".room-title")).toHaveText(/甬道/, {
    timeout: 20_000,
  });
  await goByExitLabel(page, "东");
  await goByExitLabel(page, "北");
  await expect(page.locator(".room-title")).toHaveText(/大山洞/, {
    timeout: 20_000,
  });
}

/** 沙滩或附近礁石找一件可拾取的地上物品 */
async function findGroundItemChip(page: import("@playwright/test").Page) {
  await openSceneTab(page);
  const chip = page.locator(".chip.item").first();
  if (await chip.isVisible().catch(() => false)) return chip;

  // 东 → 东 → 东北 到礁石（常有石头）
  for (const label of ["东", "东", "东北"]) {
    const has = page.locator(".exit-pad .cell.open").filter({ hasText: label });
    if ((await has.count()) === 0) break;
    await goByExitLabel(page, label);
    if (await chip.isVisible().catch(() => false)) return chip;
  }
  return chip;
}

async function loginAsNewbie(
  page: import("@playwright/test").Page,
  opts?: { id?: string; password?: string; asRegister?: boolean }
) {
  const asRegister = opts?.asRegister ?? (register || !e2eId);
  let id = opts?.id ?? (asRegister || !e2eId ? randomId() : e2eId!);
  const password =
    opts?.password ??
    (asRegister || !e2ePassword ? "Test1234" : e2ePassword!);

  const maxAttempts = asRegister ? 6 : 4;
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    if (asRegister && attempt > 0) id = randomId();
    await page.goto("/");

    await page.getByRole("tab", { name: asRegister ? "注册" : "登录" }).click();

    await page.getByLabel("账号（英文 ID）").fill(id);
    await page.getByLabel("密码", { exact: true }).fill(password);
    if (asRegister) {
      await page.getByLabel("中文名字").fill("测试");
    }
    await page
      .getByRole("button", { name: asRegister ? "注册并进入" : "进入游戏" })
      .click();

    try {
      await waitForInGame(page);
      return { id, password };
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      if (/过于频繁/.test(message) && attempt < maxAttempts - 1) {
        await page.waitForTimeout(30_000 * (attempt + 1));
        continue;
      }
      throw err;
    }
  }

  throw new Error("登录/注册失败：重试次数已用尽");
}

test("勾选记住账号后刷新可回填", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("tab", { name: "登录" })).toBeVisible({
    timeout: 15_000,
  });
  await page.getByRole("tab", { name: "登录" }).click();
  await page.getByLabel("账号（英文 ID）").fill("abcdef");
  await page.getByLabel("密码", { exact: true }).fill("Test1234");
  await page.getByLabel("记住账号和密码").check();
  // 提交会写入 localStorage；立刻离开，避免无效账号卡在登录连接
  await page.getByRole("button", { name: "进入游戏" }).click();
  await expect
    .poll(async () =>
      page.evaluate(() => localStorage.getItem("xkx.login.saved"))
    )
    .toContain("abcdef");

  await page.goto("/");
  await expect(page.getByLabel("账号（英文 ID）")).toHaveValue("abcdef");
  await expect(page.getByLabel("密码", { exact: true })).toHaveValue(
    "Test1234"
  );
  await expect(page.getByLabel("记住账号和密码")).toBeChecked();

  await page.getByLabel("记住账号和密码").uncheck();
  await expect
    .poll(async () =>
      page.evaluate(() => localStorage.getItem("xkx.login.saved"))
    )
    .toBeNull();

  await page.goto("/");
  await expect(page.getByLabel("账号（英文 ID）")).toHaveValue("");
  await expect(page.getByLabel("密码", { exact: true })).toHaveValue("");
  await expect(page.getByLabel("记住账号和密码")).not.toBeChecked();
});

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
    await loginAsNewbie(page, {
      id: sharedId,
      password: sharedPassword,
      asRegister: false,
    });

    await expect(page.getByRole("tab", { name: "见闻" })).toHaveAttribute(
      "aria-selected",
      "true"
    );
    await expect(page.locator(".log-panel")).toBeVisible();

    await openSceneTab(page);
    const roomTitle = page.locator(".room-title");
    await expect(roomTitle).not.toHaveText("…", { timeout: 90_000 });
    await expect(page.getByText(/新手引导/)).toHaveCount(0);

    const roomDesc = page.locator(".room-desc");
    await expect(roomDesc).toBeVisible();
    const desc = (await roomDesc.textContent()) || "";
    expect(desc).not.toMatch(/BIG5|Do you want to use|有任何意见|egroups\.com/i);

    await openLogTab(page);
    const logs = await page.locator(".log p").allTextContents();
    const logBlob = logs.join("\n");
    expect(logBlob).not.toMatch(/Do you want to use BIG5/i);
    expect(logBlob).not.toMatch(/@@JSON@@|@@ENDJSON@@/);

    // Optional move if exits exist
    await openSceneTab(page);
    const firstExit = page.locator(".exit-pad .cell.open").first();
    if ((await firstExit.count()) > 0) {
      const titleBefore = (await roomTitle.textContent())?.trim() ?? "";
      await firstExit.click();
      await page.getByRole("button", { name: "前往" }).click();
      await expect(async () => {
        await openSceneTab(page);
        const titleAfter = (await roomTitle.textContent())?.trim() ?? "";
        if (titleAfter !== titleBefore) return;
        await openLogTab(page);
        const logMoved = (
          await page.locator(".log p").allTextContents()
        ).some((line) => /向|走|来到|进入/.test(line));
        expect(logMoved).toBe(true);
      }).toPass({ timeout: 30_000 });
    }
  });

  test("见闻与场景为 Tab，默认见闻，互动后切回，无底栏操作", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await loginAsNewbie(page, {
      id: sharedId,
      password: sharedPassword,
      asRegister: false,
    });

    await expect(page.getByRole("tab", { name: "见闻" })).toHaveAttribute(
      "aria-selected",
      "true"
    );
    await expect(page.locator(".log-panel")).toBeVisible();
    await expect(page.locator(".scene-panel")).toHaveCount(0);
    await expect(page.locator(".dock")).toHaveCount(0);
    await expect(page.getByRole("button", { name: "操作" })).toHaveCount(0);

    const logHeight = await page.locator(".log-panel").evaluate((el) => el.clientHeight);
    expect(logHeight).toBeGreaterThan(280);

    await openSceneTab(page);
    await expect(page.getByRole("tab", { name: "场景" })).toHaveAttribute(
      "aria-selected",
      "true"
    );
    await expect(page.locator(".room-title")).toBeVisible();
    await expect(page.locator(".log-panel")).toHaveCount(0);

    const npc = page.locator(".chip.npc").first();
    if ((await npc.count()) > 0) {
      await npc.click();
      await expect(page.locator(".sheet")).toBeVisible();
      await page.locator(".sheet-acts button").first().click();
      await expect(page.getByRole("tab", { name: "见闻" })).toHaveAttribute(
        "aria-selected",
        "true"
      );
      await expect(page.locator(".log-panel")).toBeVisible();
    }
  });

  test("点出口先远眺邻房，确认前往后切见闻", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await loginAsNewbie(page, {
      id: sharedId,
      password: sharedPassword,
      asRegister: false,
    });
    await completeIntroFollow(page);

    await openSceneTab(page);
    const roomTitle = page.locator(".room-title");
    const titleBefore = ((await roomTitle.textContent()) || "").trim();
    expect(titleBefore.length).toBeGreaterThan(0);

    const firstExit = page.locator(".exit-pad .cell.open").first();
    await expect(firstExit).toBeVisible({ timeout: 15_000 });
    await firstExit.click();

    const sheet = page.locator(".sheet");
    await expect(sheet).toBeVisible();
    await expect(page.getByRole("button", { name: "前往" })).toBeVisible();

    await expect
      .poll(
        async () => {
          const preview = sheet.locator(".exit-preview, .doc-body");
          if (!(await preview.count())) return "";
          return ((await preview.first().textContent()) || "").trim();
        },
        { timeout: 15_000 }
      )
      .toMatch(/.{12,}/);

    const previewText = (
      (await sheet.locator(".exit-preview, .doc-body").first().textContent()) ||
      ""
    ).trim();
    expect(previewText).toMatch(/出口|这里|你|路|门|北|南|东|西|上|下/);

    await expect(roomTitle).toHaveText(titleBefore);
    await page.getByRole("button", { name: "前往" }).click();
    await expect(page.getByRole("tab", { name: "见闻" })).toHaveAttribute(
      "aria-selected",
      "true"
    );
    await expect(page.locator(".log-panel")).toBeVisible();
    await openSceneTab(page);
    await expect(roomTitle).not.toHaveText(titleBefore, { timeout: 20_000 });
  });

  test("角色卡片查询不进见闻，档案无横幅标题", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await loginAsNewbie(page, {
      id: sharedId,
      password: sharedPassword,
      asRegister: false,
    });

    await expect(page.getByRole("tab", { name: "见闻" })).toBeVisible({
      timeout: 90_000,
    });
    await page.locator(".hero-btn").click();

    await expect(page.getByRole("button", { name: "仪容" })).toBeVisible();
    await expect
      .poll(async () => {
        const look = page.locator(".panel.on .look-block");
        if (!(await look.count())) return "";
        return ((await look.first().textContent()) || "").trim();
      }, { timeout: 20_000 })
      .not.toMatch(/你要看什么/);

    await page.getByRole("button", { name: "档案" }).click();

    await expect
      .poll(async () => {
        const score = page.locator(".score-panel, .score-block");
        if (!(await score.count())) return "";
        return ((await score.first().textContent()) || "").trim();
      }, { timeout: 20_000 })
      .toMatch(/膂力|当前|经验|神/);

    const scoreText = (
      (await page.locator(".score-panel, .score-block").first().textContent()) ||
      ""
    ).trim();
    expect(scoreText).not.toMatch(/【侠客行个人档案】/);
    expect(scoreText).not.toMatch(/GB中文|BIG5中文/);
    expect(scoreText).not.toMatch(/■|□{3,}/);
    const logs = await page.locator(".log p").allTextContents();
    const logBlob = logs.join("\n");
    expect(logBlob).not.toMatch(/^>\s*(look me|hp|score|skills|inventory)\b/m);
    expect(logBlob).not.toMatch(/【侠客行个人档案】/);
    expect(logBlob).not.toMatch(/膂力[：:].*悟性/);
    expect(logBlob).not.toMatch(/你要看什么/);
    expect(logBlob).not.toMatch(/目前所学过的技能|目前并没有学会任何技能/);
    expect(logBlob).not.toMatch(/身上带[着著]下列|目前你身上没有任何东西/);
    expect(logBlob).not.toMatch(/^[┌└│]/m);
    expect(logBlob).not.toMatch(/初学乍练|粗通皮毛/);
    expect(logBlob).not.toMatch(/^【[^】]{1,12}】.+\([A-Za-z]/m);
  });

  test("pickup 拾起地上物品后场景列表不再显示该物", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await loginAsNewbie(page, { asRegister: true });
    await completeIntroFollow(page);

    await openSceneTab(page);
    await expect(page.locator(".room-title")).not.toHaveText("…", {
      timeout: 60_000,
    });

    const itemChip = await findGroundItemChip(page);
    await expect(itemChip).toBeVisible({ timeout: 30_000 });
    const itemName = ((await itemChip.textContent()) || "").trim();
    expect(itemName.length).toBeGreaterThan(0);
    expect(itemName).not.toMatch(/^\?+$/);

    const beforeSame = (
      await page.locator(".chip.item").allTextContents()
    ).filter((n) => n.trim() === itemName).length;
    const beforeTotal = await page.locator(".chip.item").count();

    await itemChip.click();
    await expect(page.getByRole("button", { name: "拿", exact: true })).toBeVisible();
    await page.getByRole("button", { name: "拿", exact: true }).click();

    await openSceneTab(page);
    await expect
      .poll(
        async () => {
          const total = await page.locator(".chip.item").count();
          const same = (
            await page.locator(".chip.item").allTextContents()
          ).filter((n) => n.trim() === itemName).length;
          return { total, same };
        },
        { timeout: 20_000 }
      )
      .toEqual({ total: beforeTotal - 1, same: beforeSame - 1 });
  });

  test("打开角色卡后仍可向渔夫打听侠客岛", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await loginAsNewbie(page, { asRegister: true });
    await completeIntroFollow(page);

    await openSceneTab(page);
    await expect(page.locator(".room-title")).toHaveText(/沙滩/, { timeout: 60_000 });

    await page.locator(".hero-btn").click();
    await expect(page.getByRole("button", { name: "档案" })).toBeVisible();
    await page.locator(".sheet .close").click();

    await askNpcViaEntitySheet(page, /渔夫/, "侠客岛");

    await expect(page.getByRole("tab", { name: "见闻" })).toHaveAttribute(
      "aria-selected",
      "true"
    );
    await expect
      .poll(async () => {
        const logs = await page.locator(".log p").allTextContents();
        return logs.join("\n");
      }, { timeout: 20_000 })
      .toMatch(/这里就是侠客岛|打听有关『侠客岛』/);
  });

  test("人物面板问可点选打听话题", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await loginAsNewbie(page, { asRegister: true });
    await completeIntroFollow(page);

    await openSceneTab(page);
    await expect(page.locator(".room-title")).toHaveText(/沙滩/, {
      timeout: 60_000,
    });
    await expect(page.locator(".chip.npc").filter({ hasText: /渔夫/ })).toBeVisible({
      timeout: 30_000,
    });
    // 无见闻提示时，场景动作区不应常驻打听 chip（完整列表在人物「问」）
    const logs = (await page.locator(".log p").allTextContents()).join("\n");
    if (!/\(ask fu about|ask fu about/.test(logs)) {
      await expect(
        page.locator(".chip.action").filter({ hasText: /向渔夫打听/ })
      ).toHaveCount(0);
    }

    await page.locator(".chip.npc").filter({ hasText: /渔夫/ }).click();
    await expect(page.getByRole("button", { name: "问", exact: true })).toBeVisible();
    await page.getByRole("button", { name: "问", exact: true }).click();

    await expect(page.getByRole("heading", { name: /打听「渔夫」/ })).toBeVisible();
    const topic侠客岛 = page.getByRole("button", { name: "侠客岛", exact: true });
    await expect(topic侠客岛).toBeVisible({ timeout: 15_000 });
    // LPC 列出的 inquiry 话题也应出现
    await expect(page.getByRole("button", { name: "船", exact: true })).toBeVisible({
      timeout: 15_000,
    });
    await topic侠客岛.click();

    await expect(page.getByRole("tab", { name: "见闻" })).toHaveAttribute(
      "aria-selected",
      "true"
    );
    await expect
      .poll(async () => {
        const replyLogs = await page.locator(".log p").allTextContents();
        return replyLogs.join("\n");
      }, { timeout: 20_000 })
      .toMatch(/这里就是侠客岛|打听有关『侠客岛』/);
  });

  test("见闻合并软换行且颜色跨行保留", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await loginAsNewbie(page, { asRegister: true });
    await completeIntroFollow(page);

    await openSceneTab(page);
    await expect(page.locator(".room-title")).toHaveText(/沙滩/, {
      timeout: 60_000,
    });

    await askNpcViaEntitySheet(page, /渔夫/, "离岛");

    await expect(page.getByRole("tab", { name: "见闻" })).toHaveAttribute(
      "aria-selected",
      "true"
    );

    await expect
      .poll(
        async () => {
          const paras = await page.locator(".log p").allTextContents();
          return paras.some(
            (p) => p.includes("等你") && p.includes("功夫有点小成")
          );
        },
        { timeout: 20_000 }
      )
      .toBe(true);

    await expect(
      page.locator(".log p .mud-fg-cyan").filter({ hasText: /功夫有点小成/ })
    ).toBeVisible({ timeout: 5_000 });
  });

  test("地图浮层显示侠客岛真图与世界总图", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await loginAsNewbie(page, { asRegister: true });
    await completeIntroFollow(page);

    await openSceneTab(page);
    await expect(page.locator(".room-title")).toHaveText(/沙滩/, { timeout: 60_000 });

    await page.getByRole("button", { name: "地图" }).click();
    await expect(page.locator(".map-sheet")).toBeVisible();
    await expect(page.locator(".map-ascii")).toContainText(/望海亭|迎宾厅/, {
      timeout: 10_000,
    });
    await expect(page.locator(".map-here")).toBeVisible();

    await page.getByRole("button", { name: "世界" }).click();
    await expect(page.locator(".map-ascii")).toContainText(/扬州城|侠客岛/, {
      timeout: 10_000,
    });
  });

  test("桌面端同样为见闻/场景 Tab", async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 720 });
    await loginAsNewbie(page, {
      id: sharedId,
      password: sharedPassword,
      asRegister: false,
    });

    await expect(page.getByRole("tab", { name: "见闻" })).toHaveAttribute(
      "aria-selected",
      "true"
    );
    await expect(page.locator(".log-panel")).toBeVisible();
    await openSceneTab(page);
    await expect(page.locator(".room-title")).toBeVisible();
    await expect(page.locator(".log-panel")).toHaveCount(0);
  });

  test("新注册须跟随张三或李四后进可走动沙滩且原密码可重登", async ({ page }) => {
    test.skip(!register && !!e2eId, "需要 XKX_E2E_REGISTER=1");

    const { id, password } = await loginAsNewbie(page, { asRegister: true });
    await completeIntroFollow(page);

    await openSceneTab(page);
    const roomTitle = page.locator(".room-title");
    await expect(roomTitle).toHaveText(/沙滩/, { timeout: 90_000 });
    expect(((await roomTitle.textContent()) || "").trim()).not.toMatch(/挂名/);

    await expect(page.locator(".exit-pad .cell.open").first()).toBeVisible({
      timeout: 60_000,
    });
    await expect(page.getByRole("button", { name: "挂名登记" })).toHaveCount(0);

    const itemNames = await page.locator(".chip.item").allTextContents();
    expect(itemNames.every((n) => !/^\?+$/.test(n.trim()))).toBe(true);
    await openLogTab(page);
    const logs = (await page.locator(".log p").allTextContents()).join("\n");
    expect(logs).not.toMatch(/^\?{6,}$/m);
    expect(logs).not.toMatch(/@@JSON@@|@@ENDJSON@@/);
    expect(logs).not.toMatch(/挂名处/);

    await page.goto("/");
    await loginAsNewbie(page, { id, password, asRegister: false });
    await openSceneTab(page);
    await expect(page.locator(".room-title")).not.toHaveText("…", {
      timeout: 90_000,
    });
    const err = page.locator(".login-form .err");
    if ((await err.count()) > 0) {
      await expect(err.first()).not.toContainText(/密码错误/);
    }
    await openLogTab(page);
    const postLogs = (await page.locator(".log p").allTextContents()).join(
      "\n"
    );
    expect(postLogs).not.toMatch(/密码错误/);
    expect(postLogs).not.toMatch(/@@JSON@@|@@ENDJSON@@/);
  });

  test("未获岛主许可不可离岛", async ({ page }) => {
    test.setTimeout(180_000);
    await page.setViewportSize({ width: 390, height: 844 });
    await loginAsNewbie(page, { asRegister: true });
    await completeIntroFollow(page);

    await askNpcViaEntitySheet(page, /渔夫/, "离岛");
    await waitForLogPattern(
      page,
      /要去中原可得要岛主同意|岛主就会让你离岛/,
      20_000
    );
    await openLogTab(page);
    const blob = (await page.locator(".log p").allTextContents()).join("\n");
    expect(blob).not.toMatch(/恭喜，恭喜。你可以回中原了/);

    await openSceneTab(page);
    expect(await hasExit(page, "进")).toBe(false);
  });

  test("获许可后可乘船离开侠客岛", async ({ page }) => {
    test.setTimeout(240_000);
    await page.setViewportSize({ width: 390, height: 844 });
    await loginAsNewbie(page, { asRegister: true });
    await completeIntroFollow(page);

    expect(await hasExit(page, "进")).toBe(false);

    await sendSilentCmd(page, "xkxe2e grantleave");
    await waitForLogPattern(page, /已准你离岛|你可以回中原了/, 15_000);

    await leaveIslandAfterPermit(page);
  });

  test("迎宾厅可见 longx 后续跟随引导", async ({ page }) => {
    test.setTimeout(180_000);
    await page.setViewportSize({ width: 390, height: 844 });
    await loginAsNewbie(page, { asRegister: true });
    await completeIntroFollow(page);

    for (const label of ["北", "北"]) {
      if (await hasExit(page, label)) await goByExitLabel(page, label);
    }
    await openSceneTab(page);
    for (let i = 0; i < 3; i++) {
      const title = ((await page.locator(".room-title").textContent()) || "").trim();
      if (/迎宾/.test(title)) break;
      if (await hasExit(page, "北")) await goByExitLabel(page, "北");
      else break;
    }

    await openSceneTab(page);
    const title = ((await page.locator(".room-title").textContent()) || "").trim();
    if (!/迎宾/.test(title)) {
      test.skip(true, `未到达迎宾厅（当前：${title}），跳过 longx 断言`);
      return;
    }

    const longFollow = page
      .locator(".chip.action")
      .filter({ hasText: /跟随龙/ })
      .first();
    await expect
      .poll(
        async () => {
          if (await longFollow.isVisible().catch(() => false)) return true;
          const logs = (await page.locator(".log p").allTextContents()).join("\n");
          return /follow\s+long/i.test(logs);
        },
        { timeout: 40_000 }
      )
      .toBe(true);
  });

  test("人物面板学可列出请教功夫或说明不可请教", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await loginAsNewbie(page, { asRegister: true });
    await completeIntroFollow(page);

    await openSceneTab(page);
    await expect(page.locator(".room-title")).toHaveText(/沙滩/, {
      timeout: 60_000,
    });
    await expect(page.locator(".chip.npc").filter({ hasText: /渔夫/ })).toBeVisible({
      timeout: 30_000,
    });

    await page.locator(".chip.npc").filter({ hasText: /渔夫/ }).click();
    await expect(page.getByRole("button", { name: "学", exact: true })).toBeVisible();
    await page.getByRole("button", { name: "学", exact: true }).click();

    await expect(page.getByRole("heading", { name: /向「渔夫」请教/ })).toBeVisible();
    // 非师徒：skills 拒绝后给出说明（渔夫也不会在见闻里教武）
    await expect
      .poll(
        async () =>
          (await page.locator(".sheet .doc-status").textContent()) || "",
        { timeout: 15_000 }
      )
      .toMatch(/没有师徒|没有可传授|正在列出/);
    await expect
      .poll(
        async () =>
          (await page.locator(".sheet .doc-status").textContent()) || "",
        { timeout: 15_000 }
      )
      .toMatch(/没有师徒|没有可传授/);
  });

  test("瀑布蓝衣弟子可学基本功夫", async ({ page }) => {
    test.setTimeout(180_000);
    await page.setViewportSize({ width: 390, height: 844 });
    await loginAsNewbie(page, { asRegister: true });
    await completeIntroFollow(page);

    await openSceneTab(page);
    await expect(page.locator(".room-title")).not.toHaveText("…", {
      timeout: 90_000,
    });

    try {
      await walkToWaterfall(page);
    } catch (err) {
      await openSceneTab(page).catch(() => undefined);
      const title = (
        (await page.locator(".room-title").textContent({ timeout: 5_000 }).catch(
          () => ""
        )) || ""
      ).trim();
      throw new Error(
        `未能到达瀑布（当前房间：${title || "未知"}）：${
          err instanceof Error ? err.message : String(err)
        }`
      );
    }

    await expect(page.locator(".chip.npc").filter({ hasText: /蓝衣弟子/ })).toBeVisible({
      timeout: 20_000,
    });

    // 见闻提示后：场景动作或人物「学」面板均可请教
    await expect
      .poll(
        async () => {
          await openSceneTab(page);
          const sceneLearn = await page
            .locator(".chip.action")
            .filter({ hasText: /向蓝衣弟子学|学掌法|学内功|学招架|学轻功/ })
            .count();
          if (sceneLearn > 0) return "scene";
          await page.locator(".chip.npc").filter({ hasText: /蓝衣弟子/ }).click();
          const learnBtn = page.getByRole("button", { name: "学", exact: true });
          if (await learnBtn.isVisible().catch(() => false)) {
            await page.locator(".sheet .close").click().catch(() => undefined);
            return "sheet";
          }
          await page.locator(".sheet .close").click().catch(() => undefined);
          return "";
        },
        { timeout: 30_000 }
      )
      .toMatch(/scene|sheet/);

    await openSceneTab(page);
    const sceneChip = page
      .locator(".chip.action")
      .filter({ hasText: /向蓝衣弟子学掌法|学掌法/ })
      .first();
    if (await sceneChip.isVisible().catch(() => false)) {
      await sceneChip.click();
    } else {
      await page.locator(".chip.npc").filter({ hasText: /蓝衣弟子/ }).click();
      await page.getByRole("button", { name: "学", exact: true }).click();
      await expect(page.getByRole("heading", { name: /向「蓝衣弟子」请教/ })).toBeVisible();
      await page.getByRole("button", { name: "掌法", exact: true }).click();
    }

    await expect(page.getByRole("tab", { name: "见闻" })).toHaveAttribute(
      "aria-selected",
      "true"
    );
    await expect
      .poll(async () => {
        const logs = await page.locator(".log p").allTextContents();
        return logs.join("\n");
      }, { timeout: 20_000 })
      .toMatch(/请教有关「|掌法|strike|你向/);
  });

  test("告示牌可浏览留言并可点读", async ({ page }) => {
    test.setTimeout(180_000);
    await page.setViewportSize({ width: 390, height: 844 });
    await loginAsNewbie(page, { asRegister: true });
    await completeIntroFollow(page);

    await openSceneTab(page);
    await expect(page.locator(".room-title")).not.toHaveText("…", {
      timeout: 90_000,
    });

    try {
      await walkToDadongBoard(page);
    } catch (err) {
      await openSceneTab(page).catch(() => undefined);
      const title = (
        (await page.locator(".room-title").textContent({ timeout: 5_000 }).catch(
          () => ""
        )) || ""
      ).trim();
      throw new Error(
        `未能到达大山洞告示牌（当前房间：${title || "未知"}）：${
          err instanceof Error ? err.message : String(err)
        }`
      );
    }

    const board = page.locator(".chip.item").filter({ hasText: /告示牌/ }).first();
    await expect(board).toBeVisible({ timeout: 15_000 });
    await board.click();
    await expect(page.locator(".sheet")).toBeVisible();
    await expect(
      page.locator(".sheet-acts button").filter({ hasText: "浏览留言" })
    ).toBeVisible();
    await page
      .locator(".sheet-acts button")
      .filter({ hasText: "浏览留言" })
      .click();

    // 长文留在实体面板，不切见闻、不出现「未完继续」
    await expect(page.locator(".sheet")).toBeVisible();
    await expect(page.locator(".sheet-top h3")).toHaveText("留言");
    await expect
      .poll(
        async () => (await page.locator(".sheet .doc-body").textContent()) || "",
        { timeout: 25_000 }
      )
      .toMatch(/留言|没有任何留言|告示牌/);
    await expect(page.locator(".sheet .doc-body")).not.toContainText("未完继续");

    const readBtn = page
      .locator(".sheet .help-topic")
      .filter({ hasText: /阅读/ })
      .first();
    if (await readBtn.isVisible().catch(() => false)) {
      await readBtn.click();
      await expect
        .poll(
          async () =>
            (await page.locator(".sheet .doc-body").textContent()) || "",
          { timeout: 20_000 }
        )
        .toMatch(/\[|留言|作者|——|---/);
      await expect(page.locator(".sheet .doc-body")).not.toContainText(
        "未完继续"
      );
    }
  });

  test("顶栏帮助可查阅主题且不进见闻", async ({ page }) => {
    test.setTimeout(120_000);
    await page.setViewportSize({ width: 390, height: 844 });
    await loginAsNewbie(page, { asRegister: true });
    await completeIntroFollow(page);

    await page.getByRole("button", { name: "帮助" }).click();
    await expect(page.locator(".sheet-top h3")).toHaveText("帮助");
    await page.locator(".help-topic").filter({ hasText: "留言板" }).click();
    await expect(page.locator(".sheet-top h3")).toHaveText("说明");
    await expect
      .poll(
        async () => (await page.locator(".sheet .doc-body").textContent()) || "",
        { timeout: 25_000 }
      )
      .toMatch(/留言|list|read|board/i);
    await expect(page.locator(".sheet .doc-body")).not.toContainText("未完继续");

    await page.locator(".sheet .close").click();
    await expect(page.locator(".overlay.open")).toHaveCount(0);

    await openLogTab(page);
    const logs = (await page.locator(".log p").allTextContents()).join("\n");
    expect(logs).not.toMatch(/未完继续/);
    expect(logs).not.toMatch(/^\s*>\s*help\s+board/m);
  });
});
