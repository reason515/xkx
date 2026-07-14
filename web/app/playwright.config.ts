import { defineConfig } from "@playwright/test";

const baseURL = process.env.XKX_E2E_BASE_URL || "http://127.0.0.1:5180";
const againstRemote = Boolean(process.env.XKX_E2E_BASE_URL);

export default defineConfig({
  testDir: "./e2e",
  timeout: 120_000,
  expect: { timeout: 60_000 },
  retries: againstRemote ? 1 : 0,
  use: {
    baseURL,
    trace: "on-first-retry",
  },
  // Local: start Vite. Against production/server: use XKX_E2E_BASE_URL only.
  ...(againstRemote
    ? {}
    : {
        webServer: {
          command: "npm run dev",
          url: "http://127.0.0.1:5180",
          reuseExistingServer: true,
          timeout: 120_000,
        },
      }),
});
