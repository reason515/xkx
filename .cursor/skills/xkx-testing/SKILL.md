---
name: xkx-testing
description: >-
  侠客行 web/gateway 测试规范：单元测试（Vitest/node:test）、Playwright 冒烟 e2e、
  改动后补测与跑测流程；改完须用改前/改后对照说明预期效果，并列出 e2e 用例与验证点。
  编辑 web/app、gateway、parser/protocol/loginFsm/ansi，或用户提到测试、补测、回归、e2e、
  预期效果、验证点时必须遵循。
---

# 侠客行测试规范

## 何时读本 skill

- 修改 [`web/app`](../../../web/app)、[`gateway`](../../../gateway) 业务或协议逻辑
- 新增/变更 parser、protocol、登录 FSM、ANSI 处理
- 用户要求补测试、跑测试、防回归

UI 纯样式改动仍优先读 [`xkx-web-ui`](../xkx-web-ui/SKILL.md)；逻辑与协议改动读本 skill。

## 强制工作流

1. **识别可测行为**：纯函数优先（`parser.ts`、`protocol.ts`、`loginFsm.js`、`ansi.js`）。
2. **同步补测**：新增/变更行为必须更新或新增对应 `*.test.ts` / `*.test.js`；禁止只改实现不更新断言。
3. **新发现问题优先 e2e**（与 [`.cursor/rules/e2e-on-bugs.mdc`](../../rules/e2e-on-bugs.mdc) 一致）：用户报告或排查中新发现的缺陷，修复时**尽可能**用 e2e 钉死回归——登录/新手/场景/跟随/挂名/重登等走 `deploy/scripts/e2e-login-smoke.cjs` 与/或 `web/app/e2e/`；纯逻辑仍补单元测，但用户路径能复现的不要只写单测。
4. **跑单元测试**：仓库根执行 `scripts/run-unit-tests.ps1`（或分别在 `gateway`、`web/app` 下 `npm test`）。
5. **服务器即测试环境**（现阶段，与 [`.cursor/rules/server-as-test-env.mdc`](../../rules/server-as-test-env.mdc) 一致）：本机 MUD 不可用；可运行改动**默认部署到服务器**后再验。
6. **e2e 默认只跑相关用例**（见下节）：部署后用 `-Grep` 定点跑；**不要**默认跑全量 Playwright。
7. **失败则修到绿**：先修实现，再修测试；不要跳过失败用例。

## e2e：相关优先，全量按需

套件会随功能变长；Agent **默认不得**跑完整 `web/app/e2e/`。

| 场景 | 跑什么 |
|------|--------|
| 日常改动验证 | 部署门禁 `run-e2e-smoke.sh`（若本次部署）+ **与改动相关的** Playwright（`-Grep`） |
| 新增/改写了某条 e2e | 至少跑**那条**（及直接依赖的相邻用例） |
| 用户明确要求全量 / 发版前 / 登录主路径大改 | `.\scripts\run-e2e-tests.ps1 -Full` |

### 如何选 `-Grep`

按**本次改动触及的用户路径**选用例标题关键字（Playwright `-g`），宁窄勿宽：

| 改动主题 | 建议 `-Grep` |
|----------|----------------|
| 见闻 / 场景 Tab / 底栏 | `见闻\|场景\|Tab` |
| 角色卡 / 仪容档案进见闻 | `角色卡片\|见闻` |
| 地图浮层 | `地图` |
| 打听 / 见闻被吞 | `渔夫\|打听` |
| 登录记住账号 | `记住账号` |
| 沙滩落点 / 重登 | `沙滩\|重登` |
| 登录横幅 / 房间文案 | `登录后可见场景` |

多主题可 OR：`-Grep "见闻|角色卡片"`。不确定时先 `cd web/app; npx playwright test --list` 看标题再选。

### 命令

