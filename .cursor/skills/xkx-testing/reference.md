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

## Playwright e2e（默认生产 = 当前测试环境）

- **现阶段测试环境**：服务器 `http://119.45.224.68`（本机 MUD 不可用）
- **默认目标**：同上（`playwright.config.ts` / `run-e2e-tests.ps1`）
- **默认凭证**：`XKX_E2E_REGISTER=1`（随机注册）
- 命令：`.\scripts\run-e2e-tests.ps1` 或 `cd web\app; npm run test:e2e`
- **改完部署**：可运行代码先上服务器（`bash /opt/xkx/deploy/scripts/remote-update.sh`），再跑 e2e
- 本地覆盖（少见）：`XKX_E2E_BASE_URL=http://127.0.0.1:5180`

## Hook 行为

`stop` hook 在 Agent 回合结束时：

- 若 git 变更触及 `web/app/` 或 `gateway/`，自动跑单元测试
- 单元通过后，生产站可达则跑 Playwright e2e；否则跳过
- 失败时返回 `followup_message` 要求修复（最多 3 轮）
