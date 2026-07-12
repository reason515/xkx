---
name: xkx-testing
description: >-
  侠客行 web/gateway 测试规范：单元测试（Vitest/node:test）、Playwright 冒烟 e2e、
  改动后补测与跑测流程。编辑 web/app、gateway、parser/protocol/loginFsm/ansi，
  或用户提到测试、补测、回归、e2e 时必须遵循。
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
3. **跑单元测试**：仓库根执行 `scripts/run-unit-tests.ps1`（或分别在 `gateway`、`web/app` 下 `npm test`）。
4. **按需跑 e2e**：涉及登录、场景、出口交互时，在 MUD+网关就绪且已设 `XKX_E2E_ID`/`XKX_E2E_PASSWORD` 后执行 `scripts/run-e2e-tests.ps1`。
5. **失败则修到绿**：先修实现，再修测试；不要跳过失败用例。

## 测试范围

| 区域 | 框架 | 必测 |
|------|------|------|
| `web/app/src/lib/parser.ts` | Vitest | 出口/房间/气血/技能/背包解析 |
| `web/app/src/lib/protocol.ts` | Vitest | `applyEvent`、`buildAssistPayload` |
| `gateway/src/loginFsm.js` | node:test | 登录提示状态机 |
| `gateway/src/ansi.js` | node:test | ANSI 剥离与 HTML 转换 |
| `web/app/e2e/` | Playwright | 登录→场景→移动冒烟 |
| `web/concept/` HTML | Python verify | 可选，不纳入主链路 |
| LPC `adm/` `cmds/` | — | 本期不测 |

## 常用命令

```powershell
# 单元测试（gateway + web/app）
.\scripts\run-unit-tests.ps1

# e2e 冒烟（需 MUD:8888、网关:3001、凭证环境变量）
$env:XKX_E2E_ID = "your_id"
$env:XKX_E2E_PASSWORD = "your_password"
.\scripts\run-e2e-tests.ps1
```

## Fixture 约定

- parser 测试使用真实中文 MUD 输出样例（客店、出口、hp 面板等）。
- protocol 测试用最小 `basePrev()` 构造初始状态，断言事件合并结果。
- loginFsm 测试模拟 Telnet 提示片段，不依赖真实 MUD 连接。
- e2e 凭证只从环境变量读取，**禁止**写入仓库或 skill。

## Agent 收尾检查

完成 web/gateway 相关改动后，在回复用户前确认：

- [ ] 已补/更新对应单元测试
- [ ] `run-unit-tests.ps1` 通过
- [ ] 若改动影响登录/场景/出口且环境允许，e2e 已跑或说明跳过原因

更多命令与目录说明见 [reference.md](reference.md)。
