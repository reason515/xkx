import { test } from "@playwright/test";
test("mobile ws test", async ({ page }) => {
  test.setTimeout(120_000);
  await page.setViewportSize({ width: 390, height: 844 });
  
  page.on("websocket", ws => console.log("WS:", ws.url()));
  page.on("console", msg => {
    if (msg.type() === "error" || msg.text().includes("socket") || msg.text().includes("WS"))
      console.log(`[${msg.type()}] ${msg.text().substring(0, 200)}`);
  });
  
  await page.goto("/");
  await page.waitForTimeout(3000);
  console.log("After load");
  
  // Try WS directly
  const wsOk = await page.evaluate(async () => {
    return new Promise(resolve => {
      try {
        const ws = new WebSocket("ws://119.45.224.68/ws");
        ws.onopen = () => resolve("OPEN");
        ws.onerror = () => resolve("ERROR");
        setTimeout(() => resolve("TIMEOUT"), 5000);
      } catch(e) { resolve("EXCEPTION"); }
    });
  });
  console.log("Direct WS:", wsOk);
  
  await page.getByRole("tab", { name: "注册" }).click();
  await page.getByLabel("账号（英文 ID）").fill("plMB4");
  await page.getByLabel("密码", { exact: true }).fill("PlTest99x");
  await page.getByLabel("中文名字").fill("测M4");
  await page.getByRole("button", { name: "注册并进入" }).click();
  
  await page.waitForTimeout(5000);
  console.log("After submit");
  
  const html = await page.evaluate(() => {
    const r = document.getElementById("root");
    return r?.innerHTML?.substring(0, 300) || "no root";
  });
  console.log("HTML:", html.substring(0, 200));
});
