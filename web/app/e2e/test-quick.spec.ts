import { test } from "@playwright/test";
test("quick test", async ({ page }) => {
  test.setTimeout(120_000);
  page.on("websocket", ws => console.log("WS:", ws.url()));
  await page.goto("/");
  await page.waitForTimeout(2000);
  await page.getByRole("tab", { name: "注册" }).click();
  await page.getByLabel("账号（英文 ID）").fill("plQK");
  await page.getByLabel("密码", { exact: true }).fill("PlTest99x");
  await page.getByLabel("中文名字").fill("测QK");
  await page.getByRole("button", { name: "注册并进入" }).click();
  await page.waitForTimeout(10000);
  const html = await page.evaluate(() => document.getElementById("root")?.innerHTML?.substring(0, 300));
  console.log("HTML:", html?.substring(0, 200));
});
