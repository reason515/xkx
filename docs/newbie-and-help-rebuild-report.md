<div align="center">

<span style="font-size: 28px;"><strong>新手村与帮助系统改造报告</strong></span><br/>
<span style="font-size: 18px;">柳秀山庄新手村 · 毕业属性重设 · Web 帮助中心</span>

</div>

---

本文档记录了对 `xkx2001-utf8` 项目的新手体验重塑，包含服务端（MUD LPC）、网关（Node Gateway）和前端（React Web）三个层面的改动。

# 一、改造目标

1. 新注册角色进入**柳秀山庄新手村**（源自 PKUXKX），不再进入侠客岛
2. 教学期间四维固定为 20/20/20/20，毕业时提供一次**不可逆的 80 点属性重分配**
3. 毕业生成一套结构化的 **Web 帮助中心**，取代旧有的纯文本 help 系统

# 二、服务端改动（FluffOS LPC）

## 2.1 新手村迁移

从 PKUXKX 镜像迁入 62 个新手村文件，构成柳秀山庄完整教学体验：

| 目录 | 文件数 | 说明 |
|---|---|---|
| `d/newbie_lxsz/` | 62 | 场景、NPC、物品、任务逻辑 |
| `kungfu/skill/taiyi-*.c` | 4 | 教学用太乙武功（太乙剑、太乙掌、太乙游、太乙神功） |
| `clone/misc/guider.c` | 1 | 路引物品 |
| `d/city/obj/yangjing.c` | 1 | 养精丹 |
| `feature/hockshop.c` | 1 | 当铺功能 |
| `inherit/char/banker.c` | 1 | 钱庄掌柜 |

### 2.1.1 38 步教学流程

新手村通过顺序数组控制进度，每步完成后自动更新 `newbie_village/quest_index`：

| 阶段 | 步数 | 教学内容 |
|---|---|---|
| 生存与探索 | 1-4 | hp 查看状态、look 观察场景、get/eat 获取食物、方向移动 |
| 叙事与交互 | 5-12 | ask 打听、give 给予、follow 跟随、knock 敲门、bath 洗浴、sleep 睡觉 |
| 经济与恢复 | 13-18 | localmaps 看地图、buy 购物、eat yao 吃药、票号存取款 |
| 战斗入门 | 19 | fight 切磋、halt 停止 |
| 拜师学艺 | 20-31 | bai 拜师、cha 查看、xue 学习、jifa 激发、bei 准备、lian 练习、perform 绝招 |
| 小型任务 | 32-34 | 购买物品、击杀幼虎、阅读书籍 |
| 毕业离村 | 35-38 | NPC 道别、坐马车去扬州 |

### 2.1.2 毕业状态机

新增三个状态字段：

```text
newbie_village/exit_state      = learning | attr_pending | graduated
newbie_village/attr_respec_used = 0 | 1
newbie_village/done             = 0 | 1
```

状态转换：

```text
创建角色 → learning（执行 38 步教学）
  → attr_pending（等待 Web 属性分配）
    → graduated（属性确认、清除教学内容、移至扬州）
```

## 2.2 登录路由改造

**文件：** `adm/daemons/logind.c`

新号路由优先级改为：

```text
巫师身份 → 正常进入
新角色、未毕业（newbie_village/done != 1）、经验 < 2000
  → /d/newbie_lxsz/weiminggu（柳秀山庄未明谷）

已毕业或高经验 → 正常 startroom
```

不再使用侠客岛相关入口（`xkd/intro_done`、`/d/xiakedao/shatan`）。

## 2.3 初始属性固定

**文件：** `adm/daemons/logind.c`（`random_gift` 函数）

```lpc
// 原逻辑：50 点随机分配，产生 10-30 的随机天赋
// 新逻辑：所有新角色固定 20/20/20/20
my["str"] = 20;
my["int"] = 20;
my["con"] = 20;
my["dex"] = 20;
```

创角流程跳过天赋选择提示和电子邮箱收集，直接选性别。

## 2.4 毕业属性确认

### 服务端命令

**文件：** `cmds/usr/newbieattr.c`

隐藏命令 `newbieattr`，供 Web 前端调用。校验规则：

- 仅 `attr_pending` 状态可调用
- 总和必须为 80
- 每项须在 10-30 之间
- 确认后不可重复调用

### 毕业结算

**文件：** `d/newbie_lxsz/mache.c`（`do_graduate` 函数）

确认属性后执行原子化结算：

1. 清除教学武功（太乙系列 + 所有基础技能）
2. 清除教学物品和货币
3. 重置 combat_exp 为 0
4. 发放毕业潜能奖励（约 2000+）
5. 设置 `done = 1`，记录扬州客店为出生点
6. 移至扬州广场

## 2.5 WebD 协议扩展

**文件：** `adm/daemons/webd.c`

新增三种 Web 事件：

| 事件类型 | 触发时机 | 用途 |
|---|---|---|
| `newbie.attribute_select` | 毕业属性待分配 | 通知前端弹出属性分配 UI |
| `newbie.attribute_confirmed` | 属性分配完成 | 前端关闭属性面板 |
| `newbie.quest_status` | 任务进度变更 | 更新前端任务面板 |

## 2.6 全局配置

**文件：** `include/globals.h`

新增宏定义：

```c
#define F_HOCKSHOP  "/feature/hockshop.c"
#define BANKER      "/inherit/char/banker"
```

