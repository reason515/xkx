import { expect, test } from "@playwright/test";
import { forceMobileMode } from "./helpers";

/** 宽屏默认可能进桌面工作台；smoke 全程锁定手机壳，避免误伤。 */
test.beforeEach(async ({ page }) => {
  await forceMobileMode(page);
});

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

/** 场景与见闻同页；保留函数名以便旧用例调用语义不变 */
async function openSceneTab(page: import("@playwright/test").Page) {
  await expect(page.locator(".scene-panel")).toBeVisible();
  await expect(page.locator(".room-title")).toBeVisible();
}

async function openLogTab(page: import("@playwright/test").Page) {
  await expect(page.locator(".log-panel")).toBeVisible();
}

async function openTopMenu(page: import("@playwright/test").Page) {
  const menu = page.getByRole("button", { name: "菜单" });
  await expect(menu).toBeVisible();
  if ((await menu.getAttribute("aria-expanded")) !== "true") {
    await menu.click();
  }
  await expect(page.locator(".menu-panel")).toBeVisible();
}

async function pickTopMenuItem(
  page: import("@playwright/test").Page,
  name: string | RegExp
) {
  await openTopMenu(page);
  await page.getByRole("menuitem", { name }).click();
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
        .locator(".exit-extra .cell.open")
        .filter({ has: page.locator(".d", { hasText: exact }) })
    )
    .first();
  await expect(cell).toBeVisible({ timeout: 15_000 });
  await cell.click();
  await page.getByRole("button", { name: "前往" }).click();
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
        .locator(".exit-extra .cell.open")
        .filter({ has: page.locator(".d", { hasText: exact }) })
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
  await expect(page.locator(".room-title")).not.toHaveText("…", {
    timeout: 90_000,
  });

  const roomTitle = async () =>
    ((await page.locator(".room-title").textContent()) || "").trim();

  const onMainBeach = async () => {
    const title = await roomTitle();
    return (
      /沙滩/.test(title) &&
      !/挂名/.test(title) &&
      (await page.locator(".exit-pad .cell.open").count()) > 0 &&
      (await page.locator(".chip.npc").filter({ hasText: /渔夫/ }).count()) > 0
    );
  };

  if (await onMainBeach()) return;

  // 共享账号可能被前序用例走到邻房（如海边）；优先往南折回沙滩
  for (let i = 0; i < 8; i++) {
    if (await onMainBeach()) return;
    const title = await roomTitle();
    if (/沙滩|挂名/.test(title)) break;
    if (!(await hasExit(page, "南"))) break;
    await goByExitLabel(page, "南");
  }

  if (await onMainBeach()) return;

  await expect(page.locator(".room-title")).toHaveText(/沙滩/, {
    timeout: 30_000,
  });

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
        const title = await roomTitle();
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
  expect((await roomTitle())).not.toMatch(/挂名/);
  await expect(page.locator(".exit-pad .cell.open").first()).toBeVisible({
    timeout: 20_000,
  });
}

