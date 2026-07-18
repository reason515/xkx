<div align="center">

<span style="font-size: 28px;"><strong>侠客行 PC 桌面工作台 · 设计文档</strong></span><br/>
<span style="font-size: 18px;">基于 Web 的 Zmud 式 MUD 体验现代化改造</span>

</div>

---

# 1. 概述

## 1.1 文档目的

本文档定义侠客行 Web 版 **PC 桌面工作台模式** 的完整设计方案，作为 AI 驱动开发的蓝图和验收依据。

## 1.2 核心目标

在现有 `web/app`（移动端优先）代码库内新增 **PC 桌面工作台模式**，为 PC 玩家提供接近传统 Zmud/Mushclient 的 MUD 体验，同时通过可视化构建器大幅降低 alias/trigger/timer 的制作门槛，让不懂编程的武侠爱好者也能轻松上手。

## 1.3 设计原则

- **原汁原味 + 现代体验**：核心交互保留命令行与 ANSI 彩色终端流，周边辅助面板提供现代便捷操作
- **零门槛自定义**：规则制作不需要写代码，可视化表单式配置覆盖 80% 高频场景
- **正交共存**：PC 模式与移动模式共享网关、认证、WebSocket、协议层，互不干扰
- **安全可控**：自动化规则在浏览器本地执行，显式启用、严格限速、一键急停

## 1.4 非目标（v1 明确不做）

| 项目 | 原因 |
|------|------|
| 完全无人值守挂机 | 全自动挂机继续由服务端官方助手（`assistd.c`）处理 |
| 多角色多会话同时在线 | 单 Tab 单角色，多角色可开多个浏览器 Tab |
| 自然语言生成规则 | 后期迭代；v1 用可视化构建器 + 模板 |
| 云同步规则 | v1 靠 JSON 导出/导入手动迁移 |
| 自由拖拽停靠面板 | v1 固定三栏布局，可拖拽调整宽度比例 |
| Gag / Highlight 规则 | v1 做 Trigger + Alias + Timer；Gag/Highlight 后续加入 |

---

# 2. 架构总览

## 2.1 整体架构

```
┌─────────────────────────────────────────────────────────────────┐
│                        web/app (Vite + React 19 + TS)             │
│                                                                   │
│  ┌──────────────────────────┐  ┌──────────────────────────────┐  │
│  │     移动端模式 (现状)      │  │   PC 桌面工作台模式 (新增)     │  │
│  │   phone 容器 + panels     │  │   三栏布局 + xterm.js + 规则  │  │
│  │   不改动，照常运行          │  │                              │  │
│  └──────────────────────────┘  └──────────────────────────────┘  │
│                     │                        │                    │
│              ┌──────┴────────┬───────────────┴──────┐             │
│              │        useGame (共享核心 hook)        │             │
│              │  WebSocket · 认证 · 基础状态 · 协议    │             │
│              └──────────────────┬───────────────────┘             │
│                                 │                                 │
│              ┌──────────────────┴───────────────────┐             │
│              │  DesktopProvider (PC 专属 Context)    │             │
│              │  规则引擎 · 终端 ref · 面板切换 · 布局  │             │
│              └──────────────────────────────────────┘             │
└─────────────────────────────────────────────────────────────────┘
                                 │
                    WebSocket (ws://host/ws)
                                 │
              ┌──────────────────┴───────────────────┐
              │            gateway (Node.js)          │
              │  WebSocket ↔ TCP ↔ FluffOS            │
              │  新增: text.raw 字段 (原始 ANSI 文本)   │
              └──────────────────┬───────────────────┘
                                 │
              ┌──────────────────┴───────────────────┐
              │        FluffOS + xkx2001 LPC          │
              │  webd.c · assistd.c · alias/trigger   │
              │  不改动 (服务端零修改)                   │
              └──────────────────────────────────────┘
```

## 2.2 关键技术选型