```powershell
# 相关 e2e（默认做法）
.\scripts\run-e2e-tests.ps1 -Grep "见闻|场景|Tab"

# 全量（显式）
.\scripts\run-e2e-tests.ps1 -Full

# 单元测试
.\scripts\run-unit-tests.ps1

# 仅本地调试时覆盖（需本机 MUD:8888、网关:3001、前端:5180）
$env:XKX_E2E_BASE_URL = "http://127.0.0.1:5180"
.\scripts\run-e2e-tests.ps1 -Grep "见闻"
```

未传 `-Grep` / `-Full` / 其它 playwright 参数时，脚本会退出并提示，避免误跑全量。

**服务器部署门禁（强制）**：每次部署末尾仍跑  
`deploy/scripts/run-e2e-smoke.sh`（WebSocket 注册→进游戏，轻量）。失败则部署失败。  
每次 `git reset` 后必须再跑 `fix-static-to-nosave.py`，否则 FluffOS 无法加载 `/feature/dbase`，表现为登录无响应。

`stop` hook **只跑单元测试**，不自动跑 Playwright。

## 测试范围

| 区域 | 框架 | 必测 |
|------|------|------|
| `web/app/src/lib/parser.ts` | Vitest | 出口/房间/气血/技能/背包解析 |
| `web/app/src/lib/protocol.ts` | Vitest | `applyEvent`、`buildAssistPayload` |
| `gateway/src/loginFsm.js` | node:test | 登录提示状态机 |
| `gateway/src/ansi.js` | node:test | ANSI 剥离与 HTML 转换 |
| `web/app/e2e/` | Playwright | 按改动用 `-Grep` 定点；全量按需 |
| `web/concept/` HTML | Python verify | 可选，不纳入主链路 |
| LPC `adm/` `cmds/` | — | 本期不测 |

## Fixture 约定

- parser 测试使用真实中文 MUD 输出样例（客店、出口、hp 面板等）。
- protocol 测试用最小 `basePrev()` 构造初始状态，断言事件合并结果。
- loginFsm 测试模拟 Telnet 提示片段，不依赖真实 MUD 连接。
- e2e 凭证只从环境变量读取，**禁止**写入仓库或 skill；服务器冒烟默认随机注册。

## 改完必述：预期效果（改前 / 改后）

涉及用户可见行为、登录/场景/见闻、或 e2e 断言变更时，在收尾回复（或计划确认前）用**对照表**写清差异，不要只写「已修复」「已跳过」。

```markdown
### 预期效果

| 之前 | 之后 |
|------|------|
| …具体现象… | …用户应看到的结果… |

### e2e 验证点

| 用例 | 验证点 |
|------|--------|
| （新增/改写的用例名） | 钉死的断言（标题/出口/文案/重登/无乱码等） |
```

要求：

1. **改前**写真实痛点（乱码、卡住、必须点跟随等），**改后**写可观察结果。
2. 多条独立体验可拆多张小表（见闻 / 新手链 / 重登），再给一条简化用户路径（注册 → … → 可走）。
3. **同步列 e2e**：本次新增、改写、删除的用例各写一行；删掉的注明「为何不再适用」。
4. 门禁 smoke（`e2e-login-smoke`）有行为变化时同样列出。
5. 收尾写明实际跑的命令（`-Grep …` 或 `-Full`）与结果，勿暗示已跑全量却只跑了子集。
6. 纯内部重构、无用户可感差异时，可一句带过，不必硬凑表。

示例与模板见 [reference.md](reference.md#预期效果与-e2e-验证点模板)。

## Agent 收尾检查

完成 web/gateway/LPC 相关改动后，在回复用户前确认：

- [ ] 已补/更新对应单元测试
- [ ] 若本次修复来自**新发现的问题**，已尽量补 e2e（门禁 smoke 与/或 Playwright），而非仅单测或手工验证
- [ ] 已用**改前/改后**对照写清预期效果，并列出本次 e2e 用例与验证点（见上一节）
- [ ] `run-unit-tests.ps1` 通过
- [ ] 可运行改动已**部署到服务器**（或已说明需用户 push/部署）
- [ ] 部署后已跑门禁 smoke（若部署）+ **相关** Playwright（`-Grep`）；仅在需要时 `-Full`；跳过须说明原因

更多命令与目录说明见 [reference.md](reference.md)。