/** 场景人物 → 打听 → 点选话题（完整打听列表在面板内，不依赖场景动作 chip） */
async function askNpcViaEntitySheet(
  page: import("@playwright/test").Page,
  npcName: RegExp | string,
  topic: string
) {
  await openSceneTab(page);
  await page.locator(".chip.npc").filter({ hasText: npcName }).click();
  await expect(
    page.getByRole("button", { name: "打听", exact: true })
  ).toBeVisible();
  await page.getByRole("button", { name: "打听", exact: true }).click();
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
  ];
  for (const [name, pattern] of steps) {
    await openSceneTab(page);
    if (!/瀑布/.test((await page.locator(".room-title").textContent()) || "")) {
      // 被 NPC 拖走时退回望海亭再上瀑布
      const south = page
        .locator(".exit-extra .cell.open")
        .filter({ has: page.locator(".d", { hasText: /^南下$/ }) });
      if (await south.first().isVisible().catch(() => false)) {
        await goByExitLabel(page, "南下");
      }
      await goByExitLabel(page, "北上");
    }
    await clickActionAndWaitLog(page, name, pattern, 10_000);
  }

  // 跳瀑：见闻可能被冲掉，以房间标题进甬道为准，必要时重试
  for (let attempt = 0; attempt < 3; attempt++) {
    await openSceneTab(page);
    const title = ((await page.locator(".room-title").textContent()) || "").trim();
    if (/甬道|大山洞/.test(title)) break;
    if (!/瀑布/.test(title)) {
      const south = page
        .locator(".exit-extra .cell.open")
        .filter({ has: page.locator(".d", { hasText: /^南下$/ }) });
      if (await south.first().isVisible().catch(() => false)) {
        await goByExitLabel(page, "南下");
      }
      await goByExitLabel(page, "北上");
      await clickActionAndWaitLog(
        page,
        "爬树取雨衣",
        /拿下一件雨衣|爬上树|贪心/,
        10_000
      ).catch(() => undefined);
      await clickActionAndWaitLog(
        page,
        "穿上雨衣",
        /穿上一件油布雨衣|穿上.*雨衣|已经穿/,
        10_000
      ).catch(() => undefined);
    }
    await clickActionChip(page, "跳进瀑布");
    await expect
      .poll(
        async () => {
          await openSceneTab(page);
          return ((await page.locator(".room-title").textContent()) || "").trim();
        },
        { timeout: 15_000 }
      )
      .toMatch(/甬道|大山洞/);
    break;
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
  // beforeAll 不跑 beforeEach；登录前务必锁定手机壳
  await forceMobileMode(page);
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

  test("落点沙滩显示情境提示且无新手引导字样", async ({ page }) => {
    test.setTimeout(180_000);
    await page.setViewportSize({ width: 390, height: 844 });
    await loginAsNewbie(page, { asRegister: true });

    await openSceneTab(page);
    await expect(page.locator(".room-title")).not.toHaveText("…", {
      timeout: 90_000,
    });
    await expect(page.getByText(/新手引导/)).toHaveCount(0);

    const tip = page.getByTestId("guide-tip");
    await expect(tip).toBeVisible({ timeout: 20_000 });
    await expect(tip).toContainText(/跟随迎宾|熟悉走动|离岛/);
    await expect(tip).not.toContainText(/新手引导/);

    await completeIntroFollow(page);
    await openSceneTab(page);
    await expect(page.getByText(/新手引导/)).toHaveCount(0);
    // 主沙滩应换成方向类提示，或已被关掉
    const after = page.getByTestId("guide-tip");
    if (await after.isVisible().catch(() => false)) {
      await expect(after).not.toContainText(/跟随迎宾弟子/);
      await expect(after).toContainText(/走动|打听|离岛|中原/);
    }
  });

  test("登录后可见场景且不含登录横幅", async ({ page }) => {
    await loginAsNewbie(page, {
      id: sharedId,
      password: sharedPassword,
      asRegister: false,
    });

    await expect(page.locator(".scene-panel")).toBeVisible();
    await expect(page.locator(".log-panel")).toBeVisible();

    const roomTitle = page.locator(".room-title");
    await expect(roomTitle).not.toHaveText("…", { timeout: 90_000 });
    await expect(page.getByText(/新手引导/)).toHaveCount(0);

    const roomDesc = page.locator(".room-desc");
    await expect(roomDesc).toBeVisible();
    const desc = (await roomDesc.textContent()) || "";
    expect(desc).not.toMatch(/BIG5|Do you want to use|有任何意见|egroups\.com/i);

    const logs = await page.locator(".log p").allTextContents();
    const logBlob = logs.join("\n");
    expect(logBlob).not.toMatch(/Do you want to use BIG5/i);
    expect(logBlob).not.toMatch(/@@JSON@@|@@ENDJSON@@/);

    // Optional move if exits exist
    const firstExit = page.locator(".exit-pad .cell.open").first();
    if ((await firstExit.count()) > 0) {
      const titleBefore = (await roomTitle.textContent())?.trim() ?? "";
      await firstExit.click();
      await page.getByRole("button", { name: "前往" }).click();
      await expect(async () => {
        const titleAfter = (await roomTitle.textContent())?.trim() ?? "";
        if (titleAfter !== titleBefore) return;
        const logMoved = (
          await page.locator(".log p").allTextContents()
        ).some((line) => /向|走|来到|进入/.test(line));
        expect(logMoved).toBe(true);
      }).toPass({ timeout: 30_000 });
    }
  });

  test("场景上见闻下同页可滚，地图在出口旁，无底栏操作", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await loginAsNewbie(page, {
      id: sharedId,
      password: sharedPassword,
      asRegister: false,
    });

    await expect(page.locator(".scene-panel")).toBeVisible();
    await expect(page.locator(".log-panel")).toBeVisible();
    await expect(page.locator(".game-tabs")).toHaveCount(0);
    await expect(page.getByRole("tab", { name: "见闻" })).toHaveCount(0);
    await expect(page.getByRole("tab", { name: "场景" })).toHaveCount(0);
    await expect(page.locator(".dock")).toHaveCount(0);
    await expect(page.getByRole("button", { name: "操作" })).toHaveCount(0);

    await expect(page.locator(".ctx-head .scene-map-btn")).toBeVisible();
    await expect(page.locator(".topbar .map-btn")).toHaveCount(0);
    await expect(page.getByRole("button", { name: "菜单" })).toBeVisible();
    await expect(page.getByRole("button", { name: "存档" })).toHaveCount(0);
    await openTopMenu(page);
    await expect(page.getByRole("menuitem", { name: "存档" })).toBeVisible();
    await expect(page.getByRole("menuitem", { name: "帮助" })).toBeVisible();
    await expect(page.getByRole("menuitem", { name: "退出" })).toBeVisible();
    await page.getByRole("button", { name: "菜单" }).click();
    await expect(page.locator(".menu-panel")).toHaveCount(0);

    const heights = await page.evaluate(() => {
      const scene = document.querySelector(".scene-panel") as HTMLElement | null;
      const log =
        (document.querySelector(".log-section") as HTMLElement | null) ||
        (document.querySelector(".log-panel") as HTMLElement | null);
      return {
        scene: scene?.clientHeight ?? 0,
        log: log?.clientHeight ?? 0,
      };
    });
    expect(heights.scene).toBeGreaterThan(120);
    expect(heights.log).toBeGreaterThan(120);
    const ratio = heights.scene / heights.log;
    // 场景略高于见闻（约 55:45 → ratio ≈ 1.22）
    expect(ratio).toBeGreaterThan(1.0);
    expect(ratio).toBeLessThan(1.5);

    await expect(page.getByRole("textbox", { name: "指令" })).toBeVisible();
    await expect(page.getByRole("button", { name: "发送" })).toBeVisible();

    const npc = page.locator(".chip.npc").first();
    if ((await npc.count()) > 0) {
      await npc.click();
      await expect(page.locator(".sheet")).toBeVisible();
      await page.locator(".sheet-acts button").first().click();
      await expect(page.locator(".log-panel")).toBeVisible();
      await expect(page.locator(".scene-panel")).toBeVisible();
    }
  });

  test("房间 look 刷新不进见闻，场景仍可互动，指令栏可发令", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await loginAsNewbie(page, {
      id: sharedId,
      password: sharedPassword,
      asRegister: false,
    });

    await expect(page.locator(".scene-panel")).toBeVisible({
      timeout: 90_000,
    });
    await expect(page.locator(".room-title")).not.toHaveText("…", {
      timeout: 30_000,
    });
    await expect(page.locator(".exit-pad .cell.open").first()).toBeVisible({
      timeout: 20_000,
    });

    await sendSilentCmd(page, "look");
    await page.waitForTimeout(800);

    const logs = await page.locator(".log p").allTextContents();
    const logBlob = logs.join("\n");
    expect(logBlob).not.toMatch(/这里明显的出口是/);
    expect(logBlob).not.toMatch(/这里没有任何明显的出路/);
    // scene still shows room, not empty
    const title = (
      (await page.locator(".room-title").textContent()) || ""
    ).trim();
    expect(title.length).toBeGreaterThan(0);
    await expect(page.locator(".chip.npc, .chip.item").first()).toBeVisible({
      timeout: 15_000,
    });

    const cmdInput = page.getByRole("textbox", { name: "指令" });
    await cmdInput.fill("say 测试");
    await page.getByRole("button", { name: "发送" }).click();
    await expect
      .poll(async () => {
        const texts = await page.locator(".log p").allTextContents();
        return texts.join("\n");
      }, { timeout: 15_000 })
      .toMatch(/^>\s*say\s+测试/m);
    // look soft-wrap leftovers must not linger in 见闻
    const after = (await page.locator(".log p").allTextContents()).join("\n");
    expect(after).not.toMatch(/踩在脚下软软的好不舒服/);
  });

  test("点出口先远眺邻房，确认前往后场景与见闻仍同页", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await loginAsNewbie(page, { asRegister: true });
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
    await expect(page.locator(".log-panel")).toBeVisible();
    await expect(page.locator(".scene-panel")).toBeVisible();
    await expect(roomTitle).not.toHaveText(titleBefore, { timeout: 20_000 });
    // 点出口走动：见闻不回显「> go north」一类指令
    const afterGo = (await page.locator(".log p").allTextContents()).join("\n");
    expect(afterGo).not.toMatch(/^>\s*go\b/m);
  });

  test("角色卡片查询不进见闻，档案无横幅标题", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await loginAsNewbie(page, {
      id: sharedId,
      password: sharedPassword,
      asRegister: false,
    });

    await expect(page.locator(".log-panel")).toBeVisible({
      timeout: 90_000,
    });
    await expect(page.locator(".hero-combat")).toHaveCount(0);

    await page.locator(".hero-btn").click();

    await expect(page.getByRole("button", { name: "仪容" })).toBeVisible();
    await expect
      .poll(async () => {
        const look = page.locator(".panel.on .look-block");
        if (!(await look.count())) return "";
        return ((await look.first().textContent()) || "").trim();
      }, { timeout: 20_000 })
      .not.toMatch(/你要看什么/);

    // 仪容 = look me：可有「身上带著」+ 装备；不得灌入随后 hp 的 精/气 行
    await expect
      .poll(async () => {
        const look = page.locator(".panel.on .look-block");
        if (!(await look.count())) return "";
        return ((await look.first().textContent()) || "").trim();
      }, { timeout: 20_000 })
      .toMatch(/你看起来|看起来约|身上带[着著]/);
    const lookText = (
      (await page.locator(".panel.on .look-block").first().textContent()) || ""
    ).trim();
    expect(lookText).not.toMatch(/精\s*[：:].*\d/);
    expect(lookText).not.toMatch(/精力\s*[：:].*\d/);
    expect(lookText).not.toMatch(/^\s*气\s*[：:]/m);
    expect(lookText).not.toMatch(/负重\s*\d+\s*%/);

    await page.getByRole("button", { name: "档案" }).click();

    await expect
      .poll(async () => {
        const score = page.locator(".score-panel, .score-block");
        if (!(await score.count())) return "";
        return ((await score.first().textContent()) || "").trim();
      }, { timeout: 20_000 })
      .toMatch(/膂力|当前|经验|神/);
    await expect
      .poll(async () => {
        const score = page.locator(".score-panel, .score-block");
        if (!(await score.count())) return "";
        return ((await score.first().textContent()) || "").trim();
      }, { timeout: 15_000 })
      .toMatch(/攻击|防御/);

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
    // 打开面板会静默跑 enable/prepare；对新手的空技能回复勿漏进见闻
    expect(logBlob).not.toMatch(/没有使用任何(?:有效)?特殊技能/);
    expect(logBlob).not.toMatch(/没有组合任何特殊拳术技能/);
    expect(logBlob).not.toMatch(/身上带[着著]下列|目前你身上没有任何东西/);
    expect(logBlob).not.toMatch(/^[┌└│]/m);
    expect(logBlob).not.toMatch(/初学乍练|粗通皮毛/);
    expect(logBlob).not.toMatch(/^【[^】]{1,12}】.+\([A-Za-z]/m);
    // look me 头衔短称 + 粘提示符的气血行，不得灌进见闻
    expect(logBlob).not.toMatch(/普通百姓\s+\S+\([A-Za-z]/);
    expect(logBlob).not.toMatch(/精\s*[：:]/);
    expect(logBlob).not.toMatch(/精力\s*[：:]/);
    expect(logBlob).not.toMatch(/^\s*>?\s*气\s*[：:]/m);

    await page.getByRole("button", { name: "武功" }).click();
    await expect
      .poll(async () => {
        const panel = page.locator(".panel.on");
        if (!(await panel.count())) return "";
        return ((await panel.first().textContent()) || "").trim();
      }, { timeout: 15_000 })
      .toMatch(/暂无武功数据|Lv\d+/);
    const skillText = (
      (await page.locator(".panel.on").first().textContent()) || ""
    ).trim();
    expect(skillText).not.toMatch(/指令格式|这个指令可以让你/);
    expect(skillText).toMatch(/已激发/);
    if (/Lv\d+/.test(skillText)) {
      expect(skillText).toMatch(
        /初学乍练|粗通皮毛|半生不熟|马马虎虎|驾轻就熟|出类拔萃|神乎其技|出神入化|登峰造极|一代宗师|深不可测|新学乍用|初窥门径|略知一二|已有小成|心领神会|了然|豁然贯通|举世无双|震古铄今/
      );
      expect(skillText).toMatch(/\d+\/\d+/);
      expect(skillText).not.toMatch(/还差|升级/);
      const row = page.locator(".skill-row-btn").first();
      if (await row.count()) {
        await row.click();
        const actions = page.locator(".skill-actions");
        await expect(actions).toBeVisible();
        const actText = ((await actions.textContent()) || "").trim();
        expect(actText).toMatch(/无需激发|激发为|卸下|准备出招|知识技能/);
      }
    }

    await page.getByRole("button", { name: "行囊" }).click();
    await expect
      .poll(async () => {
        const panel = page.locator(".panel.on");
        if (!(await panel.count())) return "";
        return ((await panel.first().textContent()) || "").trim();
      }, { timeout: 15_000 })
      .toMatch(/行囊空空如也|布衣|□/);
    const bagText = (
      (await page.locator(".panel.on").first().textContent()) || ""
    ).trim();
    expect(bagText).not.toMatch(/指令格式|可列出你|此指令可以/);
    expect(bagText).not.toMatch(/主题目录|新手指南|常用指令/);

    const clothBtn = page
      .locator(".bag-item-btn")
      .filter({ hasText: /布衣/ })
      .first();
    if (await clothBtn.count()) {
      const wasEquipped = /□/.test((await clothBtn.textContent()) || "");
      await clothBtn.click();
      const actions = page.locator(".bag-item.open .skill-actions");
      await expect(actions).toBeVisible();
      const actText = ((await actions.textContent()) || "").trim();
      expect(actText).toMatch(/脱下|穿上/);
      const toggleLabel = /脱下/.test(actText) ? "脱下" : "穿上";
      await page
        .locator(".bag-item.open .skill-act")
        .filter({ hasText: toggleLabel })
        .click();
      await expect
        .poll(async () => {
          const btn = page
            .locator(".bag-item-btn")
            .filter({ hasText: /布衣/ })
            .first();
          if (!(await btn.count())) return "";
          const t = ((await btn.textContent()) || "").trim();
          const eq = /□/.test(t);
          const open = page.locator(".bag-item.open .skill-actions");
          const acts = (await open.count())
            ? ((await open.textContent()) || "").trim()
            : "";
          return `${eq ? "eq" : "off"}|${acts}`;
        }, { timeout: 15_000 })
        .toMatch(wasEquipped ? /^off\|.*穿上/ : /^eq\|.*脱下/);
    }
  });

  test("同类型护具自动卸旧再穿新", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await loginAsNewbie(page, {
      id: sharedId,
      password: sharedPassword,
      asRegister: false,
    });

    await expect(page.locator(".log-panel")).toBeVisible({
      timeout: 90_000,
    });

    await sendSilentCmd(page, "xkxe2e givearmor");
    await page.locator(".hero-btn").click();
    await page.getByRole("button", { name: "行囊" }).click();
    await expect
      .poll(async () => {
        const panel = page.locator(".panel.on");
        if (!(await panel.count())) return "";
        return ((await panel.first().textContent()) || "").trim();
      }, { timeout: 15_000 })
      .toMatch(/油布雨衣|雨衣/);

    const rainBtn = page
      .locator(".bag-item-btn")
      .filter({ hasText: /油布雨衣|雨衣/ })
      .first();
    await expect(rainBtn).toBeVisible();
    await rainBtn.click();
    await page
      .locator(".bag-item.open .skill-act")
      .filter({ hasText: "穿上" })
      .click();

    await expect
      .poll(async () => {
        const rain = page
          .locator(".bag-item-btn")
          .filter({ hasText: /油布雨衣|雨衣/ })
          .first();
        const cloth = page
          .locator(".bag-item-btn")
          .filter({ hasText: /布衣/ })
          .first();
        if (!(await rain.count()) || !(await cloth.count())) return "";
        const rainEq = /□/.test((await rain.textContent()) || "");
        const clothEq = /□/.test((await cloth.textContent()) || "");
        return `${rainEq ? "rain-on" : "rain-off"}|${clothEq ? "cloth-on" : "cloth-off"}`;
      }, { timeout: 20_000 })
      .toBe("rain-on|cloth-off");

    await expect
      .poll(async () => ((await page.locator(".toast").textContent()) || "").trim(), {
        timeout: 10_000,
      })
      .toMatch(/已穿戴|已脱下/);
  });

  test("穿脱装备实时刷新行囊与档案攻防", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await loginAsNewbie(page, {
      id: sharedId,
      password: sharedPassword,
      asRegister: false,
    });

    await expect(page.locator(".log-panel")).toBeVisible({
      timeout: 90_000,
    });
    await expect(page.locator(".hero-combat")).toHaveCount(0);

    await page.locator(".hero-btn").click();
    await page.getByRole("button", { name: "档案" }).click();
    await expect
      .poll(async () => {
        const score = page.locator(".score-panel, .score-block");
        if (!(await score.count())) return "";
        return ((await score.first().textContent()) || "").trim();
      }, { timeout: 20_000 })
      .toMatch(/攻击|防御/);

    await page.getByRole("button", { name: "行囊" }).click();
    await expect
      .poll(async () => {
        const panel = page.locator(".panel.on");
        if (!(await panel.count())) return "";
        return ((await panel.first().textContent()) || "").trim();
      }, { timeout: 15_000 })
      .toMatch(/布衣/);

    const clothBtn = page
      .locator(".bag-item-btn")
      .filter({ hasText: /布衣/ })
      .first();
    await expect(clothBtn).toBeVisible();
    const equippedBefore = /□/.test((await clothBtn.textContent()) || "");
    await clothBtn.click();
    const act = page.locator(".bag-item.open .skill-act").filter({
      hasText: equippedBefore ? "脱下" : "穿上",
    });
    await expect(act).toBeVisible();
    await act.click();

    await expect
      .poll(async () => {
        const btn = page
          .locator(".bag-item-btn")
          .filter({ hasText: /布衣/ })
          .first();
        return /□/.test((await btn.textContent()) || "") ? "eq" : "off";
      }, { timeout: 15_000 })
      .toBe(equippedBefore ? "off" : "eq");

    await page.getByRole("button", { name: "档案" }).click();
    await expect
      .poll(async () => {
        const score = page.locator(".score-panel, .score-block");
        if (!(await score.count())) return "";
        return ((await score.first().textContent()) || "").trim();
      }, { timeout: 15_000 })
      .toMatch(/攻击|防御/);
    await expect(page.locator(".hero-combat")).toHaveCount(0);
  });

  test("查阅帮助后行囊不混入说明文案", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await loginAsNewbie(page, {
      id: sharedId,
      password: sharedPassword,
      asRegister: false,
    });

    await expect(page.locator(".log-panel")).toBeVisible({
      timeout: 90_000,
    });

    await pickTopMenuItem(page, "帮助");
    await page.getByRole("button", { name: "常用指令" }).click();
    await expect
      .poll(async () => {
        const body = page.locator(".doc-body");
        if (!(await body.count())) return "";
        return ((await body.first().textContent()) || "").trim();
      }, { timeout: 20_000 })
      .not.toEqual("");

    await page.locator(".sheet .close").click();
    await page.locator(".hero-btn").click();
    await page.getByRole("button", { name: "行囊" }).click();

    await expect
      .poll(async () => {
        const panel = page.locator(".panel.on");
        if (!(await panel.count())) return "";
        return ((await panel.first().textContent()) || "").trim();
      }, { timeout: 15_000 })
      .toMatch(/行囊空空如也|布衣|□/);

    const bagText = (
      (await page.locator(".panel.on").first().textContent()) || ""
    ).trim();
    expect(bagText).not.toMatch(/指令格式|可列出你|此指令可以|主题目录|新手指南/);
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

  test("望海亭嵌套景物可查看并呈现情境动作", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await loginAsNewbie(page, { asRegister: true });
    await completeIntroFollow(page);

    for (const label of ["北", "北", "北", "北"]) {
      await goByExitLabel(page, label);
    }
    await openSceneTab(page);
    await expect(page.locator(".room-title")).toHaveText(/望海亭/, {
      timeout: 20_000,
    });

    const fish = page.locator(".chip.item").filter({ hasText: "鱼儿" });
    await expect(fish).toBeVisible();
    await fish.click();
    await expect(page.getByRole("button", { name: "查看", exact: true })).toBeVisible();
    await expect(page.getByRole("button", { name: "拿", exact: true })).toHaveCount(0);
    await page.locator(".sheet .close").click();

    await clickActionAndWaitLog(
      page,
      "搬动大石",
      /发现一根鱼杆|没有发现/,
      10_000
    );
    await openSceneTab(page);
    await expect(page.getByRole("button", { name: "垂钓", exact: true })).toBeVisible();
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

    await expect(page.locator(".log-panel")).toBeVisible();
    await expect
      .poll(async () => {
        const logs = await page.locator(".log p").allTextContents();
        return logs.join("\n");
      }, { timeout: 20_000 })
      .toMatch(/这里就是侠客岛|打听有关『侠客岛』/);
  });

  test("人物面板分组展示通用互动并可点选打听话题", async ({ page }) => {
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
    // 打听只走人物面板；场景动作区不展示 ask chip
    await expect(
      page.locator(".chip.action").filter({ hasText: /向渔夫打听/ })
    ).toHaveCount(0);
    // 渔夫台词「四处看看(look)…捡起来(get)」不得生成 拿起look / 环视 等误按钮
    await expect(
      page.locator(".chip.action").filter({ hasText: /拿起|look/i })
    ).toHaveCount(0);

    await page.locator(".chip.npc").filter({ hasText: /渔夫/ }).click();
    await expect(page.getByRole("heading", { name: "常用" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "往来" })).toBeVisible();
    await expect(page.getByRole("button", { name: "查看", exact: true })).toBeVisible();
    await expect(page.getByRole("button", { name: "打听", exact: true })).toBeVisible();
    await expect(page.getByRole("button", { name: "请教", exact: true })).toBeVisible();
    await expect(page.getByRole("button", { name: "跟随", exact: true })).toBeVisible();
    await expect(page.getByRole("button", { name: "给予", exact: true })).toBeVisible();
    await expect(page.getByText("交手", { exact: true })).toBeVisible();
    // 渔夫没有 family，不应误导为可拜师
    await expect(page.getByRole("button", { name: "拜师", exact: true })).toHaveCount(0);
    await page.getByRole("button", { name: "打听", exact: true }).click();

    await expect(page.getByRole("heading", { name: /打听「渔夫」/ })).toBeVisible();
    const topic侠客岛 = page.getByRole("button", { name: "侠客岛", exact: true });
    await expect(topic侠客岛).toBeVisible({ timeout: 15_000 });
    // LPC 列出的 inquiry 话题也应出现
    await expect(page.getByRole("button", { name: "船", exact: true })).toBeVisible({
      timeout: 15_000,
    });
    await topic侠客岛.click();

    await expect(page.locator(".log-panel")).toBeVisible();
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

    await expect(page.locator(".log-panel")).toBeVisible();

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
    // 主沙滩在图南侧（迎宾厅以南），不应高亮北岸第一处沙滩
    const mapHtml = (await page.locator(".map-ascii").innerHTML()) || "";
    const markAt = mapHtml.indexOf("map-here");
    const hallAt = mapHtml.indexOf("迎宾厅");
    expect(markAt).toBeGreaterThan(-1);
    expect(hallAt).toBeGreaterThan(-1);
    expect(markAt).toBeGreaterThan(hallAt);

    await page.getByRole("button", { name: "世界" }).click();
    await expect(page.locator(".map-ascii")).toContainText(/扬州城|侠客岛/, {
      timeout: 10_000,
    });
  });

  test("小路黄衣大汉打听防具给背心且不说无可奉告", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await loginAsNewbie(page, { asRegister: true });
    await completeIntroFollow(page);

    await openSceneTab(page);
    await expect(page.locator(".room-title")).toHaveText(/沙滩/, {
      timeout: 60_000,
    });
    // 沙滩 → 小路 → 迎宾厅 → 小路（黄衣大汉）
    await goByExitLabel(page, "北");
    await goByExitLabel(page, "北");
    await goByExitLabel(page, "北");
    await expect(page.locator(".room-title")).toHaveText(/小路/, {
      timeout: 20_000,
    });
    await expect(
      page.locator(".chip.npc").filter({ hasText: /黄衣大汉/ })
    ).toBeVisible({ timeout: 20_000 });

    await askNpcViaEntitySheet(page, /黄衣大汉/, "防具");

    await expect
      .poll(
        async () => (await page.locator(".log p").allTextContents()).join("\n"),
        { timeout: 20_000 }
      )
      .toMatch(/皮背心|铁背心|背心/);
    const logs = (await page.locator(".log p").allTextContents()).join("\n");
    expect(logs).not.toMatch(/无可奉告/);
  });

  test("小路地图标记不与礁石旁小路混淆", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await loginAsNewbie(page, { asRegister: true });
    await completeIntroFollow(page);

    await openSceneTab(page);
    await expect(page.locator(".room-title")).toHaveText(/沙滩/, {
      timeout: 60_000,
    });

    // 沙滩北 → 迎宾厅南「小路」(xiaolu)，图上应高亮第三处小路（迎宾厅以南）
    await goByExitLabel(page, "北");
    await expect(page.locator(".room-title")).toHaveText(/小路/, {
      timeout: 20_000,
    });

    await page.getByRole("button", { name: "地图" }).click();
    await expect(page.locator(".map-sheet")).toBeVisible();
    await expect(page.locator(".map-here")).toBeVisible({ timeout: 10_000 });
    const mapHtml = (await page.locator(".map-ascii").innerHTML()) || "";
    const markAt = mapHtml.indexOf("map-here");
    const hallAt = mapHtml.indexOf("迎宾厅");
    expect(markAt).toBeGreaterThan(-1);
    expect(hallAt).toBeGreaterThan(-1);
    // 迎宾厅南小路：标记在迎宾厅之后，而非礁石旁第一处小路
    expect(markAt).toBeGreaterThan(hallAt);
  });

  test("宽屏下同样场景上见闻下同页", async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 720 });
    await loginAsNewbie(page, {
      id: sharedId,
      password: sharedPassword,
      asRegister: false,
    });

    await expect(page.locator(".scene-panel")).toBeVisible();
    await expect(page.locator(".log-panel")).toBeVisible();
    await expect(page.locator(".room-title")).toBeVisible();
    await expect(page.locator(".ctx-head .scene-map-btn")).toBeVisible();
  });

  test("顶栏菜单存档可保存并提示成功", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await loginAsNewbie(page, {
      id: sharedId,
      password: sharedPassword,
      asRegister: false,
    });

    await expect(page.getByRole("button", { name: "菜单" })).toBeVisible({
      timeout: 90_000,
    });
    await pickTopMenuItem(page, "存档");
    await expect
      .poll(async () => {
        const toast = ((await page.locator(".toast").textContent()) || "").trim();
        const logs = (await page.locator(".log p").allTextContents()).join("\n");
        return `${toast}\n${logs}`;
      }, { timeout: 15_000 })
      .toMatch(/已存档|档案储存完毕/);
  });

  test("顶栏修炼可启动吐纳助手并显示状态后停止", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await loginAsNewbie(page, { asRegister: true });
    await completeIntroFollow(page);

    await openSceneTab(page);
    // 沙滩北小路：可吐纳（非 sleep_room / no_fight）
    await goByExitLabel(page, "北");
    await expect(page.locator(".room-title")).toHaveText(/小路/, {
      timeout: 20_000,
    });

    await pickTopMenuItem(page, "修炼");
    await expect(page.getByRole("heading", { name: "修炼" })).toBeVisible();
    await page.getByRole("button", { name: /练功/ }).click();
    await expect(page.getByText(/暂无已激发且可选择的功夫/)).toBeVisible();
    await expect(page.getByRole("button", { name: "开始", exact: true })).toBeDisabled();
    await page.getByRole("button", { name: /吐纳/ }).click();
    await page.getByRole("radio", { name: "按次数" }).click();
    await expect(page.getByLabel("修炼次数")).toHaveValue("1");
    await page.getByRole("radio", { name: "精力接近满" }).click();
    await page.getByRole("button", { name: "开始", exact: true }).click();

    await expect(page.getByRole("button", { name: "停止", exact: true })).toBeVisible({
      timeout: 10_000,
    });
    await expect
      .poll(async () => {
        const status = (
          (await page.locator(".train-status").textContent()) || ""
        ).trim();
        const toast = ((await page.locator(".toast").textContent()) || "").trim();
        return `${status}\n${toast}`;
      }, { timeout: 15_000 })
      .toMatch(/修炼助手|调息中|进行中|挂机助手/);

    await page.getByRole("button", { name: "停止", exact: true }).click();
    await expect(page.getByRole("button", { name: "开始", exact: true })).toBeVisible({
      timeout: 10_000,
    });
  });

  test("顶栏发言支持公开说话与指定身边人物耳语", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await loginAsNewbie(page, { asRegister: true });
    await completeIntroFollow(page);

    const publicMessage = `诸位好${Date.now()}`;
    await pickTopMenuItem(page, "发言");
    await expect(page.getByRole("heading", { name: "发言" })).toBeVisible();
    await page.getByLabel("内容").fill(publicMessage);
    await page.getByRole("button", { name: "说出", exact: true }).click();

    await expect
      .poll(
        async () => (await page.locator(".log p").allTextContents()).join("\n"),
        { timeout: 15_000 }
      )
      .toContain(`你说道：${publicMessage}`);

    const whisperMessage = `借一步说话${Date.now()}`;
    await pickTopMenuItem(page, "发言");
    await page.getByRole("radio", { name: "耳语" }).click();
    const fisherman = page
      .locator(".speech-targets [role='option']")
      .filter({ hasText: /渔夫/ });
    await expect(fisherman).toBeVisible();
    await fisherman.click();
    await page.getByLabel("内容").fill(whisperMessage);
    await page.getByRole("button", { name: "说出", exact: true }).click();

    await expect
      .poll(
        async () => (await page.locator(".log p").allTextContents()).join("\n"),
        { timeout: 15_000 }
      )
      .toContain(`你在渔夫的耳边悄声说道：${whisperMessage}`);
    const logs = (await page.locator(".log p").allTextContents()).join("\n");
    expect(logs).not.toMatch(/>\s*(?:say|whisper)\b/);
  });

  test("顶栏菜单退出后回到登录页", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await loginAsNewbie(page, { asRegister: true });
    await completeIntroFollow(page);

    await expect(page.getByRole("button", { name: "菜单" })).toBeVisible({
      timeout: 90_000,
    });
    await pickTopMenuItem(page, "退出");
    await expect
      .poll(async () => ((await page.locator(".toast").textContent()) || "").trim(), {
        timeout: 15_000,
      })
      .toMatch(/已退出|正在退出/);
    await expect(page.getByRole("tab", { name: "登录" })).toBeVisible({
      timeout: 60_000,
    });
    await expect(page.locator(".scene-panel")).toHaveCount(0);
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

  test("迎宾厅不跟随则不被强制拖走", async ({ page }) => {
    test.setTimeout(180_000);
    await page.setViewportSize({ width: 390, height: 844 });
    await loginAsNewbie(page, { asRegister: true });
    await completeIntroFollow(page);

    for (const label of ["北", "北"]) {
      if (await hasExit(page, label)) await goByExitLabel(page, label);
    }
    await openSceneTab(page);
    for (let i = 0; i < 3; i++) {
      const title = (
        (await page.locator(".room-title").textContent()) || ""
      ).trim();
      if (/迎宾/.test(title)) break;
      if (await hasExit(page, "北")) await goByExitLabel(page, "北");
      else break;
    }

    await openSceneTab(page);
    const title = (
      (await page.locator(".room-title").textContent()) || ""
    ).trim();
    if (!/迎宾/.test(title)) {
      test.skip(true, `未到达迎宾厅（当前：${title}），跳过强制拖走断言`);
      return;
    }

    // 等待超过原强制拖走窗口（约 20+10+10+10s），期间绝不点跟随
    await page.waitForTimeout(55_000);
    await openSceneTab(page);
    const after = (
      (await page.locator(".room-title").textContent()) || ""
    ).trim();
    expect(after).not.toMatch(/瀑布|大山洞|甬道|石门/);
    expect(after).toMatch(/迎宾|小路|沙滩|望海/);

    const logs = (await page.locator(".log p").allTextContents()).join("\n");
    expect(logs).not.toMatch(/拉起你的手|还乱跑，来吧/);
  });

  test("人物面板请教可列出功夫或说明不可请教", async ({ page }) => {
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
    await expect(page.getByRole("button", { name: "请教", exact: true })).toBeVisible();
    await page.getByRole("button", { name: "请教", exact: true }).click();

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
    // 景物 chip 应为「瀑布 / 大树」，勿把「迎面是一道瀑布」整段当地物名
    await expect(
      page.locator(".chip.item").filter({ hasText: /^瀑布$/ })
    ).toBeVisible();
    await expect(
      page.locator(".chip.item").filter({ hasText: /是一道瀑布/ })
    ).toHaveCount(0);

    // 见闻学武提示只进人物「请教」面板，不上场景动作区
    await expect
      .poll(
        async () => {
          await openSceneTab(page);
          const logs = (await page.locator(".log p").allTextContents()).join("\n");
          if (!/可向我学|学掌法|strike|force/.test(logs)) return "wait";
          const sceneLearn = await page
            .locator(".chip.action")
            .filter({ hasText: /向蓝衣弟子学|学掌法|学内功|学招架|学轻功/ })
            .count();
          if (sceneLearn > 0) return "scene";
          return "ready";
        },
        { timeout: 30_000 }
      )
      .toBe("ready");

    await expect(
      page
        .locator(".chip.action")
        .filter({ hasText: /向蓝衣弟子学|学掌法|学内功|学招架|学轻功/ })
    ).toHaveCount(0);

    await page.locator(".chip.npc").filter({ hasText: /蓝衣弟子/ }).click();
    await page.getByRole("button", { name: "请教", exact: true }).click();
    await expect(page.getByRole("heading", { name: /向「蓝衣弟子」请教/ })).toBeVisible();
    await expect(page.getByRole("button", { name: "掌法", exact: true })).toBeVisible({
      timeout: 15_000,
    });
    await page.getByRole("button", { name: "掌法", exact: true }).click();
    const learnCount = page.getByLabel("学习次数");
    await expect(learnCount).toHaveValue("1");
    await expect(
      page.getByRole("radio", { name: "学到潜能耗尽" })
    ).toBeVisible();
    await page.getByRole("button", { name: "开始学习", exact: true }).click();

    await expect(page.locator(".log-panel")).toBeVisible();
    await expect
      .poll(async () => {
        const logs = await page.locator(".log p").allTextContents();
        return logs.join("\n");
      }, { timeout: 20_000 })
      .toMatch(/请教有关「|掌法|strike|你向/);
  });

  test("行囊腊八粥可看可吃", async ({ page }) => {
    test.setTimeout(180_000);
    await page.setViewportSize({ width: 390, height: 844 });
    await loginAsNewbie(page, { asRegister: true });
    await completeIntroFollow(page);

    try {
      await walkToDadongBoard(page);
    } catch (err) {
      const title = (
        (await page.locator(".room-title").textContent({ timeout: 5_000 }).catch(
          () => ""
        )) || ""
      ).trim();
      throw new Error(
        `未能到达大山洞（当前房间：${title || "未知"}）：${
          err instanceof Error ? err.message : String(err)
        }`
      );
    }

    await askNpcViaEntitySheet(page, /厮仆/, "腊八粥");
    await waitForLogPattern(page, /腊八粥|给你|端起/, 20_000);

    await page.locator(".hero-btn").click();
    await page.getByRole("button", { name: "行囊" }).click();
    const porridge = page
      .locator(".bag-item-btn")
      .filter({ hasText: /腊八粥/ })
      .first();
    await expect(porridge).toBeVisible({ timeout: 20_000 });
    await porridge.click();
    const acts = page.locator(".bag-item.open .skill-act");
    await expect(acts.filter({ hasText: "看" })).toBeVisible();
    await expect(acts.filter({ hasText: "吃" })).toBeVisible();
    await expect(acts.filter({ hasText: "丢下" })).toBeVisible();
    await acts.filter({ hasText: "吃" }).click();
    await expect
      .poll(async () => {
        const logs = (await page.locator(".log p").allTextContents()).join("\n");
        return logs;
      }, { timeout: 15_000 })
      .toMatch(/喝下|吃|粥/);
  });

  test("大山洞打听岛主后场景出现甬道出口", async ({ page }) => {
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
        `未能到达大山洞（当前房间：${title || "未知"}）：${
          err instanceof Error ? err.message : String(err)
        }`
      );
    }

    await expect(page.locator(".room-title")).toHaveText(/大山洞/);
    await expect(page.locator(".chip.npc").filter({ hasText: /厮仆/ })).toBeVisible({
      timeout: 20_000,
    });

    await askNpcViaEntitySheet(page, /厮仆/, "岛主");
    await waitForLogPattern(page, /甬道|石室中苦思|进去找他们/, 20_000);

    await expect
      .poll(async () => hasExit(page, "进"), { timeout: 25_000 })
      .toBe(true);
  });

  test("石门房间出现打开石门动作并可进入石洞", async ({ page }) => {
    test.setTimeout(180_000);
    await page.setViewportSize({ width: 390, height: 844 });
    await loginAsNewbie(page, { asRegister: true });
    await completeIntroFollow(page);

    await openSceneTab(page);
    await expect(page.locator(".room-title")).not.toHaveText("…", {
      timeout: 90_000,
    });

    await walkToDadongBoard(page);
    await expect(page.locator(".room-title")).toHaveText(/大山洞/);
    await askNpcViaEntitySheet(page, /厮仆/, "岛主");
    await expect
      .poll(async () => hasExit(page, "进"), { timeout: 25_000 })
      .toBe(true);

    await goByExitLabel(page, "进");
    await goByExitLabel(page, "北");
    await expect(page.locator(".room-title")).toHaveText(/石门/, {
      timeout: 20_000,
    });

    // 石门状态全服共享：若已被他人打开则直接有「进」；否则应出现开门动作
    await sendSilentCmd(page, "look");
    await openSceneTab(page);
    const openChip = page
      .locator(".chip.action")
      .filter({ hasText: /打开石门|打开门/ })
      .first();
    await expect
      .poll(
        async () =>
          (await openChip.isVisible().catch(() => false)) ||
          (await hasExit(page, "进")),
        { timeout: 25_000 }
      )
      .toBe(true);

    if (await openChip.isVisible().catch(() => false)) {
      await clickActionAndWaitLog(page, /打开石门|打开门/, /打开|石门/, 20_000);
    }

    await expect
      .poll(async () => hasExit(page, "进"), { timeout: 25_000 })
      .toBe(true);
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

    await pickTopMenuItem(page, "帮助");
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