| 决策点 | 选择 | 理由 |
|--------|------|------|
| 终端渲染 | **xterm.js** | MIT 协议、完整 ANSI 支持、被 VS Code/Hyper 广泛使用、约 150KB gzip |
| 规则存储 | **localStorage + JSON 导出/导入** | 零服务端改动、离线可用、便于社区分享 |
| 数据管道 | **网关新增 `raw` 字段** | 移动端不受影响，xterm.js 消费原始 ANSI 文本 |
| 模式切换 | **手动切换 + 智能默认** | 视口 ≥1024px 默认建议桌面模式，用户可随时切换，存储偏好 |
| 规则引擎 v1 | **Trigger + Alias + Timer** | 覆盖 Zmud 使用率最高的核心三件套 |

---

# 3. 布局设计

## 3.1 三栏经典布局

```
┌──────────┬────────────────────────────────┬──────────────┐
│  左侧栏   │          中央终端区              │   右侧面板    │
│  220px   │         (flex: 1)              │   320px      │
│          │                                │              │
│  ┌──────┐ │  ┌──────────────────────────┐ │ ┌──────────┐ │
│  │方向   │ │  │                          │ │ │ tab:     │ │
│  │罗盘   │ │  │  xterm.js               │ │ │ 规则编辑器│ │
│  │      │ │  │  全 ANSI 彩色终端         │ │ │          │ │
│  └──────┘ │  │  可滚动、可选文本          │ │ │ alias    │ │
│  ┌──────┐ │  │                          │ │ │ trigger  │ │
│  │人物   │ │  │                          │ │ │ timer    │ │
│  │列表   │ │  │                          │ │ └──────────┘ │
│  └──────┘ │  │                          │ │ ┌──────────┐ │
│  ┌──────┐ │  │                          │ │ │ tab:     │ │
│  │物品   │ │  │                          │ │ │ 角色状态  │ │
│  │列表   │ │  └──────────────────────────┘ │ │ 气血精内力│ │
│  └──────┘ │                                │ │ 武功行囊  │ │
│  ┌──────┐ │  ┌──────────────────────────┐ │ └──────────┘ │
│  │快捷   │ │  │ > 输入指令...      [发送] │ │              │
│  │动作   │ │  └──────────────────────────┘ │              │
│  └──────┘ │                                │              │
└──────────┴────────────────────────────────┴──────────────┘
```

- **左侧栏**（约 220px，可拖拽调整）：方向罗盘（8 方向 + 上/下/进/出按钮）、人物列表（NPC 芯片按钮）、物品列表（地面物品芯片按钮）、快捷动作区（环顾/存档等）
- **中央终端区**（flex: 1）：xterm.js 实例，完整 ANSI 彩色终端 + 底部命令行输入栏
- **右侧面板**（约 320px，可拖拽调整）：可切换标签页（规则编辑器、角色状态）、后期可扩展地图/帮助

## 3.2 布局可拖拽

三栏之间通过 CSS `resize` 或简单拖拽手柄（mousedown 计算偏移）调整宽度比例。左侧栏和右侧面板的最小宽度均设为 180px，最大不超过视口的 40%。

## 3.3 模式切换

- **入口**：顶部菜单新增「桌面模式 / 移动模式」切换按钮，或设置页面选项
- **智能默认**：首次访问时屏幕宽度 ≥1024px 默认建议桌面模式，<1024px 默认移动模式
- **持久化**：用户选择存入 `localStorage` 的 `xkx-ui-mode` 键，下次访问自动沿用
- **条件渲染**：`App.tsx` 顶层分支 `mode === 'desktop' ? <DesktopApp /> : <MobileApp />`（当前 `App.tsx` 内容即为 `MobileApp`）

---

# 4. 终端实现

## 4.1 xterm.js 集成

```typescript
// 伪代码示意
import { Terminal } from '@xterm/xterm';
import { FitAddon } from '@xterm/addon-fit';
import { WebglAddon } from '@xterm/addon-webgl';

const term = new Terminal({
  cols: 80,
  rows: 40,
  fontSize: 14,
  fontFamily: "'Sarasa Mono SC', 'Cascadia Code', 'Fira Code', monospace",
  theme: {
    background: '#0c0b0a',
    foreground: '#e8dfd0',
    cursor: '#5f8f78',
    // 映射 ANSI 色到项目 design tokens
    black:   '#1a1a1a',
    red:     '#c94b3b',
    green:   '#5f8f78',
    yellow:  '#c9a24b',
    blue:    '#4b7fc9',
    magenta: '#a04bc9',
    cyan:    '#4b9fc9',
    white:   '#e8dfd0',
    brightBlack:   '#3a3a3a',
    brightRed:     '#e06b5b',
    brightGreen:   '#8fbfa0',
    brightYellow:  '#e0c070',
    brightBlue:    '#6b9fe0',
    brightMagenta: '#c06be0',
    brightCyan:    '#6bbfe0',
    brightWhite:   '#f5efe0',
  },
  allowProposedApi: true,       // 允许 addon 注册
  cursorBlink: true,
  disableStdin: false,          // 允许键盘输入
});
```