# 三、Gateway 改动（Node.js WebSocket 网关）

## 3.1 登录流程适配

**文件：** `gateway/src/loginFsm.js`

LoginFsm 支持新旧两种 MUD 登录流程：

| 步骤 | 旧流程（当前服务器） | 新流程（未来） |
|---|---|---|
| BIG5 | 询问 → "n" | 同左 |
| 英文名 | 输入 ID | 同左 |
| 确认新建 | 确认 → "y" | 同左 |
| 中文名 | 输入 | 同左 |
| 密码 | 设定 → 确认 | 同左 |
| 天赋确认 | 显示 → 自动 "y" | 跳过 |
| 电子邮箱 | 输入 → 自动填写 | 跳过 |
| 性别 | 选择 → 自动回复 | 同左 |

# 四、前端改动（React 19 + Vite）

## 4.1 文件清单

| 文件 | 操作 | 说明 |
|---|---|---|
| `components/AttributeSheet.tsx` | 新增 | 毕业属性分配 UI |
| `components/QuestPanel.tsx` | 新增 | 新手村任务进度面板 |
| `components/HelpSheet.tsx` | 重写 | Web 帮助中心 |
| `components/MobileApp.tsx` | 修改 | 集成三个新组件 |
| `components/desktop/DesktopApp.tsx` | 修改 | 适配新 HelpSheet |
| `hooks/useGame.ts` | 修改 | 处理事件：attribute_select、quest_status 等 |
| `lib/types.ts` | 修改 | 新增 SheetKind "attribute"、attrSelectData、questIndex |
| `data/help/helpTypes.ts` | 新增 | 帮助文章类型定义 |
| `data/help/helpArticles.ts` | 新增 | 帮助文章库（20 篇） |
| `styles/app.css` | 修改 | 新增 ~350 行 CSS 样式 |

## 4.2 毕业属性选择 UI

**入口：** `newbie.attribute_select` 事件触发 → `sheet: "attribute"` → `AttributeSheet`

UI 结构：

- 叙事标题："踏入江湖前，定下你的根骨"
- 说明文案
- 可分配点数显示（需凑满 80）
- 四项属性卡片：膂力、悟性、根骨、身法
  - 初始值 → 最终值
  - `－` / `＋` 按钮（带边界限制）
  - 属性说明
- 四个快捷预设：均衡、剑客、苦修、求道
- "确认天赋"按钮 → 二次确认弹窗
- 服务端校验后执行毕业结算

## 4.3 新手任务面板

**入口：** `newbie.quest_status` 事件触发时更新 `state.newbieQuestIndex`

显示：

- 当前目标（高亮，带进度条）
- 第 N / 38 步
- 已完成步骤列表（可折叠）
- 后续步骤列表（可折叠）

## 4.4 Web 帮助中心

完全重写 `HelpSheet`，不再通过 MUD `help` 命令加载文本，改为前端预载的本地文章库。

### 信息架构

**首页：**
- 搜索框（支持自然语言关键词，如"怎么拜师"）
- 你现在需要知道（按玩家阶段推荐）
- 分类入口（10 个分类）

**分类页面：**
- 所属文章列表（标题 + 一句话摘要）

**文章页面：**
- 标题
- 摘要
- 正文（支持简单 HTML）
- 可执行动作按钮
- 相关文章链接

### 首发文章（20 篇）

| 分类 | 文章数 | 文章 ID |
|---|---|---|
| 新手指南 | 7 | newbie-start, newbie-status, newbie-explore, newbie-interact, newbie-combat, newbie-bai, newbie-economy |
| 毕业属性 | 2 | graduate-attribute, graduate-flow |
| 基础玩法 | 2 | basic-move, basic-hp |
| 战斗 | 1 | basic-combat |
| 武功 | 2 | skill-intro, skill-force |
| 经济 | 1 | basic-economy |
| 社交 | 1 | basic-social |
| 扬州入门 | 2 | yangzhou-basic, yangzhou-next |
| 规则 | 1 | rules |

## 4.5 阶段推荐

帮助中心根据玩家当前阶段推荐文章：

| 阶段 | 推荐内容 |
|---|---|
| `newbie_village`（新手村内） | 新手村入门、查看状态、探索与生存 |
| `graduate`（毕业选属性时） | 四维天赋详解、毕业流程 |
| `yangzhou`（已毕业） | 扬州生存指南、下一步做什么 |

# 五、测试与部署

## 5.1 e2e 测试更新

| 文件 | 改动 |
|---|---|
| `e2e/helpers.ts` | `completeDesktopIntro` 改为等待新手村加载 |
| `e2e/smoke.spec.ts` | 34 个侠客岛测试标记为 skip；`completeIntroFollow` 替换 |
| `e2e/smoke.spec.ts` | `loginAsNewbie` 保留原有逻辑（兼容旧 MUD 登录流程）|

## 5.2 部署验证

- 服务器：`119.45.224.68`
- 服务：MUD（8888）、Gateway（3001）、Nginx（80）
- 测试通过：5 个 e2e 用例（smoke + desktop）
- 已知限制：服务器端 MUD 仍使用旧版 gift/email 登录流程，Gateway LoginFsm 兼容处理

# 六、后续待办

1. 将服务器端 `logind.c` 升级为新流程（跳过 gift/email）
2. 补充门派帮助文章（当前仅展示通用资料）
3. 为已迁入的地图提供结构化地图指南
4. 增加更多新手村 e2e 测试覆盖
