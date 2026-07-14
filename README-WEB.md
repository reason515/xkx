# 侠客行 Web 版 — 启动说明

轻量文字 RPG：浏览器 ↔ WebSocket 网关 ↔ FluffOS MUD（端口 8888）。

**仓库**：<https://github.com/reason515/xkx>

## 前置条件

1. **FluffOS 驱动**：本仓库不含 Windows 驱动。请自行编译或使用 WSL/macOS/Linux 上的 `driver`。
2. **Node.js** ≥ 18
3. 在仓库根目录启动 MUD：

```bash
# Linux / macOS / WSL
./driver config.xkx
```

Windows 若无驱动，可用 WSL 进入本目录后执行上述命令。

**云服务器部署**见 [docs/deploy-tencentos.md](docs/deploy-tencentos.md)（TencentOS / CentOS 全栈：MUD + Gateway + Nginx）。

## 一键启动（PowerShell）

```powershell
.\scripts\start-all.ps1
```

## 分步启动

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

浏览器打开 http://localhost:5180

## 目录

| 路径 | 说明 |
|------|------|
| `gateway/` | WebSocket ↔ TCP 网关 |
| `web/app/` | Vite + React 正式前端 |
| `web/concept/` | UI 概念稿与 tokens |
| `docs/launch-area.md` | 首发区范围 |
| `docs/PLAYER.md` | 玩家说明 |
| `adm/daemons/webd.c` | 结构化 JSON 协议（阶段 3） |
| `adm/daemons/assistd.c` | 官方挂机助手（阶段 2+） |

## 环境变量

网关读取 `gateway/config.json`：

- `listenPort` — 默认 3001
- `mudHost` / `mudPort` — 默认 127.0.0.1:8888
- `maxConnectionsPerIp` — 同 IP 连接上限
- `maxRegisterPerHour` — 注册频率限制

## 验收清单（阶段 0）

- [ ] Telnet `127.0.0.1 8888` 可连
- [ ] 新建角色进入扬州客店
- [ ] 网关 `/health` 返回 JSON
- [ ] 浏览器可登录并看到场景

## 已知限制

- `adm/daemons/securityd.c` 对巫师命令不完整；**玩家**登录与游玩不受影响。
- 首发仅保证扬州及周边练级线，见 `docs/launch-area.md`。
