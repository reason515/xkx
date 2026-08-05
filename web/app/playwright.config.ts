import { defineConfig } from "@playwright/test";

/** Playwright e2e 默认打生产站；本地调试设 XKX_E2E_BASE_URL=http://127.0.0.1:5180 */
const PROD_URL = "http://119.45.224.68";
const baseURL = process.env.XKX_E2E_BASE_URL || PROD_URL;
const againstLocal = /127\.0\.0\.1|localhost/i.test(baseURL);

export default defineConfig({
  testDir: "./e2e",
  timeout: 120_000,
  expect: { timeout: 60_000 },
  retries: againstLocal ? 0 : 1,
  // 账号池 4 个（testera~testerd）：每 worker 一个账号，平行跑不互踢。
  // 测试文件之间并行（fullyParallel=false），文件内用例串行复用同账号（prep 清状态）。
  workers: 4,
  fullyParallel: false,
  use: {
    baseURL,
    trace: "on-first-retry",
    // 本机 HTTP_PROXY 会把页面加载拖慢一倍（14s→30s）；e2e 直连生产站
    launchOptions: { args: ["--no-proxy-server"] },
  },
  // 本地才起 Vite；生产站不启 webServer
  ...(againstLocal
    ? {
        webServer: {
          command: "npm run dev",
          url: "http://127.0.0.1:5180",
          reuseExistingServer: true,
          timeout: 120_000,
        },
      }
    : {}),
});
