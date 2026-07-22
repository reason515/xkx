import { test } from "@playwright/test";
test("long wait", async ({ page }) => {
  test.setTimeout(180_000);
  page.on("websocket", ws => console.log("WS:", ws.url()));
  await page.goto("/");
  await page.getByRole("tab", { name: "注册" }).click();
  await page.getByLabel("账号（英文 ID）").fill("plLNG");
  await page.getByLabel("密码", { exact: true }).fill("PlTest99x");
  await page.getByLabel("中文名字").fill("测LNG");
  await page.getByRole("button", { name: "注册并进入" }).click();
  
  // Wait up to 60 seconds
  for (let i = 0; i < 60; i++) {
    await page.waitForTimeout(1000);
    const html = await page.evaluate(() => document.getElementById("root")?.innerHTML?.substring(0, 300));
    if (html && !html.includes("login-page")) {
      console.log("LEFT LOGIN at second", i+1);
      console.log("HTML:", html?.substring(0, 200));
      return;
    }
  }
  console.log("STILL ON LOGIN after 60s");
});
