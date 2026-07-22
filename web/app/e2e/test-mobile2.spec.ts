import { test } from "@playwright/test";
test("mobile debug", async ({ page }) => {
  test.setTimeout(120_000);
  await page.addInitScript(() => localStorage.setItem("xkx-ui-mode", "mobile"));
  
  page.on("console", msg => {
    if (msg.type() === "error") console.log("ERR:", msg.text().substring(0, 200));
  });
  
  await page.goto("/");
  await page.getByRole("tab", { name: "注册" }).click();
  await page.getByLabel("账号（英文 ID）").fill("plMB2");
  await page.getByLabel("密码", { exact: true }).fill("PlTest99x");
  await page.getByLabel("中文名字").fill("测M2");
  await page.getByRole("button", { name: "注册并进入" }).click();
  
  await page.waitForTimeout(15000);
  
  const html = await page.evaluate(() => document.getElementById("root")?.innerHTML?.substring(0, 1000));
  console.log("ROOT HTML:", html);
});