### 4.1.1 依赖

```json
{
  "@xterm/xterm": "^5.x",
  "@xterm/addon-fit": "^0.x",
  "@xterm/addon-webgl": "^0.x"
}
```

### 4.1.2 终端容器组件

`TerminalPane.tsx` 负责：

1. 挂载 xterm.js 到 DOM ref
2. 监听 `FitAddon` 自适应容器尺寸
3. 接收来自 `DesktopContext` 的原始 ANSI 文本流，调用 `term.write(raw)`
4. 拦截 `term.onData()` 处理键盘输入：
   - 回车 → 发送当前命令行到 MUD
   - Backspace → 本地编辑
   - 普通字符 → 缓存到行缓冲区
5. 显示底部命令行（在 xterm 内最末行或独立 DOM 输入栏）

## 4.2 数据管道改动

### 4.2.1 网关改动（`gateway/src/session.js`）

在 `handleData` 的 `nowInGame` 分支中，`emit("text", ...)` 时新增 `raw` 字段：

```javascript
// 现有: text (已 stripAnsi) + htmlLines (ANSI→HTML spans)
// 新增:
this.emit("text", {
  text: forLog,                        // 现有，移动端继续用
  htmlLines,                           // 现有
  raw: stripJsonFrames(chunkText),     // 新增: 未 stripAnsi 但已 stripTelnet + stripJsonFrames
});
```

**关键**：`raw` 仅做 `stripTelnet`（IAC 协商字节）和 `stripJsonFrames`（`@@JSON@@` 块），保留所有 ANSI escape sequences（颜色、粗体、光标控制等），不做 `stripAnsi`。这保证 xterm.js 收到的文本与原始 MUD telnet 输出一致（除了已过滤的 IAC 和 JSON 事件块）。

### 4.2.2 前端改动

- `WsMessage` 接口新增 `raw?: string`
- `useGame` hook 将 `raw` 通过 `DesktopContext` 传递给 `TerminalPane`
- 移动端组件忽略 `raw` 字段，行为不变

## 4.3 快捷键支持

| 快捷键 | 功能 |
|--------|------|
| `Ctrl+L` | 清屏（`term.clear()`） |
| `Ctrl+K` | 打开/关闭规则编辑器标签页 |
| `Ctrl+,` | 打开设置 |
| `↑/↓` | 历史命令浏览（基于 xterm 输入缓存） |
| `Tab` | 命令补全（基于已有 alias 列表 + MUD 命令列表） |

---

# 5. 左侧快捷面板

## 5.1 方向罗盘

```
         [西北]  [北]  [东北]
         [西]    ·     [东]
         [西南]  [南]  [东南]
              [上]  [下]
            [进]    [出]
```

- 每个方向按钮展示方向中文名和对应英文指令（`north` / `south` 等）
- 点击按钮 → 发送 `go <dir>` 或 `enter` / `out`
- 按钮状态：如果当前房间无该出口则置灰/隐藏（根据 `room.exits` 数据驱动）

## 5.2 人物列表

- 展示当前房间 NPC 列表（来自 `room.npcs`）
- 点击 NPC → 发送 `look <npc_id>` 查看，侧边弹窗或终端输出
- 右键 NPC → 可选 `fight` / `ask` / `steal` 等上下文操作

## 5.3 物品列表

- 展示当前房间地面物品（来自 `room.items`）
- 点击物品 → 发送 `get <item_id>` 拾取
- 右键 → 可选 `look <item>` 查看详情

## 5.4 快捷动作

