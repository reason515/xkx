# xkx-testing 参考

## 目录结构

```
web/app/
  src/lib/*.test.ts      # Vitest 单元测试
  e2e/*.spec.ts          # Playwright e2e
  vitest.config.ts
  playwright.config.ts

gateway/
  src/*.test.js          # node --test

scripts/
  run-unit-tests.ps1
  run-e2e-tests.ps1

.cursor/
  hooks.json
  hooks/stop-verify.mjs
```

## 本地 e2e 前置

1. FluffOS driver：`./driver config.xkx`（MUD 8888）
2. 网关：`cd gateway && npm start`（3001）
3. 前端：Playwright 会自动 `npm run dev`（5173），或手动启动
4. 环境变量：`XKX_E2E_ID`、`XKX_E2E_PASSWORD`

## Hook 行为

`stop` hook 在 Agent 回合结束时：

- 若 git 变更触及 `web/app/` 或 `gateway/`，自动跑单元测试
- 单元通过后，MUD+网关健康则跑 e2e；否则跳过 e2e
- 失败时返回 `followup_message` 要求修复（最多 3 轮）
