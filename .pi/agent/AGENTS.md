# 侠客行（xkx）项目级规则

本文件是 xkx 仓库的项目级 AGENTS.md，位于 **git 仓库根 `D:\code\xkx\xkx2001-utf8`**（`.pi/` 在仓库内，纳入版本管理）。skills 位于仓库外层 `D:\code\xkx\.pi\skills\`，下表中技能路径以本仓库根为基准（`../.pi/skills/...`）；游戏代码路径均相对本仓库根。涉及本仓库的任何操作，先读对应技能再动手。

## 技能触发表

| 触发条件 | 技能 | 位置 |
| --- | --- | --- |
| 编辑或测试 xkx 游戏代码（`web/app`、`gateway`、LPC）；用户提到测试、补测、回归、e2e、bug 修复验证 | `xkx-testing` | `../.pi/skills/xkx-testing/SKILL.md` |
| 编辑 `web/` 或 `web/concept/` 的 UI/UX；样式、配色、字体、布局、面板设计 | `xkx-web-ui` | `../.pi/skills/xkx-web-ui/SKILL.md` |
| 新增或修改挂机/辅助模式（自动挂机/自动历练/自动修炼/任务挂机/押镖挂机/挂机菜单）；编辑 `adm/daemons/assistd.c`、`gateway/src/assistCommand.js`、`web/app` 挂机 UI | `xkx-assist-system` | `../.pi/skills/xkx-assist-system/SKILL.md` |
| 部署代码到服务器 119.45.224.68；用户要求部署、上传、服务器验证 | `xkx-deploy` | `../.pi/skills/xkx-deploy/SKILL.md` |
| 用户报告 bug、缺陷、回归；修复测试或反馈中发现的问题 | `xkx-e2e-regression` | `../.pi/skills/xkx-e2e-regression/SKILL.md` |
| 编写、扩展或调试 Playwright e2e 测试（`web/app/e2e/`、`.spec.ts`） | `xkx-e2e-writer` | `../.pi/skills/xkx-e2e-writer/SKILL.md` |
| 从 pkuxkx 复刻功能到 xkx2001-utf8；对比两个代码库差异；适配文件命名/编码/路径；localmaps 类故障排查 | `xkx-pkuxkx-port` | `../.pi/skills/xkx-pkuxkx-port/SKILL.md` |
| 地图场景的关键房间交互声明与回归（乘车/乘船/摆渡/机关/祭坛/传送/采集/任务确认等"应有可点按钮但未展示"问题） | `xkx-room-actions` | `../.pi/skills/xkx-room-actions/SKILL.md` |
| 绘制或修改区域地图 SVG（`roomMaps.ts` 数据、`RoomGraph.tsx` 渲染、MapSheet 区域接入、同名房间定位） | `xkx-svg-map` | `../.pi/skills/xkx-svg-map/SKILL.md` |

**强制规则**：

- **服务器即测试环境**：`web/app`、`gateway`、LPC 代码改动后，默认通过 SCP 部署到 119.45.224.68 再验证，不依赖本机 MUD（`xkx-deploy`）。
- **新缺陷必须补 e2e 回归**：修复 bug 时同步加测；跑测默认只跑相关用例（`xkx-e2e-regression`）。
- 编辑 `web/app`、`gateway`、`parser/protocol/loginFsm/ansi` 相关代码后必须补测（`xkx-testing`）。

**注**：仓库外 `D:\code\xkx\.pi\skills\` 下的 `xkx-assist-system-workspace`、`xkx-pkuxkx-port-workspace` 是迭代工作目录（非技能），不含 SKILL.md。

## 权威文档

- 协议：`docs/protocol-v1.md`
- 玩家文档：`docs/PLAYER.md`
- 部署：`docs/deploy-tencentos.md`
- 其他：`docs/`（launch-area、mobile-ui-ux-review、pc-desktop-design、newbie-and-help-rebuild-report、web-interaction-gap-analysis、xkx2001-vs-pkuxkx-diff-list 等）