固定按钮组：
- **环顾** → `look`
- **存档** → `save`
- **修炼** → 打开修炼面板（复用 `TrainSheet`）
- **战斗** → 打开战斗面板（复用 `CombatSheet`）

---

# 6. 规则引擎

## 6.1 数据模型

```typescript
// 规则类型
type RuleKind = "alias" | "trigger" | "timer";

// Alias：输入替换
interface AliasRule {
  kind: "alias";
  id: string;
  name: string;
  enabled: boolean;
  alias: string;           // 缩写词（如 "sc"）
  expansion: string;       // 展开后的完整指令（如 "score"），支持 $1,$2…,$* 占位
}

// Trigger：文本匹配→动作
interface TriggerRule {
  kind: "trigger";
  id: string;
  name: string;
  enabled: boolean;
  pattern: string;         // 匹配文本（支持通配符 * 和正则 /regex/ 标记）
  patternType: "wildcard" | "regex" | "exact";
  caseSensitive: boolean;
  action: TriggerAction[];
  // 高级过滤（可选折叠区域）
  advanced?: {
    eventType?: "room.update" | "player.vitals" | "combat.event" | "train.event";
    cooldownMs?: number;   // 冷却时间，防止连续触发刷屏
    maxTriggers?: number;  // 最多触发次数（0=无限）
    oneShot?: boolean;     // 触发一次后自动禁用
  };
}

type TriggerAction =
  | { type: "send"; command: string }        // 发送指令
  | { type: "toast"; message: string }       // 浏览器通知
  | { type: "sound"; url: string }           // 播放音效
  | { type: "highlight"; color: string }     // 高亮匹配行（后期）
  | { type: "gag" }                          // 抑制不显示（后期）
  | { type: "enable"; ruleId: string }       // 启用另一个规则
  | { type: "disable"; ruleId: string }      // 禁用另一个规则
  | { type: "timer"; action: "start" | "stop"; timerId: string }; // 控制 timer

// Timer：定时执行
interface TimerRule {
  kind: "timer";
  id: string;
  name: string;
  enabled: boolean;
  intervalMs: number;       // 间隔毫秒（最小 1000ms）
  action: string;           // 执行的指令
  oneShot: boolean;         // 仅执行一次（默认 false 即循环）
}

// 统一规则类型
type Rule = AliasRule | TriggerRule | TimerRule;

// 规则集
interface RuleSet {
  version: 1;
  name: string;
  description?: string;
  rules: Rule[];
  exportedAt: string;       // ISO datetime
}
```

## 6.2 规则引擎核心

`RuleEngine` 类（`web/app/src/lib/ruleEngine.ts`）：

```typescript
class RuleEngine {
  private rules: Rule[] = [];
  private timers: Map<string, ReturnType<typeof setInterval>> = new Map();
  private lastTriggered: Map<string, number> = new Map();  // cooldown 跟踪
  private emergencyStop: boolean = false;
  private cmdRateLimit: { count: number; resetAt: number } = { count: 0, resetAt: 0 };

  // 加载/保存规则
  load(rules: Rule[]): void;
  save(): Rule[];
  exportJson(): string;
  importJson(json: string): Rule[];

  // 规则 CRUD
  addRule(rule: Rule): void;
  updateRule(id: string, partial: Partial<Rule>): void;
  removeRule(id: string): void;
  toggleRule(id: string): void;

  // 引擎核心
  processInput(input: string): string;              // alias 替换
  processOutput(line: string, eventType?: string): {
    actions: TriggerAction[];                        // 匹配到的动作
    shouldShow: boolean;                             // 是否显示该行（gag）
  };
  startTimer(timerId: string): void;
  stopTimer(timerId: string): void;

  // 安全控制
  emergencyStopAll(): void;                          // 一键急停
  isRateLimited(): boolean;                          // 指令发送限速
}
```

### 6.2.1 限速策略

- 每秒最多发送 **5 条** 由规则引擎触发的指令（不含用户手动输入）
- 超速时跳过该次触发，终端提示黄色警告行 `[规则] 触发过于频繁，已跳过`
- 急停按钮：物理快捷键 `Ctrl+Shift+X` + 左下角红色「急停」按钮，一键禁用所有规则并清除所有 timer

