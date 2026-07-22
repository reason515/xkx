import { test } from "@playwright/test";
test("mobile viewport", async ({ page }) => {
  test.setTimeout(120_000);
  await page.setViewportSize({ width: 390, height: 844 });
  
  page.on("websocket", ws => {
    console.log("WS connected:", ws.url());
  });
  
  await page.goto("/");
  await page.getByRole("tab", { name: "注册" }).click();
  await page.getByLabel("账号（英文 ID）").fill("plMB3");
  await page.getByLabel("密码", { exact: true }).fill("PlTest99x");
  await page.getByLabel("中文名字").fill("测M3");
  await page.getByRole("button", { name: "注册并进入" }).click();
  
  await page.waitForTimeout(15000);
  
  const html = await page.evaluate(() => document.getElementById("root")?.innerHTML?.substring(0, 500));
  console.log("ROOT:", html?.substring(0, 200));
});
