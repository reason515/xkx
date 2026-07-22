import { test } from "@playwright/test";
test("mobile no pwa", async ({ page }) => {
  test.setTimeout(120_000);
  await page.setViewportSize({ width: 390, height: 844 });
  
  // Block service worker registration
  await page.route("**/registerSW.js", route => route.abort());
  await page.route("**/sw.js", route => route.abort());
  
  page.on("websocket", ws => console.log("WS:", ws.url()));
  page.on("console", msg => {
    if (msg.type() === "error") console.log("ERR:", msg.text().substring(0, 200));
  });
  
  await page.goto("/");
  await page.waitForTimeout(2000);
  
  await page.getByRole("tab", { name: "注册" }).click();
  await page.getByLabel("账号（英文 ID）").fill("plMB5");
  await page.getByLabel("密码", { exact: true }).fill("PlTest99x");
  await page.getByLabel("中文名字").fill("测M5");
  await page.getByRole("button", { name: "注册并进入" }).click();
  
  await page.waitForTimeout(15000);
  
  const html = await page.evaluate(() => document.getElementById("root")?.innerHTML?.substring(0, 300));
  console.log("HTML:", html?.substring(0, 200));
});