### 6.2.2 安全约束

| 约束 | 说明 |
|------|------|
| 禁止循环 | 单条规则输出的指令不再进入 alias/trigger 匹配链（防止无限循环） |
| 最大规则数 | 100 条（alias + trigger + timer 总计） |
| Timer 最小间隔 | 1000ms（禁止高频轮询） |
| 跨场景导航 | Timer 不支持自动移动指令（含 `go` / `enter` / `out`），防止无人值守自动寻路 |
| 冷却时间 | Trigger 默认 cooldown 500ms，可手动调大 |

## 6.3 可视化构建器

### 6.3.1 Alias 编辑表单

```
┌─────────────────────────────────────┐
│  编辑 Alias                         │
│                                     │
│  名称: [________________]           │
│  缩写: [________________]           │
│  展开: [________________]           │
│                                     │
│  💡 占位符: $1 $2 $3 ... $* 所有参数  │
│  示例: pb → put $1 in $2            │
│  输入 pb bandage bag → put bandage  │
│  in bag                             │
│                                     │
│  [√] 启用此规则                      │
│                                     │
│      [保存]    [取消]    [删除]       │
└─────────────────────────────────────┘
```

### 6.3.2 Trigger 编辑表单

```
┌─────────────────────────────────────┐
│  编辑 Trigger                       │
│                                     │
│  名称: [当饿了时自动吃干粮________]    │
│                                     │
│  ── 匹配条件 ──                      │
│  匹配文本: [你饿了_______________]    │
│  匹配方式: ○ 通配符  ● 精确  ○ 正则  │
│  区分大小写: [ ]                     │
│                                     │
│  ── 动作列表 ──                      │
│  ┌─────────────────────────────┐    │
│  │ 1. [发送指令] [eat gan liang]│    │
│  │ 2. [通知___] [该吃饭了！___] │    │
│  │                    [+ 添加]  │    │
│  └─────────────────────────────┘    │
│                                     │
│  ▶ 高级设置 (可折叠)                 │
│    · 冷却时间: [500___] ms           │
│    · 最多触发: [0____] 次 (0=无限)   │
│    · [ ] 触发一次后禁用              │
│    · 事件过滤: [任意____] ▼          │
│                                     │
│  [√] 启用此规则                      │
│                                     │
│      [保存]    [取消]    [删除]       │
└─────────────────────────────────────┘
```

### 6.3.3 Timer 编辑表单

```
┌─────────────────────────────────────┐
│  编辑 Timer                         │
│                                     │
│  名称: [定时检查状态_______________]  │
│  间隔:  [30___] 秒                   │
│  指令:  [hp_______________________]  │
│  [ ] 仅执行一次 (默认循环)            │
│                                     │
│  [√] 启用此规则                      │
│                                     │
│      [保存]    [取消]    [删除]       │
└─────────────────────────────────────┘
```

### 6.3.4 规则列表视图

```
┌─────────────────────────────────────┐
│  规则管理                  [+ 新建]  │
│                                     │
│  ── Alias (3) ────────────────────  │
│  [✓] sc → score               [✎]  │
│  [✓] pb → put $1 in $2        [✎]  │
│  [ ] hb → hit bandit          [✎]  │
│                                     │
│  ── Trigger (2) ──────────────────  │
│  [✓] 饿了吃干粮               [✎]   │
│  [✓] 战斗提示高亮             [✎]   │
│                                     │
│  ── Timer (1) ────────────────────  │
│  [✓] 每30秒查看状态           [✎]   │
│                                     │
│  ═══════════════════════════════    │
│  [导出规则包] [导入规则包]            │
│  ⚡ 急停 (Ctrl+Shift+X)             │
└─────────────────────────────────────┘
```

## 6.4 模板市场

### 6.4.1 预置模板

v1 内置 8-12 个开箱即用模板（以 `.json` 文件打包在前端资源中）：

