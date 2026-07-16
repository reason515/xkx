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
  run-e2e-tests.ps1      # -Grep 定点 / -Full 全量

.cursor/
  hooks.json
  hooks/stop-verify.mjs  # 仅单元测试
```

## Playwright e2e（默认生产 = 当前测试环境）

- **现阶段测试环境**：服务器 `http://119.45.224.68`（本机 MUD 不可用）
- **默认目标**：同上（`playwright.config.ts` / `run-e2e-tests.ps1`）
- **默认凭证**：`XKX_E2E_REGISTER=1`（随机注册）
- **默认范围**：`-Grep` 相关用例；全量用 `-Full`
- 命令：
  - 相关：`.\scripts\run-e2e-tests.ps1 -Grep "见闻|场景"`
  - 全量：`.\scripts\run-e2e-tests.ps1 -Full`
  - 或：`cd web\app; npx playwright test -g "见闻"`
- **改完部署**：可运行代码先上服务器，再跑相关 e2e
- 本地覆盖（少见）：`XKX_E2E_BASE_URL=http://127.0.0.1:5180`

## Hook 行为

`stop` hook 在 Agent 回合结束时：

- 若 git 变更触及 `web/app/` 或 `gateway/`，自动跑**单元测试**
- **不**自动跑 Playwright（避免全量 e2e 拖慢每轮）；e2e 由 Agent 按 skill 用 `-Grep` 定点执行
- 单元失败时返回 `followup_message` 要求修复（最多 3 轮）

## 预期效果与 e2e 验证点模板

收尾说明给用户看时用这一结构（可按改动裁剪）：

```markdown
## 改动后的预期效果

### 见闻 / 登录 / 场景（按实际选题）

| 之前 | 之后 |
|------|------|
| （失败现象） | （用户应看到的结果） |

### 简化路径（可选）

注册并进入 → … → 可观察终点

## e2e 验证情况

| 用例 | 验证点 |
|------|--------|
| 用例名 | 钉死的断言 |
| （已删）旧用例名 | 为何不再适用 |

单元：`*.test.ts` / `*.test.js` 覆盖了哪些纯函数。
本次命令：`.\scripts\run-e2e-tests.ps1 -Grep "…"`（结果：N passed）；未跑全量。
```

### 好例子（Web 跳过挂名 + 见闻清乱码）

| 之前 | 之后 |
|------|------|
| 见闻里出现 `@@JSON@@...@@ENDJSON@@` 与 `\n` | 见闻只有可读中文 |
| 注册后锁在迎宾沙滩 / 挂名处无出口 | 直接落有出口的侠客岛沙滩，可走动 |

| 用例 | 验证点 |
|------|--------|
| 登录后可见场景且不含登录横幅 | 能进游戏；无 BIG5；见闻无 `@@JSON@@` |
| 新注册进可走动沙滩且原密码可重登 | 标题含「沙滩」、不含「挂名」；出口可见；同密码重登 |
| （已删）跟随挂名后原密码仍可重登 | 跳过挂名后路径无意义，且易触发注册限流 |

### 写法注意

- 改前列可复述的用户抱怨；改后列 UI/日志里**能看见**的结果。
- e2e 表与 `web/app/e2e/*.spec.ts`、门禁 smoke **实际断言**对齐，勿写未实现的检查。
- 若只加强单测未加 e2e，在表下说明原因（例如无用户可见路径）。
- 写明 `-Grep` / `-Full`，避免读者以为已跑全套。
