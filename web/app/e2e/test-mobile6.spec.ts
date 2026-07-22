import { test } from "@playwright/test";
test("wide viewport mobile mode", async ({ page }) => {
  test.setTimeout(120_000);
  await page.setViewportSize({ width: 1280, height: 720 });
  
  page.on("websocket", ws => console.log("WS:", ws.url()));
  
  await page.goto("/");
  await page.waitForTimeout(2000);
  
  await page.getByRole("tab", { name: "注册" }).click();
  await page.getByLabel("账号（英文 ID）").fill("plMB6");
  await page.getByLabel("密码", { exact: true }).fill("PlTest99x");
  await page.getByLabel("中文名字").fill("测M6");
  await page.getByRole("button", { name: "注册并进入" }).click();
  
  await page.waitForTimeout(15000);
  
  const html = await page.evaluate(() => document.getElementById("root")?.innerHTML?.substring(0, 500));
  console.log("HTML:", html?.substring(0, 300));
  
  // Check if there's an in-game element
  const inGame = await page.locator(".scene-panel, .log-panel, .desktop-app, [data-testid='desktop-app']").isVisible().catch(() => false);
  console.log("In game:", inGame);
});
