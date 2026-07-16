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
  const cell = page.locator(".exit-pad .cell.open").filter({ hasText: label }).first();
  await expect(cell).toBeVisible({ timeout: 15_000 });
  await cell.click();
  await page.getByRole("button", { name: "前往" }).click();
  await expect(page.locator(".room-title")).not.toHaveText("…", {
    timeout: 20_000,
  });
  await openSceneTab(page);
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
  });

  test("pickup 拾起地上物品后场景列表不再显示该物", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await loginAsNewbie(page, { asRegister: true });

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
    // 新号落在沙滩，保证有渔夫；避免共用号已走开
    await loginAsNewbie(page, { asRegister: true });

    await openSceneTab(page);
    await expect(page.locator(".room-title")).toHaveText(/沙滩/, { timeout: 60_000 });

    // 先打开角色卡（会静默 look me / hp / score），这是此前误吞打听回显的路径
    await page.locator(".hero-btn").click();
    await expect(page.getByRole("button", { name: "档案" })).toBeVisible();
    await page.locator(".sheet .close").click();

    await openSceneTab(page);
    const askBtn = page.getByRole("button", {
      name: "向渔夫打听侠客岛",
      exact: true,
    });
    await expect(askBtn).toBeVisible({ timeout: 30_000 });
    await askBtn.click();

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

  test("地图浮层显示侠客岛真图与世界总图", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await loginAsNewbie(page, { asRegister: true });

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

  test("新注册进可走动沙滩且原密码可重登", async ({ page }) => {
    // Web 已跳过迎宾/挂名：应直接落在有出口的沙滩，密码不变可重登
    test.skip(!register && !!e2eId, "需要 XKX_E2E_REGISTER=1");

    const { id, password } = await loginAsNewbie(page, { asRegister: true });

    await openSceneTab(page);
    const roomTitle = page.locator(".room-title");
    await expect(roomTitle).toHaveText(/沙滩/, { timeout: 90_000 });
    expect(((await roomTitle.textContent()) || "").trim()).not.toMatch(/挂名/);

    await expect(page.locator(".exit-pad .cell.open").first()).toBeVisible({
      timeout: 60_000,
    });
    await expect(page.getByRole("button", { name: "拿起" })).toHaveCount(0);

    const itemNames = await page.locator(".chip.item").allTextContents();
    expect(itemNames.every((n) => !/^\?+$/.test(n.trim()))).toBe(true);
    await openLogTab(page);
    const logs = (await page.locator(".log p").allTextContents()).join("\n");
    expect(logs).not.toMatch(/^\?{6,}$/m);
    expect(logs).not.toMatch(/@@JSON@@|@@ENDJSON@@/);

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
});
