<div align="center">

<span style="font-size: 28px;"><strong>扬州新手成长线移植推荐清单</strong></span><br/>
<span style="font-size: 18px;">新手到扬州 → 通过 NPC 挣钱变强 → 建立行走江湖的资本（pkuxkx → xkx2001）</span>

</div>

---

# 背景与目标

- **现状**：玩家已完成新手村全部任务，顺利抵达扬州。
- **目标**：让新手在扬州能够**通过人物（NPC）挣钱和变强**，建立行走江湖的能力与资本。
- **参考来源**：pkuxkx 的新手成长体系（任务框架、押镖、武馆、挖矿、门派任务）。

# 推荐移植清单（按优先级）

## 🔴 第一批：先搭骨架（决定后续所有内容能否落地）

| # | 系统 | pkuxkx 规模 | 作用 | 理由 |
|---|---|---|---|---|
| 1 | **任务框架** `feature/quest.c` + `newquest.c` | 312 + 46 行 | 任意 NPC 可发布"去某地杀怪/寻物/送信"任务，奖励 **经验+潜能+金钱** | "靠人物挣钱"的总开关。pkuxkx 扬州已注册进 `main_dir`（`/d/city:扬州`），xkx2001 无任何任务框架，所有 NPC 只能对话不能接活 |
| 2 | **核心成长骨架** `attribute.c`(1042行) / `skill.c`(971行) / `damage.h`(184行) | 目前 295/183/116 行 | 属性成长、技能升级、伤害计算 | 无完整骨架则"变强"上限锁死（技能通用逻辑 -81%） |

## 🟡 第二批：立刻能玩（新手到扬州当天就有事干）

| # | 系统 | pkuxkx 规模 | 作用 | 理由 |
|---|---|---|---|---|
| 3 | **押镖系统** `feature/escort.c` + `quest/escort/`（镖车/劫匪/收镖人/伙计） | 959 + 4 文件 | 押镖护送挣钱，**新手镖局(5-7级)劫匪≤2人**，pkuxkx 新手第一桶金来源 | xkx2001 扬州**已有福威镖局房间+林平之+镖头空壳**(28行)，正好做挂接点，移植量小、见效快 |
| 4 | **扬州武馆** `d/wuguan` | 7 文件 | 教头引导练功、练功房举石锁涨臂力、基础武功启蒙 | xkx2001 完全缺失；"变强"的第一站，成本极低 |

## 🟢 第三批：挣钱补充与变强主线

| # | 系统 | 说明 |
|---|---|---|
| 5 | **挖矿补全**（115 vs 13 处） | 零门槛挣钱，xkx2001 已有采药(112文件)+炼丹(drug)体系可配合，只补挖矿缺口 |
| 6 | **衙门/捕快任务** | xkx2001 已有 `yamen.c`/`butou.c`/`xunbu.c` 但无任务功能，给捕快挂上 quest 即可 |
| 7 | **门派任务** `quest/shaolin, wudang, gaibang...` | 拜师后的长期成长主线（第二批做，依赖门派体系完善） |

# 排序理由

1. **quest 框架是"人物"关键词的核心**——想让 NPC 发活挣钱，没有 quest.c 一切得从零写。它是所有任务的底座。
2. **押镖性价比最高**：xkx2001 已留好福威镖局接口（NPC 是空壳），把 pkuxkx 的 escort 公共函数 + 新手镖局配置搬过来即可运行。
3. **武馆成本最低**：7 个文件即可给扬州添一个练功据点。
4. **属性/技能骨架**是移植框架的第一梯队——xkx2001 的 `skill.c` 只剩 183 行（-81%），若不补齐，任务奖励的"经验/潜能"到玩家身上也涨不动。

# 关键路径速查

| 系统 | pkuxkx 关键文件 | xkx2001 现状 |
|---|---|---|
| 任务框架 | `feature/quest.c`、`feature/newquest.c`、`quest/quest.h` | 无任何任务框架 |
| 押镖 | `feature/escort.c`、`quest/escort/`（cart、cart_robber、cart_target、escort_huoji、escort_board、obj/） | `d/city/biaoju.c`（福威镖局房间）+ `npc/biaotou.c`（28 行空壳）+ `npc/linpingzhi.c` |
| 武馆 | `d/wuguan/`（7 文件：wuguan_damen/dating/liangong/xiuxi + npc/jiaotou、dizi + obj/suo） | 无（仅新手村有 `newbie_lxsz/npc/wushi.c`） |
| 成长骨架 | `feature/attribute.c`(1042)、`feature/skill.c`(971)、`include/combat/damage.h`(184) | 295 / 183 / 116 行 |
| 挖矿 | pkuxkx 115 处文件 | xkx2001 13 处 |
| 衙门任务 | 捕快/差役接 quest | `d/city/yamen.c`、`npc/butou.c`、`npc/xunbu.c` 已有但无任务 |
| 门派任务 | `quest/shaolin`、`quest/wudang`、`quest/gaibang` 等 | 0 |

# 下一步

- 从 **第 1 项（quest 任务框架）** 开始：做详细移植方案（差异 diff + 适配点 + 部署步骤）。
- 或直接做 **押镖**：基于现有福威镖局挂接 escort 体系。
