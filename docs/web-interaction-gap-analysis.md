<div align="center">

<span style="font-size: 28px;"><strong>Web 前端新手村交互排查报告</strong></span><br/>
<span style="font-size: 18px;">柳秀山庄 38 步流程 · 交互覆盖面分析</span>

</div>

---

> 排查方式：逐一核对 `d/newbie_lxsz/` 中 `add_action`、NPC 特殊交互和场景 `item_desc`，
> 与 Web 前端 `parser.ts`、`EntitySheet.tsx`、`MobileApp.tsx` 进行对比。

---

# 一、已覆盖的交互（不需要改动）

| 交互 | 覆盖方式 | 涉及房间/步骤 |
|---|---|---|
| `quest` 查看当前任务 | `QuestPanel` 组件 + `newbie.quest_status` WebD 事件 | 全部 38 步 |
| 方向移动 | `ExitPad` 九宫格组件 | 全部房间 |
| NPC 打听 `ask` | `EntitySheet` → "打听"按钮 → 话题列表 | 游鲲翼、丫鬟等 |
| NPC 给予 `give` | `EntitySheet` → 行囊物品 → "给予"按钮 | 游鲲翼、武师 |
| NPC 跟随 `follow` | `EntitySheet` → "跟随"按钮 | 阿姝 |
| NPC 切磋 `fight` | `EntitySheet` → "切磋"按钮 | 武师 |
| NPC 拜师 `apprentice` | `EntitySheet` → "拜师"按钮 | 武师 |
| NPC 购买 `buy`/`list` | `EntitySheet` → "购买"按钮 | 伙计、老韩、老胡 |
| `sleep` 睡觉 | `parser.ts` 房间 `sleep_room` 检测 + 动作芯片 | 厢房 |
| `climb` 攀爬 | `parser.ts` 标签 + `climb up`/`climb down` 命令 | 未明谷、缓坡 |
| `knock` 敲门 | `parser.ts` 标签 + `敲xx` 动作 | 山庄大门 |
| `open` 开门 | `parser.ts` 标签 + `打开` 动作 | 走廊红漆大门 |
| `get` 拾取物品 | `parser.ts` + `EntitySheet` "拿"按钮 | 未明谷野果/葫芦 |
| 查看自身状态 | 角色面板 | 所有场景 |
| 装备/吃喝 | 物品交互 menu | 水果、酒袋等 |

# 二、未覆盖的交互（需修复）

## P0 — 阻塞流程的缺失

| # | 交互 | 位置 | 影响步骤 | 原因与修复方案 |
|---|---|---|---|---|
| 1 | `bai` 拜师 | 尚武堂 → 武师 | 步骤 20 | `canApprentice` 在 webd.c 中依赖 NPC 的 `family` 字段。武师 wushi 没有 `set("family",...)`，因此 Web 端不显示"拜师"按钮。<br/><br/>**修复：** 在武师 NPC 的 `create()` 中添加 `set("family/generation", 1)` 或修改 webd.c 的 canApprentice 判定逻辑。 |
| 2 | `qu` 乘车 | 车马行 | 步骤 38（毕业） | `qu` 命令在 parser.ts 中无标签和按钮。玩家无法通过 Web 界面乘车离开新手村。<br/><br/>**修复：** parser.ts 增加 `qu` 标签；车马行房间触发自定义场景动作芯片。 |
| 3 | `xia` 下车 | 马车上 | 步骤 38 | `xia` 命令无 Web 支持。<br/><br/>**修复：** parser.ts 增加 `xia` 标签。 |

## P1 — 影响体验但可绕过

| # | 交互 | 位置 | 影响步骤 | 原因与修复方案 |
|---|---|---|---|---|
| 4 | `bath` 洗澡 | 浴室（南浴室/女浴室） | 步骤 11-12 | `bath` 命令完全无 Web 支持。玩家无法通过按钮完成洗澡步骤。<br/><br/>**修复：** parser.ts 增加 `bath` 标签；浴室房间 item_desc 可点击触发。 |
| 5 | `withdraw` / `qu` 取款 | 票号 → 柳住钱 | 步骤 17 | 票号老板 NPC 虽然 `inherit BANKER`，但 `withdraw` 无 Web 按钮。Web EntitySheet 没有"取款"动作。<br/><br/>**修复：** EntitySheet 增加对 BANKER 的取款入口，或 parser.ts 增加 `qu` 标签。 |
| 6 | `localmaps` 查看地图 | 正厅（zhengting） | 步骤 16 | 当前项目无 `localmaps` 命令。玩家被要求"使用 localmaps 命令查看票号的位置"但无法操作。<br/><br/>**修复：** 添加简易 `localmaps` 命令，或在 Web 地图组件中增加局部小地图。 |
| 7 | `changegift` 改天赋 | 游鲲翼_fb | 毕业属性 | PKU 的本地属性重分配 NPC。当前已用 Web `AttributeSheet` 替代，此 NPC 的 `add_action` 不再需要。 |

# 三、低优先级缺口

| # | 交互 | 位置 | 说明 |
|---|---|---|---|
| 8 | `hire/gu` 雇车 | 车马行 | `qu` 的别名，车马行场景有 `item_desc` 提示 "gu 或 hire 去扬州"。可随 `qu` 一起支持。 |
| 9 | `chat*` 表情 | 杏子林_fb | 非教学关键路径。Web 已有终端输入框可输入。 |
| 10 | 复杂 `get` | 藏书阁 | `get book from shujia`（从书架取书）。parser.ts 的 get 逻辑需支持带 `from` 的复合参数。 |

# 四、NPC 交互字段检查

| NPC | 所需 Web 动作 | 当前字段状态 | 修复 |
|---|---|---|---|
| 武师 (wushi) | 拜师、查看技能、学习 | `canApprentice: 0`（缺 family） | 需添加 `set("family")` |
| 柳住钱 (liuzhuqian) | 取款 | `inherit BANKER`，但无 Web 取款按钮 | EntitySheet 增加银行操作 |
| 药铺 (yaopu) | 买药 | 需验证 `canTrade` | 待确认 |
| 铁匠铺 (tiejiangpu) | 买武器 | 需验证 `canTrade` | 待确认 |
| 杂货铺 (zahuopu) | 买食盒 | 需验证 `canTrade` | 待确认 |

# 五、修复清单（按优先级排序）

```
P0-1:  武师 wushi → 添加 set("family", ...)                [5 分钟]
P0-2:  parser.ts 增加 qu / xia 标签                         [15 分钟]  
P0-3:  车马行场景增加乘车动作芯片                            [15 分钟]
P1-4:  parser.ts 增加 bath 标签                              [5 分钟]
P1-5:  浴室场景增加 item_desc 可点击洗澡                     [10 分钟]
P1-6:  localmaps 简易命令或 Web 地图指引                     [30 分钟]
P1-7:  票号柳住钱支持取款按钮                                [15 分钟]
P2-8:  hire/gu 别名                                          [5 分钟]
P2-9:  复杂 get 支持                                         [15 分钟]
```

**预估总工时：约 2 小时**