| 模板名 | 类型 | 说明 |
|--------|------|------|
| 常用缩写 | Alias 包 | `sc`→`score`、`hp`→`hp`、`i`→`inventory`、`sk`→`skills` 等 |
| 快速吃喝 | Trigger | 饿了→`eat gan liang`、渴了→`drink jiu dai` |
| 修炼守护 | Trigger + Timer | 打坐完毕自动继续、定时检查气血 |
| 战斗辅助 | Trigger | 受伤提示、敌人逃跑提示 |
| 出门装备 | Alias 序列 | `goout`→一键穿戴所有装备 |
| 回城路径 | Alias | `gohome`→ `#10 n;#5 w;enter`（MUD 多命令串联） |
| 批量拾取 | Trigger | 见金创药/干粮就自动 `get` |
| 门派日常提醒 | Timer | 定时提醒门忠、巡逻等日常任务 |

### 6.4.2 导入/导出

- **导出**：当前所有规则（含禁用的）序列化为 JSON，触发浏览器下载 `xkx-rules-{name}-{date}.json`
- **导入**：文件选择器读取 JSON，解析、校验、去重后合并到当前规则列表（新规则默认禁用，需手动启用）
- 导出格式见 §6.1 的 `RuleSet` 接口

---

# 7. 右侧面板

## 7.1 标签页：规则编辑器

即 §6.3 中定义的规则列表视图 + 编辑表单，是右侧面板的默认标签页。

## 7.2 标签页：角色状态

复用当前移动端的角色状态面板逻辑，重新布局为适合 320px 侧边栏的紧凑形式：

```
┌─────────────────────────┐
│  角色状态    [仪容] [属性] │
│                         │
│  ── 气血精内力 ────       │
│  气 ████████░░ 856/1000 │
│  精 ██████░░░░ 534/800  │
│  内力 ████░░░░░░ 320/800 │
│  精力 ████████░░ 680/800 │
│  食物 ██████████ 450/500 │
│  饮水 ██████████ 450/500 │
│                         │
│  ── 基本属性 ────         │
│  膂力 18 | 悟性 22       │
│  根骨 16 | 身法 20       │
│  攻击 150 (+15)          │
│  防御 120 (+10)          │
│                         │
│  ── 武功 ────             │
│  基本拳法 35/ 50 略知一二 │
│  基本剑法 30/ 45 初窥门径 │
│  太极神功 28/ 42 初学乍练 │
│  ... (滚动)              │
│                         │
│  ── 行囊 (12件) ──       │
│  □ 长剑 (weapon)        │
│  √ 布衣 (armor)         │
│  · 金创药 ×3            │
│  · 干粮 ×5              │
│  ... (滚动)              │
└─────────────────────────┘
```

### 7.2.1 数据来源

- 通过 `DesktopContext` 共享已有 `useGame` 的 `state.vitals`、`state.skills`、`state.inventory`、`state.score`、`state.lookText`、`state.enabled`
- 无需额外请求，状态更新由 `room.update` / `player.vitals` / `skills.update` / `inv.update` 等结构化事件驱动
- `look me` 文本在角色面板首次打开时触发静默请求（复用 `refreshCharacter` 逻辑）

---

# 8. 组件树

## 8.1 顶层分支

```
App.tsx
├── mode === 'desktop'
│   └── <DesktopApp />
│       └── <DesktopProvider>
│           ├── <LeftSidebar />
│           │   ├── <Compass />
│           │   ├── <NpcList />
│           │   ├── <ItemList />
│           │   └── <QuickActions />
│           ├── <TerminalPane />          (xterm.js)
│           │   └── <CommandInput />      (底部命令行)
│           └── <RightSidebar />
│               ├── Tab: <RuleEditor />
│               │   ├── <RuleList />
│               │   └── <RuleForm />
│               └── Tab: <StatusPanel />
│                   ├── <StatusVitals />
│                   ├── <StatusSkills />
│                   └── <StatusInventory />
│
└── mode === 'mobile'
    └── <MobileApp />   (现有 App.tsx 内容，不改动)
```

## 8.2 新增文件清单

