# 侠客行 (xkx2001-utf8)

基于经典 MUD 库 **xkx2001** 的 UTF-8 现代化版本，并扩展 **Web 浏览器客户端**（React + WebSocket 网关 + FluffOS 服务端）。

**仓库**：<https://github.com/reason515/xkx>

> 原版来源 [mudchina/xkx2011](https://github.com/mudchina/xkx2011)（GBK）。本仓库将编码统一为 UTF-8，修复部分兼容问题，并新增轻量 Web 游玩体验。仅供学习交流；如认为涉及版权请联系维护者处理。

## 特性

- **UTF-8 全库**：可在 macOS / Linux / WSL 上运行 FluffOS 驱动
- **Web 客户端**：手机优先的文字武侠 UI，按钮操作，无需输入 MUD 命令
- **WebSocket 网关**：浏览器 ↔ `gateway/` ↔ MUD TCP（8888）
- **结构化协议**：`webd.c` 推送 JSON 事件；`assistd.c` 官方挂机助手
- **自动化测试**：Vitest / node:test 单元测试 + Playwright 冒烟 e2e

## 技术栈

| 层级 | 路径 | 技术 |
|------|------|------|
| MUD 服务端 | `adm/` `cmds/` `d/` `kungfu/` … | LPC / FluffOS |
| 网关 | `gateway/` | Node.js + ws |
| 正式前端 | `web/app/` | Vite 6 + React 19 + TypeScript |
| UI 概念稿 | `web/concept/` | 静态 HTML + design tokens |

## 前置条件

1. **FluffOS 驱动**：仓库不含 Windows 二进制，请自行编译或在 WSL / macOS / Linux 使用 `driver`
2. **Node.js** ≥ 18

## 快速开始

### 启动 MUD

```bash
./driver config.xkx
```

默认监听 `127.0.0.1:8888`。

### 一键启动 Web 栈（Windows PowerShell）

```powershell
.\scripts\start-all.ps1
```

### 分步启动

```powershell
# 1. MUD（需已安装 driver）
./driver config.xkx

# 2. 网关
cd gateway
npm install
npm start

# 3. 前端
cd web/app
npm install
npm run dev
```

浏览器打开 [http://localhost:5180](http://localhost:5180)

## 测试

```powershell
# 单元测试（gateway + web/app）
.\scripts\run-unit-tests.ps1

# Playwright e2e（默认打生产站，自动随机注册）
.\scripts\run-e2e-tests.ps1
```

各子项目也可单独运行：

```bash
cd gateway && npm test
cd web/app && npm test
cd web/app && npm run test:e2e   # 默认 http://119.45.224.68
```

## 目录结构

```
├── adm/              # 守护进程（webd、assistd、logind …）
├── cmds/             # 玩家 / 巫师命令
├── d/                # 房间与区域（全图约 6400 间）
├── kungfu/           # 武功系统
├── gateway/          # WebSocket ↔ TCP 网关
├── web/
│   ├── app/          # Vite + React 正式客户端
│   └── concept/      # UI 概念稿与 tokens
├── docs/             # 协议、首发区、玩家说明
├── scripts/          # 启动、健康检查、测试脚本
└── config.xkx        # FluffOS 驱动配置
```

## 文档

| 文档 | 说明 |
|------|------|
| [README-WEB.md](README-WEB.md) | Web 版启动、环境变量、验收清单 |
| [docs/PLAYER.md](docs/PLAYER.md) | 玩家操作说明 |
| [docs/launch-area.md](docs/launch-area.md) | Web 首发区范围 |
| [docs/protocol-v1.md](docs/protocol-v1.md) | JSON 事件协议 |
| [docs/deploy-tencentos.md](docs/deploy-tencentos.md) | **TencentOS 云服务器部署** |

## 已知限制

- `adm/daemons/securityd.c` 不完整，**巫师命令**暂不可用；玩家登录与游玩不受影响
- Web 首发仅保证扬州及周边练级线，非全图
- Web 版不支持玩家自写脚本；仅提供官方可配置挂机助手

## 致谢

感谢 mudchina 提供的代码库，感谢原作者创作了这款经典文字 MUD。
