import { test, expect } from "@playwright/test";
test("mobile login", async ({ page }) => {
  test.setTimeout(120_000);
  await page.addInitScript(() => localStorage.setItem("xkx-ui-mode", "mobile"));
  
  await page.goto("/");
  await page.getByRole("tab", { name: "注册" }).click();
  await page.getByLabel("账号（英文 ID）").fill("plMOB");
  await page.getByLabel("密码", { exact: true }).fill("PlTest99x");
  await page.getByLabel("中文名字").fill("测MOB");
  await page.getByRole("button", { name: "注册并进入" }).click();
  
  for (let i = 0; i < 60; i++) {
    await page.waitForTimeout(1000);
    if (await page.locator(".scene-panel").isVisible().catch(() => false)) {
      console.log("IN GAME");
      const title = await page.locator(".room-title").textContent();
      console.log("Room:", title);
      return;
    }
  }
  console.log("TIMEOUT");
});