```
web/app/src/
├── components/
│   ├── desktop/
│   │   ├── DesktopApp.tsx          # PC 顶层容器
│   │   ├── LeftSidebar.tsx         # 左侧栏
│   │   ├── Compass.tsx             # 方向罗盘
│   │   ├── TerminalPane.tsx        # xterm.js 终端容器
│   │   ├── CommandInput.tsx        # 底部命令行
│   │   ├── RightSidebar.tsx        # 右侧面板
│   │   ├── RuleEditor.tsx          # 规则编辑器
│   │   ├── RuleList.tsx            # 规则列表
│   │   ├── RuleForm.tsx            # 规则表单
│   │   ├── StatusPanel.tsx         # 角色状态面板
│   │   └── ModeSwitch.tsx          # 桌面/移动模式切换按钮
├── context/
│   └── DesktopContext.tsx          # PC 专属 Context Provider
├── lib/
│   ├── ruleEngine.ts               # 规则引擎核心
│   ├── ruleEngine.test.ts          # 单元测试
│   ├── ruleStorage.ts              # localStorage 读写
│   ├── ruleStorage.test.ts
│   ├── templateLibrary.ts          # 预置模板定义
│   └── commandHistory.ts           # 命令行历史
├── data/
│   └── ruleTemplates.ts            # 内置模板数据
```

## 8.3 现有文件修改

| 文件 | 改动 |
|------|------|
| `App.tsx` | 新增模式分支逻辑 |
| `hooks/useGame.ts` | 抽取 `DesktopContext` 所需共享方法 |
| `lib/types.ts` | 新增 `Rule*` 类型定义 |
| `lib/ws.ts` / `WsMessage` | 新增 `raw?: string` |
| `gateway/src/session.js` | `emit("text", ...)` 新增 `raw` 字段 |
| `package.json` | 新增 `@xterm/xterm` 及 addon 依赖 |

---

# 9. 实现路径与里程碑

## 9.1 Phase 1：基础架构（1-2 个迭代）

- [ ] 依赖安装：`@xterm/xterm` + `@xterm/addon-fit` + `@xterm/addon-webgl`
- [ ] 网关新增 `raw` 字段（`gateway/src/session.js`）
- [ ] `DesktopContext` 搭建
- [ ] `App.tsx` 模式分支
- [ ] 三栏布局骨架（硬编码数据，无规则引擎）
- [ ] xterm.js 挂载 + `raw` 文本流验证
- [ ] 底部命令行输入栏 + 回车发送

**验收**：浏览器打开桌面模式 → 登录 → 终端显示 ANSI 彩色 MUD 输出 → 命令行可输入指令并看到回显

## 9.2 Phase 2：左侧面板（1 个迭代）

- [ ] 方向罗盘组件（从 `room.exits` 数据驱动）
- [ ] NPC 列表组件（点击交互）
- [ ] 物品列表组件（点击交互）
- [ ] 快捷动作按钮
- [ ] 左右栏拖拽调整宽度

**验收**：左侧方向罗盘可点击移动、NPC/物品可点击交互、面板可拖拽调整宽度

## 9.3 Phase 3：规则引擎（2-3 个迭代）

- [ ] 规则数据模型 + TypeScript 类型
- [ ] `RuleEngine` 核心类（alias 替换、trigger 匹配、timer 调度）
- [ ] 限速与安全约束
- [ ] localStorage 存储 + JSON 导出/导入
- [ ] 单元测试（`ruleEngine.test.ts`、`ruleStorage.test.ts`）
- [ ] 可视化构建器 UI（`RuleEditor` + `RuleList` + `RuleForm`）
- [ ] 急停按钮与状态指示
- [ ] 预置模板库（8+ 模板）

**验收**：可创建 alias/trigger/timer → 规则生效（输入 `sc` 展开为 `score`、匹配"你饿了"自动发送指令）→ 导出 JSON → 清空后导入还原 → 急停一键禁用

## 9.4 Phase 4：右侧状态面板 + 模式切换（1 个迭代）

- [ ] 角色状态标签页（参考 §7.2）
- [ ] 模式切换按钮 + localStorage 持久化
- [ ] 现有 `CharacterSheet` / `TrainSheet` / `CombatSheet` / `MapSheet` / `HelpSheet` 在桌面模式下的适配（改为在右侧面板或弹出的 overlay 打开）

**验收**：右侧可切换查看规则编辑器/角色状态 → 模式切换按钮正常 → 移动端不受影响

## 9.5 Phase 5：打磨 + e2e（1 个迭代）

- [ ] 快捷键绑定
- [ ] 命令历史浏览（↑↓）
- [ ] 样式精调（暗色主题、中文字体优化）
- [ ] xterm.js 性能调优（WebGL addon）
- [ ] Playwright e2e 测试（桌面模式 → 登录 → 终端输出 → 规则生效 → 急停）
- [ ] 响应式边界情况（窗口大小变化、模式切换不丢状态）

**验收**：全流程 e2e 绿灯、窗口最小 800px 宽度可用、模式切换不丢连接

---

# 10. 风险与缓解

| 风险 | 概率 | 影响 | 缓解措施 |
|------|------|------|----------|
| xterm.js 在大输出量下卡顿 | 中 | 高 | 启用 WebGL addon；设置 `scrollback` 上限（5000 行）；可选启用流控 |
| `raw` 字段增加带宽 | 低 | 低 | `raw` 与 `text` 共享同一段 MUD 输出，仅多一份未 stripANSI 的副本，增量约 5-10% |
| 规则引擎 Bug 导致指令风暴 | 低 | 中 | 内置限速 + 急停 + 禁止循环；引擎在浏览器沙箱中，不影响服务端 |
| 桌面/移动模式切换丢状态 | 中 | 中 | 模式切换不重建 WebSocket，仅重建 UI 层；`useGame` hook 保持不变 |
| 字体在 xterm.js 中显示不佳 | 中 | 低 | 内嵌等宽中文开源字体（Sarasa Mono SC 或 LXGW WenKai Mono），通过 CSS `@font-face` 引入子集 |

---

# 11. 附录

## 11.1 参考资源

- [xterm.js 官方文档](https://xtermjs.org/)
- [xterm.js GitHub](https://github.com/xtermjs/xterm.js)
- 现有协议文档：[`docs/protocol-v1.md`](protocol-v1.md)
- 现有玩家文档：[`docs/PLAYER.md`](PLAYER.md)
- 现有网关实现：[`gateway/src/session.js`](../gateway/src/session.js)
- 现有服务端助手：[`adm/daemons/assistd.c`](../adm/daemons/assistd.c)

## 11.2 术语表

| 术语 | 说明 |
|------|------|
| xterm.js | 基于 WebGL/Canvas 的浏览器终端模拟器 |
| ANSI escape sequence | MUD 输出的颜色、样式、光标控制标记 |
| Zmud | 经典 Windows MUD 客户端，以 alias/trigger/timer 自动化闻名 |
| Trigger | 当 MUD 输出的某行匹配特定模式时，自动执行预定义动作 |
| Alias | 输入缩写词时，自动展开/替换为完整指令 |
| Timer | 按固定时间间隔自动执行指令 |
| webd.c | LPC 守护进程，为 Web 客户端推送结构化 JSON 事件 |
| assistd.c | LPC 守护进程，官方服务端挂机助手（修炼+战斗） |

## 11.3 决策记录

| # | 决策 | 选择 |
|----|------|------|
| 1 | PC 端架构 | `web/app` 内桌面模式，复用网关/协议 |
| 2 | 自动化策略 | 本地执行、显式启用、限速、急停、禁止无人值守导航 |
| 3 | 终端渲染 | xterm.js，ANSI 完整保留 |
| 4 | 规则制作 | 可视化构建器 > 模板市场 > NL 生成 |
| 5 | 会话模式 | 单会话，单 Tab 单角色 |
| 6 | 规则存储 | localStorage + JSON 导出/导入 |
| 7 | 匹配范围 | 文本行主通道 + 可选结构化事件过滤 |
| 8 | 输入交互 | 命令行（主）+ 侧边面板可点击 |
| 9 | 布局方案 | 经典三栏：左罗盘+面板 / 中终端 / 右编辑器+状态 |
| 10 | 终端方案 | xterm.js |
| 11 | 模式切换 | 手动切换 + 智能默认 + 记住选择 |
| 12 | 规则类型 v1 | Trigger + Alias + Timer |
| 13 | 数据管道 | 网关新增 `raw` 字段 |
| 14 | 状态共享 | `useGame` + `DesktopProvider` Context |
| 15 | 右侧标签页 v1 | 规则编辑器 + 角色状态 |
