<div align="center">

<span style="font-size: 28px;"><strong>xkx2001-utf8 vs pkuxkx 游戏机制全面对比</strong></span><br/>
<span style="font-size: 18px;">用于决策哪些内容需要借鉴/复刻 pkuxkx</span>

</div>

---

# 1. 角色创建

| 项目 | xkx2001 | pkuxkx | 建议 |
|------|---------|--------|------|
| 初始四维 | 固定 20/20/20/20 | 随机 10-30（40点自由分配，可重掷） | 🔶 可考虑 |
| 毕业重分配 | ✅ `newbieattr` 命令 | ❌ 无 | 保留现有 |
| 福缘/容貌 | 随机 10-30 | 随机 10-30 | 一致 |
| 初始潜能 | 99 | 99 | 一致 |
| 初始金钱 | 0（注释掉了） | 有初始银两 | 🔶 可考虑 |

**pkuxkx 的 `random_gift()`** (logind.c:303-329)：
```c
// 40 点随机分配到 str/int/con/dex，每项上限 30
for (i = 0; i < 40; i++) {
    switch (random(4)) {
        case 0: if (tmpstr < 30) tmpstr++; else i--; break;
        case 1: if (tmpint < 30) tmpint++; else i--; break;
        case 2: if (tmpcon < 30) tmpcon++; else i--; break;
        case 3: if (tmpdex < 30) tmpdex++; else i--; break;
    }
}
```

---

# 2. 气血/精/内力/精力计算 ⚠️ 差异极大

| 项目 | xkx2001 | pkuxkx |
|------|---------|--------|
| `feature/attribute.c` | **89 行** | **1042 行** |
| `query_max_qi()` | ❌ 不存在 | ✅ 动态计算 |
| `query_max_jing()` | ❌ 不存在 | ✅ 动态计算 |
| `query_max_neili()` | ❌ 不存在 | ✅ 支持各内功自定义 |
| `query_max_jingli()` | ❌ 不存在 | ✅ 动态计算 |

## 2.1 气血 (max_qi) 公式对比

| 条件 | xkx2001 | pkuxkx |
|------|---------|--------|
| 年龄≤14 | `100` | `100 + sep_force*2` |
| 15-30 | `100 + (age-14)*(con+str)/2` | `100 + (age-14)*con + sep_force*2` |
| 31-60 | `100 + (con+str)*8` | `con*16 + 100 + sep_force*2` |
| >60 | 同 31-60（无衰减） | `con*16+100 - (age-60)*(6+(age-60)/7) + sep_force*2` |
| 内力加成 | ❌ 无 | `+ max_neili / 4` |
| 等级加成 | ❌ 无 | ✅ `level_hp` 公式 |
| **特殊技能加成** | ❌ 无 | ✅ 太极神功、道家养生、武当/峨眉/少林/大理 技能增幅 |

**pkuxkx 特殊技能加成**（xkx2001 完全缺失）：
- 太极神功：每 30 级 +1 气血（道家练气）
- 九阳/光明圣火功 ≥120 级：60 岁后不衰减
- 道家养生 / 禅宗心法 / 大乘涅磐功 ≥120 级：60 岁后不衰减
- 少林峨眉大理的佛学技能：30 岁前补精、30 岁后长精

## 2.2 精神 (max_jing) 公式对比

| 条件 | xkx2001 | pkuxkx |
|------|---------|--------|
| 年龄≤14 | `100` | `100 + sep_force` |
| 15-30 | `100 + (age-14)*(int+con)/2` | `100 + (age-14)*int + sep_force` |
| 31+ | `(int+con)*8 + 100` | `int*16 + 100 + sep_force` |
| 70 岁后衰减 | ✅ `-(age-70)*(int+con)/7` | ❌ 不衰减（但被道家/禅宗技能抵消） |
| 内力加成 | ❌ 无 | `+ max_neili / 12` |
| 等级加成 | ❌ 无 | ✅ `level_jing` 公式 |

**xkx2001 特有**（pkuxkx 无）：70 岁后精神衰减；
**pkuxkx 特有**（xkx2001 无）：佛道技能可逆转年龄衰减、等级加成

## 2.3 内力 (max_neili) 公式

| 项目 | xkx2001 | pkuxkx |
|------|---------|--------|
| 基础公式 | 仅 `race/human.c` 初始值 | `query_max_neili()` 动态计算 |
| 各内功自定义 | ❌ 无 | ✅ `SKILL_D(force)->query_max_neili(ob)` |
| 内功类型系数 | ❌ 无 | ✅ `force_character("TYPE_NEILI")` |
| 上限 buff 系统 | ❌ 无 | ✅ `max_neili_buff()` |

## 2.4 精力 (max_jingli) 公式

| 项目 | xkx2001 | pkuxkx |
|------|---------|--------|
| 动态计算 | ❌ 无 | ✅ `query_max_jingli()` |
| 内功系数 | ❌ | ✅ `force_character("TYPE_JINGLI")` |
| 上限 | 仅初始值 | `force_skill * jingli_times` |

**结论**：xkx2001 的 vitals 系统严重简化，完全缺失技能加成体系。

---

# 3. 战斗系统 ⚠️ 差异极大

| 项目 | xkx2001 | pkuxkx |
|------|---------|--------|
| 伤害计算 | 简化版（仅 damage_msg 描述） | `calc_damage()` 完整系统 |
| 躲闪/招架 | 基础 | `do_attack_result` 标记 (0命中/1躲闪/2招架) |
| 伤害吸收 | ❌ 无 | ✅ `absorb()` (乾坤大挪移、铁布衫等) |
| 反击系统 | ❌ 无 | ✅ TYPE_RIPOSTE / TYPE_QUICK |
| 连击 | ❌ | ✅ 多段攻击 |
| 战斗文件 | 单个 combatd.c | combatd.c + `combat/damage.h` + 各门派技能 |

pkuxkx 战斗流程：
```
do_attack → 命中判断 → calc_damage → absorb 吸收 → 实际伤害 → 反击判定
```

xkx2001 战斗流程：
```
do_attack → 命中判断 → 直接伤害 → damage_msg 描述
```

---

# 4. 潜能系统 ✅ 已修复

| 项目 | xkx2001 (修复前) | xkx2001 (修复后) | pkuxkx |
|------|-----------------|-----------------|--------|
| `max_potential` 公式 | `100+sqrt(exp)/10+...` | 仍保留但**不强制** | ❌ 无 |
| 登录时裁剪 | ✅ `updated.c` 强制 | ❌ **已移除** | ❌ |
| 自由累积 | ❌ 受限于 exp | ✅ **已放开** | ✅ |
| `learned_points` 双轨 | ✅ 有（武师等） | ✅ 有 | ✅ 有（更广泛使用） |
| 显示修正 | ❌ 裸 potential | ✅ `potential - learned_points` | ✅ `potential - learned_points` |

---

# 5. 学习与练习

| 项目 | xkx2001 | pkuxkx |
|------|---------|--------|
| 学习精耗 | `150/int` | `150/int` | 一致 |
| 首次学习加耗 | ×2 (gin_cost *= 2) | ×2，但有 `gin_cost *= 10` 额外路径 | 略有差异 |
| `learned_points` 使用 | 武师/黄药师等少数 NPC | 更广泛（几乎所有师父） | 🔶 |
| 实战经验检查 | `my_skill³ / 10 > combat_exp` | 更复杂的检查 (`深层次钻研`) | 🟢 可保留 |
| 配偶互学 | 简化 | 有经验门槛 | 保留 |
| 练习消耗 | 类似 | 类似 | 一致 |

---

# 6. 年龄系统

| 项目 | xkx2001 | pkuxkx |
|------|---------|--------|
| 精神衰减开始 | 70 岁 | 无衰减（被技能抵消） |
| 气血衰减开始 | 无 | 60 岁（可被技能抵消） |
| 衰减公式 | `max_jing -= (age-70)*(int+con)/7` | `maxhp -= (age-60)*(6+(age-60)/7)` |
| 技能抵消 | 部分（佛道技能固定加成） | 完整（九阳/道家/禅宗 ≥120 完全抵消） |

---

# 7. 经济系统

| 项目 | xkx2001 | pkuxkx |
|------|---------|--------|
| 初始金钱 | 0 | 有（1000 银两？） |
| 基础货币 | silver | silver |

---

# 8. 建议优先级（汇总更新）

| 优先级 | 系统 | 原因 |
|--------|------|------|
| 🔴 **高** | **Vitals 气血公式** | `feature/attribute.c` 89行 vs 1042行，技能加成体系完全缺失 |
| 🔴 **高** | **战斗伤害计算** | 缺失 `calc_damage` 体系（`damage.h` 184行） |
| 🔴 **高** | **特技系统** | 19 个特技整个目录缺失 |
| 🔴 **高** | **9 个缺失门派** | 大轮寺/白驼/日月/红花会/天龙/侠客岛/天地会/五指山/PKer |
| 🔴 **高** | **任务系统** | 门派任务/襄阳保卫/门派争胜/剿匪/比武/国战 六大系统全缺 |
| 🔴 **高** | **62 个缺失区域** | 103 vs 41 区域，大量主城/任务区缺失 |
| 🟡 **中** | **内功子技能** | 缺 5 个（enhance/inspire/shield 等） |
| 🟡 **中** | **技能引擎** | `feature/skill.c` 971→183 行 |
| 🟡 **中** | **角色系统** | 缺转世/宠物/宝石/排行榜/易容等 |
| 🟡 **中** | **社交系统** | 缺在线列表/组队/BBS 集成 |
| 🟢 **低** | **初始属性/金钱** | 可后续优化 |
| 🟢 **低** | **乐理/职业/大知识** | 锦上添花 |

---

# 9. 武功系统对比 ⚠️ 差异极大

## 9.1 技能数量

| 目录 | pkuxkx | xkx2001 | 差异 |
|------|--------|---------|------|
| `kungfu/skill/` | **717** 个文件 | **363** 个文件 | 缺失约 50% |
| `kungfu/skill/force/` (内功子技能) | 9 个 | 4 个 | 缺 5 个 |
| `kungfu/class/` (门派 NPC) | 25 个门派 | 19 个门派 | 缺 8 个门派 |
| `kungfu/music/` (乐理) | 17 个 | ❌ 不存在 | 整个目录缺失 |
| `kungfu/special/` (特技) | 19 个 | ❌ 不存在 | 整个目录缺失 |
| `kungfu/profession/` (职业) | 2 个 | ❌ 不存在 | 整个目录缺失 |
| `kungfu/vast/` (大知识) | 3 个 | ❌ 不存在 | 整个目录缺失 |
| `kungfu/player_skill/` (自创) | 4 个 | ❌ 不存在 | 整个目录缺失 |

## 9.2 门派对比

### pkuxkx 独有的门派（xkx2001 完全没有）

| 门派 | 目录 | NPC 数量 |
|------|------|---------|
| 白驼山 | `btshan/` | 有 |
| 大轮寺 | `dalunsi/` | 有 |
| 红花会 | `honghua/` | 有 |
| 日月教 | `riyuejiao/` | 有 |
| 天地会 | `tiandihui/` | 有 |
| 天龙寺 | `tianlong/` | 有 |
| 五指山 | `wuzhishan/` | 有 |
| 侠客岛 | `xiakedao/` | 有 |
| 玩家杀手 | `pker/` | 有 |

### xkx2001 独有的门派（pkuxkx 没有）

| 门派 | 说明 |
|------|------|
| 白驼 | `baituo/` |
| 西夏 | `xixia/` |
| 血刀门 | `xuedao/` |
| 大雪山 | `xueshan/` |
| 峨嵋 | `emei/`（34 NPC，pkuxkx 0） |
| 杂项 | `misc/` |

## 9.3 内功子技能 (force/ sub-skills)

| 子技能 | pkuxkx | xkx2001 | 说明 |
|--------|--------|---------|------|
| `heal.c` | ✅ | ✅ | 疗伤 |
| `recover.c` | ✅ | ✅ | 恢复 |
| `regenerate.c` | ✅ | ✅ | 回精 |
| `refresh.c` | ❌ | ✅ | xkx2001 独有 |
| `enhance.c` | ✅ | ❌ | **攻击增强** |
| `inspire.c` | ✅ | ❌ | **激励（buff）** |
| `jing.c` | ✅ | ❌ | **精养** |
| `lifeheal.c` | ✅ | ❌ | **生命治疗** |
| `qi.c` | ✅ | ❌ | **气恢复** |
| `shield.c` | ✅ | ❌ | **护盾** |

## 9.4 特技系统 (special/)

pkuxkx 有 19 个特技，xkx2001 完全没有：

| 特技 | 文件 | 效果 |
|------|------|------|
| 敏捷 | `agile.c` | 提高躲闪 |
| 长生 | `athanasy.c` | 延长寿命 |
| 金蝉脱壳 | `chainless.c` | 脱离战斗 |
| 混乱 | `confuse.c` | 使敌人混乱 |
| 强体 | `constitution.c` | 增加体质 |
| 固本 | `corporeity.c` | 增加气血 |
| 神行 | `cross.c` | 提高移动速度 |
| 宿命 | `destiny.c` | 改变命运 |
| 毁灭 | `devastate.c` | 暴击增强 |
| 聚精 | `energy.c` | 增加精力 |
| 贪婪 | `greedy.c` | 增加金钱掉落 |
| 养生 | `health.c` | 增加恢复 |
| 睿智 | `intellect.c` | 增加悟性 |
| 铁布衫 | `ironskin.c` | 增加防御 |
| 幸运 | `lucky.c` | 增加福缘 |
| 神力 | `might.c` | 增加臂力 |
| 察觉 | `perceive.c` | 看穿隐身 |
| 亲和 | `sociability.c` | 提高 NPC 好感 |
| 灵性 | `spirituality.c` | 增加灵性 |

## 9.5 技能引擎差异

| 特性 | pkuxkx | xkx2001 |
|------|--------|---------|
| `feature/skill.c` | 971 行 | 183 行 |
| `inherit/skill/skill.c` | 252 行 | 182 行 |
| `improve_skill()` 参数 | `(skill, amount, weak_mode, type)` 4参数 | `(skill, amount, weak_mode)` 3参数 |
| 技能树系统 | ✅ 支持三级父子关系（`skill::sub::sub`） | ❌ 不支持 |
| 自创武功 | ✅ `kungfu/player_skill/` | ❌ 不支持 |
| `query_wprepare()` | ✅ 支持双手武器准备 | ❌ 不支持 |
| `skill.h` | 含 `query_wprepare` | 无 |

## 9.6 战斗伤害计算头文件

| 文件 | pkuxkx | xkx2001 |
|------|--------|---------|
| `include/combat/damage.h` | ✅ **184 行**（`calc_damage` 函数） | ❌ **完全缺失** |

`calc_damage` 包含：
- 武器伤害 + 空手伤害分支
- 单系伤害支持 (`dmg_map`)
- 内功加持伤害
- 技能等级影响
- 防御减伤计算
- 周天/经脉等额外因素

xkx2001 的 combatd.c 直接使用简化公式，缺少整个 `calc_damage` 体系。

## 9.7 门派规模对比

| 门派 | pkuxkx NPC | xkx2001 NPC | 差异 |
|------|-----------|-------------|------|
| 少林 | 83 | 68 | -15 |
| 武当 | 28 | 24 | -4 |
| 丐帮 | 33 | 20 | -13 |
| 华山 | 19 | 16 | -3 |
| 峨嵋 | 0 | 34 | +34 |
| 大理 | 25 | 33 | +8 |
| 明教 | 14 | 2 | -12 |
| 慕容 | 15 | 5 | -10 |
| 星宿 | 12 | 8 | -4 |
| 全真 | 8 | 15 | +7 |
| 神龙 | 11 | 15 | +4 |
| 灵鹫 | 13 | 15 | +2 |

pkuxkx 独有门派（xkx2001 完全没有）：

| 门派 | NPC 数 |
|------|--------|
| 大轮寺 | 16 |
| 白驼山 | 8 |
| 日月教 | 8 |
| 红花会 | 7 |
| 天龙寺 | 6 |
| 侠客岛 | 6 |
| 天地会 | 5 |
| 五指山 | 0 |
| 玩家杀手 | 1 |

---

# 10. 角色系统对比

## 10.1 角色创建与发展

| 系统 | pkuxkx | xkx2001 |
|------|--------|---------|
| 转世/重生 | ✅ `reborn/` 区域 | ❌ 无 |
| 结婚系统 | ✅ `marry/` 区域 | ✅ `marryd.c`（简化） |
| 师门系统 | ✅ `familyd.c` | ❌ 无独立 daemon |
| 称号系统 | ✅ `rankd.c` | ✅ `rankd.c` |
| 等级系统 | ✅ `level` 属性影响气血 | ❌ 无 |
| 婚姻区域 | ✅ `d/marry/` | ❌ 无 |
| 帮派/自建 | ✅ `family-private/` | ❌ 无 |
| 玩家排行榜 | ✅ `topd.c` `toptend.c` | ❌ 无 |
| 统计系统 | ✅ `statisticd.c` | ❌ 无 |
| 保镖系统 | ✅ `rewardd.c` | ❌ 无 |
| 宠物系统 | ✅ `petd.c` | ❌ 无 |
| 易容系统 | ✅ `disguised.c` | ❌ 无 |
| 宝石系统 | ✅ `gemd.c` | ❌ 无 |

## 10.2 在线/社交

| 系统 | pkuxkx | xkx2001 |
|------|--------|---------|
| 在线用户列表 | ✅ `onlineuserd.c` | ❌ |
| 聊天监控 | ✅ `monitord.c` | ❌ |
| BBS 集成 | ✅ `bbsd.c` | ❌ |
| QQ 机器人 | ✅ `qqbotd.c` | ❌ |
| IM 系统 | ✅ `im_d.c` | ❌ |

---

# 11. 任务系统对比

## 11.1 任务引擎

| 系统 | pkuxkx | xkx2001 |
|------|--------|---------|
| 门派任务 `taskd.c` | ✅ **752 行** | ❌ |
| 襄阳任务 `xytaskd.c` | ✅ **1023 行** | ❌ |
| 门派争胜 `ftaskd.c` | ✅ **237 行** | ❌ |
| 剿匪系统 | ✅ `jiaofeid.c` + `d/jiaofei/` | ❌ |
| 比武系统 | ✅ `biwud.c` + `d/biwu/` | ❌ |
| 国战系统 | ✅ `d/guozhan/` | ❌ |
| 故事/事件 | ✅ `storyd.c` `eventd.c` | ❌ |
| 新手任务 | ✅ `newbie/` + `newbie_lxsz/` | ✅ `newbie_lxsz/` |

## 11.2 任务类型对比

| 任务类型 | pkuxkx | xkx2001 |
|----------|--------|---------|
| 门派日常任务 | ✅ taskd | ❌ |
| 襄阳保卫战 | ✅ xytaskd (1023行) | ❌ |
| 门派争胜 | ✅ ftaskd | ❌ |
| 剿匪 | ✅ jiaofei | ❌ |
| 比武 | ✅ biwu | ❌ |
| 国战 | ✅ guozhan | ❌ |
| 随机事件 | ✅ eventd + natured | ✅ natured (仅自然) |
| 新手指引 | ✅ newbie | ✅ newbie_lxsz (35步) |
| 故事任务 | ✅ storyd | ❌ |

---

# 12. 地区/地图对比

## 12.1 规模

| 指标 | pkuxkx | xkx2001 |
|------|--------|---------|
| 区域总数 | **103** | **41** |
| 缺失区域 | — | 62 个 |

## 12.2 pkuxkx 有而 xkx2001 无的主要区域

| 区域 | 类型 |
|------|------|
| 长安城 `changan/` | 主城 |
| 洛阳城 `luoyang/` | 主城 |
| 成都 `chengdu/` | 主城 |
| 福州 `fuzhou/` | 主城 |
| 昆明 `kunming/` | 主城 |
| 兰州 `lanzhou/` | 主城 |
| 灵州 `lingzhou/` | 主城 |
| 江州 `jiangzhou/` | 主城 |
| 南昌 `nanchang/` | 主城 |
| 苏州 `suzhou/` | 主城 |
| 镇江 `zhenjiang/` | 主城 |
| 襄阳南 `xiangyangnan/` | 主城 |
| 应天府 `yingtianfu/` | 主城 |
| 长安北 `yingtiannorth/` | 区域 |
| 长安南 `yingtiansouth/` | 区域 |
| 回族 `huijiang/` | 区域 |
| 蒙古 `menggu/` | 区域 |
| 苗族 `miaojiang/` | 区域 |
| 天山 `northmountain/` | 区域 |
| 南山 `southmountain/` | 区域 |
| 凌霄城 `lingxiao/` | 雪山门派 |
| 绝情谷 `jueqinggu/` | 区域 |
| 钓鱼岛 `diaoyudao/` | 区域 |
| 归云庄 `guiyunzhuang/` | 区域 |
| 绿柳山庄 `lvliu/` | 区域 |
| 麒麟村 `qilincun/` | 区域 |
| 晋阳 `jinyang/` | 区域 |
| 金蛇 `jinshe/` | 区域 |
| 汝阳王府 `ruyang-wangfu/` | 区域 |
| 平西王府 `pingxiwangfu/` | 区域 |
| 丝绸之路 `silk/` | 区域 |
| 长江 `changjiang/` + `changjiangnorth/` | 水道 |
| 黄河 `huanghenorth/` | 水道 |
| 侠客岛 `xiakedao/` | 特殊 |
| 楼兰 `bhdao/` | 特殊 |
| 门派自建 `family-private/` | 特殊 |
| 玩家对战 `pvp/` `pker/` | 特殊 |
| 婚礼 `marry/` | 特殊 |
| 礼品 `gift/` | 特殊 |
| 天门 `wizard/` (full) | 管理 |

## 12.3 xkx2001 独有的区域

| 区域 | 说明 |
|------|------|
| 黑木崖 `heimuya/` | 日月教总坛 |
| 衡山 `hengshan/` | 五岳之一 |
| 黄山 `huangshan/` | |
| 昆仑 `kunlun/` | |
| 祁连 `qilian/` | |
| 嘉兴 `jiaxing/` | |
| 太湖 `taihu/` | |
| 桃花村 `taohuacun/` | |
| 天鹰教 `tianying/` | |
| 万寿山庄 `wanshou/` | |
| 终南山 `zhongnan/` | |
| 森林 `forest/` | |
| 岛屿 `island/` | |
| 洞庭湖 `dongtinghu/` | |
| 佛山 `foshan/` | |

---

# 13. 守护进程 (Daemon) 对比

## 13.1 pkuxkx 独有的 daemon

| Daemon | 功能 | 行数 |
|--------|------|------|
| `taskd.c` | 门派任务系统 | 752 |
| `xytaskd.c` | 襄阳保卫战 | 1023 |
| `ftaskd.c` | 门派争胜 | 237 |
| `eventd.c` | 事件系统 | — |
| `storyd.c` | 故事系统 | — |
| `familyd.c` | 师门系统 | — |
| `onlineuserd.c` | 在线用户 | — |
| `topd.c` + `toptend.c` | 排行榜 | — |
| `statisticd.c` | 统计 | — |
| `rewardd.c` | 保镖奖励 | — |
| `petd.c` | 宠物 | — |
| `disguised.c` | 易容 | — |
| `gemd.c` | 宝石 | — |
| `biwud.c` | 比武 | — |
| `businessd.c` | 商业 | — |
| `jiaofeid.c` | 剿匪 | — |
| `dropmoney.c` | 掉钱 | — |
| `antirobotd.c` | 反机器人 | — |
| `mapd.c` | 地图 | — |
| `groupd.c` | 组队 | — |

## 13.2 xkx2001 独有的 daemon

| Daemon | 功能 |
|--------|------|
| `assistd.c` | Web 挂机助手 |
| `marryd.c` | 结婚（简化版） |
| `s_combatd.c` | 简化战斗 |
| `xkd_pathd.c` | 侠客岛路径 |
| `languanged.c` | 语言转换 |
| `editord.c` | 编辑器 |

---

# 14. 命令系统对比

## 14.1 规模

| 指标 | pkuxkx | xkx2001 |
|------|--------|---------|
| 命令总数 | **385** | **236** |
| 命令目录数 | 10 | 8 |

## 15.2 pkuxkx 独有的命令目录

| 目录 | 用途 | 文件数 |
|------|------|--------|
| `cmds/app/` | 系统管理工具 | 24 |
| `cmds/guider/` | 新手导师 | 10 |
| `cmds/stunt/` | 特技/绝招 | 3 |

## 15.3 pkuxkx 独有的重要命令

| 命令 | 类型 | 功能 |
|------|------|------|
| `enhance` | std | **装备强化** |
| `forge` | std | **锻造** |
| `combine` | std | **装备合成** |
| `merge` | std | **宝石合并** |
| `makegem` | std | **宝石制作** |
| `insert` | std | **宝石镶嵌** |
| `guard` | std | **护卫** |
| `change_special` | std | **切换特技** |
| `levelup_special` | std | **升级特技** |
| `changewield` | std | **切换双持** |
| `cook` | std | **烹饪** |
| `loot` | std | **搜刮尸体** |
| `research` | skill | **技能研究** |
| `identify` | skill | **鉴定物品** |
| `transform` | skill | **武功转化** |
| `xiulian` | skill | **修炼** |
| `createskill` | skill | **自创武功** |
| `selfpractice` | skill | **自练武功** |
| `selfthinking` | skill | **自悟武功** |
| `special` | skill | **特技管理** |
| `professions` | skill | **职业管理** |
| `play` | skill | **演奏乐理** |
| `wbei` | skill | **武功备选** |
| `weapons` | skill | **多武器** |
| `qiecuo` | skill | **切磋** |

---

## 14.x

---

# 15. 装备/物品系统对比

## 15.1 克隆物品

| 指标 | pkuxkx | xkx2001 |
|------|--------|---------|
| 物品文件总数 | **737** | **480** |
| 物品目录数 | 26 | 21 |

## 15.2 pkuxkx 独有的物品系统

| 系统 | 目录 | 说明 |
|------|------|------|
| 宝石系统 | `clone/gem/` | 宝石制作/镶嵌/合成 |
| 自创武器 | `clone/self_weapon/` | 玩家自制武器 |
| 标准武器 | `clone/stdweapon/` | |
| 标准宠物 | `clone/stdpet/` | |
| 宠物 | `clone/pet.c` | |
| 礼品 | `clone/gift/` | 系统奖励 |
| 故事物品 | `clone/story/` | 任务剧情物品 |
| 鲜花 | `clone/flower/` | |

## 15.3 xkx2001 独有的物品系统

| 系统 | 目录 | 说明 |
|------|------|------|
| 暗器 | `clone/anqi/` | |
| 草药 | `clone/herb/` | |
| 坐骑 | `clone/horse/` | |
| 船 | `clone/ship/` | |
| 特殊物品 | `clone/special/` | |
| 房间 | `clone/room/` | |

---

# 16. 继承/特性系统对比

## 16.1 核心特性 (feature/)

| 指标 | pkuxkx | xkx2001 |
|------|--------|---------|
| feature 文件数 | **68** | **38** |

## 16.2 pkuxkx 独有的 feature

| Feature | 功能 |
|---------|------|
| `escort.c` | 保镖系统 |
| `gems.c` / `gems2.c` | 宝石系统 |
| `kungfu.c` | 武功特性 |
| `material.c` | 材料系统 |
| `music.c` | 乐理 |
| `newquest.c` | 新任务 |
| `oneowner.c` | 归属权 |
| `proclass.c` | 职业分类 |
| `profession.c` | 职业 |
| `quest.c` | 任务 |
| `taozhuang.c` | 套装系统 |
| `uniobj.c` | 唯一物品 |
| `virtualobj.c` | 虚拟物品 |
| `trigger.c` | 触发器 |
| `vi.c` | VI 系统 |
| `player_hockshop.c` | 玩家当铺 |

## 16.3 继承模块 (inherit/)

| 指标 | pkuxkx | xkx2001 |
|------|--------|---------|
| inherit 文件数 | **143** | **109** |

pkuxkx 独有的关键 inherit：

| 模块 | 文件 | 功能 |
|------|------|------|
| 任务 NPC | `char/questmaster.c` `char/quest_npc.c` `char/mailquest.c` | 任务发放 |
| 宝石装备 | `gems/armor.c` `gems/ring.c` `gems/weapon.c` | 宝石镶嵌 |
| 套装装备 | `misc/combined_equip.c` | 套装合成 |
| 离线交易 | `room/offline_trade.c` | 离线商店 |
| 古董商店 | `room/gudong_shop.c` | 特殊商店 |
| 乐器 | `item/instrument.c` | 演奏 |
| 易容工具 | `item/disguise_tools.c` | 易容 |
| 家族 NPC | `char/family_npc.c` | 师门系统 |
| 军阵 | `item/army.c` | 国战 |
| 副本 | `misc/fb.c` | 副本系统 |

---

# 17. 汇总：xkx2001 缺失的核心系统

| # | 缺失系统 | 严重程度 | 涉及文件数 |
|---|---------|---------|------------|
| 1 | **任务系统** (门派/襄阳/争胜/剿匪/比武/国战) | 🔴 | 3 daemon + 6 区域 |
| 2 | **9 个门派** (天龙/日月/大轮寺等) | 🔴 | ~70 NPC 文件 |
| 3 | **19 个特技** | 🔴 | 19 文件 |
| 4 | **装备强化** (宝石/锻造/合成/镶嵌) | 🔴 | 3 feature + 5 命令 + clone/gem/ |
| 5 | **战斗深度** (damage.h / absorb / 反击) | 🔴 | 1 头文件 + combatd 扩展 |
| 6 | **Vitals 加成** (技能影响气血) | 🔴 | attribute.c 953 行缺失 |
| 7 | **技能引擎** (技能树/自创/升级) | 🟡 | feature/skill.c + 4 命令 |
| 8 | **62 个区域** | 🟡 | 大量地图文件 |
| 9 | **内功子技能** (enhance/inspire/shield等) | 🟡 | 5 文件 |
| 10 | **角色系统** (转世/宠物/宝石/排行榜) | 🟡 | 多个 daemon |
| 11 | **乐理/职业/大知识** | 🟢 | 22 文件 |
| 12 | **套装系统** | 🟢 | 1 inherit |
| 13 | **离线交易/玩家当铺** | 🟢 | 2 inherit + 1 feature |
| 14 | **导师系统** | 🟢 | cmds/guider/ |

---

# 18. 文件对照表（完整版）

| 系统 | pkuxkx 源文件 | xkx2001 目标文件 | 差异程度 |
|------|-------------|----------------|---------|
| 属性/vitals | `feature/attribute.c` (1042行) | `feature/attribute.c` (89行) | 🔴 巨大 |
| 种族初始化 | `adm/daemons/race/human.c` | `adm/daemons/race/human.c` | 🟡 中等 |
| 战斗 | `adm/daemons/combatd.c` + `combat/damage.h` | `adm/daemons/combatd.c` | 🔴 巨大 |
| 登录/创建 | `adm/daemons/logind.c` | `adm/daemons/logind.c` | 🟡 中等 |
| 学习 | `cmds/skill/learn.c` | `cmds/skill/learn.c` | 🟢 较小 |
| 练习 | `cmds/skill/practice.c` | `cmds/skill/practice.c` | 🟢 较小 |
| 潜能 | — (无上限系统) | `adm/daemons/updated.c` | ✅ 已修复 |

---

# 19. 移植路线图（推荐）

## 第一梯队：核心骨架 🔴

> **必须优先移植**——这些是后续所有系统的基础，缺了它们其他内容移植了也没意义。

### 1.1 Vitals 公式 → `feature/attribute.c`

| 项目 | 详情 |
|------|------|
| **源文件** | `pkuxkx/feature/attribute.c` (1042行) |
| **目标文件** | `xkx2001/feature/attribute.c` (当前 89行) |
| **工作量** | ⭐⭐⭐ 中等（需重写，但逻辑独立） |
| **依赖** | `skill.h` (一致，无需改) |
| **收益** | 角色气血/精/内力/精力立即获得内功技能加成，数值体系对齐 pkuxkx |

**移植要点**：
- 复制 `query_max_qi()` / `query_max_jing()` / `query_max_neili()` / `query_max_jingli()` 四个函数
- 包含特殊技能加成（太极神功、道家养生、禅宗心法等）
- 包含等级 HP 加成
- 删除 `race/human.c` 中冗余的硬编码公式，改为调用这些函数

### 1.2 战斗伤害 → `include/combat/damage.h` + `combatd.c`

| 项目 | 详情 |
|------|------|
| **源文件** | `pkuxkx/include/combat/damage.h` (184行) + `combatd.c` 吸收/反击部分 |
| **目标文件** | `xkx2001/include/combat/` (新建目录) + `xkx2001/combatd.c` |
| **工作量** | ⭐⭐⭐⭐ 较大（需合并两套战斗逻辑） |
| **依赖** | vitals 公式 (1.1) |
| **收益** | 战斗立即有深度：伤害受技能影响、吸收/反击/乾坤大挪移 |

**移植要点**：
- 以 pkuxkx 的 `calc_damage` 为基础，逐步替换 xkx2001 简化版
- 保留 xkx2001 的 `damage_msg` 作为兜底
- 分阶段：先移植伤害计算 → 再移植吸收 → 最后移植反击

### 1.3 技能引擎 → `feature/skill.c`

| 项目 | 详情 |
|------|------|
| **源文件** | `pkuxkx/feature/skill.c` (971行) |
| **目标文件** | `xkx2001/feature/skill.c` (当前 183行) |
| **工作量** | ⭐⭐⭐ 中等（逻辑独立，主要是替换） |
| **依赖** | 无 |
| **收益** | 解锁技能树、自创武功、多武器系统 |

**移植要点**：
- 补充技能树系统（三级父子关系）
- 补充 `query_wprepare()` 双手武器支持
- 补充 `improve_skill` 的 `type` 参数

---

## 第二梯队：玩法层 🟡

> 核心骨架就位后，这些系统能快速丰富游戏深度。

### 2.1 特技系统

| 项目 | 详情 |
|------|------|
| **源文件** | `pkuxkx/kungfu/special/` (19个文件) + `cmds/skill/special.c` |
| **工作量** | ⭐⭐ 较小（独立模块） |
| **依赖** | 技能引擎 (1.3) |
| **收益** | 19 个特技大幅提升角色差异化 |

### 2.2 内功子技能

| 项目 | 详情 |
|------|------|
| **源文件** | `pkuxkx/kungfu/skill/force/enhance.c` `inspire.c` `jing.c` `lifeheal.c` `qi.c` `shield.c` |
| **工作量** | ⭐ 小（6 个独立文件复制） |
| **依赖** | 技能引擎 (1.3) |
| **收益** | 内功突然有深度：攻击增强、激励、护盾等 |

### 2.3 装备强化

| 项目 | 详情 |
|------|------|
| **源文件** | `pkuxkx/feature/gems.c` + `clone/gem/` + `cmds/std/forge.c` `enhance.c` `combine.c` `merge.c` `insert.c` `makegem.c` |
| **工作量** | ⭐⭐⭐ 中等（多处文件，但相互独立） |
| **依赖** | 无硬依赖 |
| **收益** | 宝石镶嵌/锻造/合成/强化，装备系统完整 |

### 2.4 武功补齐

| 项目 | 详情 |
|------|------|
| **源文件** | pkuxkx 有而 xkx2001 无的 ~350 个技能文件 |
| **工作量** | ⭐⭐⭐⭐ 较大（批量复制+适配） |
| **依赖** | 技能引擎 (1.3)、内功子技能 (2.2) |
| **收益** | 技能从 363 补到 700+，各门派武功完整 |

---

## 第三梯队：内容层 🟢

> 骨架和玩法就位后，用内容填充世界。

### 3.1 任务系统

| 优先级 | 系统 | 工作量 | 说明 |
|--------|------|--------|------|
| 1 | 门派任务 `taskd.c` | ⭐⭐⭐ | 玩家日常核心循环 |
| 2 | 剿匪 `jiaofeid.c` | ⭐⭐ | 组队 PvE 内容 |
| 3 | 襄阳保卫 `xytaskd.c` | ⭐⭐⭐⭐ | 大规模 PvE，依赖襄阳区域 |
| 4 | 门派争胜 `ftaskd.c` | ⭐⭐ | PvP 竞赛 |
| 5 | 比武 `biwud.c` | ⭐⭐ | 竞技内容 |
| 6 | 国战 | ⭐⭐⭐⭐⭐ | 最大规模，依赖最多 |

### 3.2 门派

| 优先级 | 门派 | 文件数 | 说明 |
|--------|------|--------|------|
| 1 | 天龙寺 `tianlong/` | 6 | 经典门派，玩家呼声高 |
| 2 | 日月教 `riyuejiao/` | 8 | 经典门派，有葵花/辟邪 |
| 3 | 侠客岛 `xiakedao/` | 6 | xkx2001 已有侠客岛相关代码 |
| 4 | 大轮寺 `dalunsi/` | 16 | 西部门派，内容丰富 |
| 5 | 白驼山 `btshan/` | 8 | 欧阳锋相关 |
| 6 | 红花会 `honghua/` | 7 | 陈家洛相关 |
| 7 | 天地会 `tiandihui/` | 5 | 陈近南相关 |

### 3.3 区域

| 优先级 | 区域 | 说明 |
|--------|------|------|
| 1 | 长安 `changan/` | 最大主城，任务核心枢纽 |
| 2 | 洛阳 `luoyang/` | 第二大主城 |
| 3 | 苏州 `suzhou/` | 江南重镇 |
| 4 | 成都 `chengdu/` | 西南枢纽 |
| 5 | 侠客岛 `xiakedao/` | 门派+地图 |
| 6 | 其他主城 | 按需逐步添加 |

---

## 不建议移植

| 系统 | 原因 |
|------|------|
| 反机器人 `antirobotd.c` | Web 客户端天然防机器人 |
| QQ 机器人/BBS 集成 | 时代已变，不需要 |
| 离线交易/玩家当铺 | 当前玩家规模不需要 |
| 导师系统 | Web 客户端自带新手指引 |
| 大知识/职业 | 耦合度高、收益小 |

---

## 推荐执行顺序

```
Phase 1 (1-2周): 核心骨架
  ├── 1.1 Vitals 公式 (attribute.c)
  ├── 1.3 技能引擎 (skill.c)
  └── 1.2 战斗伤害 (damage.h + combatd)

Phase 2 (2-3周): 玩法层
  ├── 2.2 内功子技能 (6个文件)
  ├── 2.1 特技系统 (19个文件)
  └── 2.3 装备强化

Phase 3 (3-4周): 武功补齐
  └── 2.4 补全技能文件 (~350个)

Phase 4 (持续): 内容层
  ├── 3.1 门派任务
  ├── 3.2 门派 (逐步)
  └── 3.3 区域 (逐步)
```

**核心原则**：Phase 1 完成之前不要碰后面的——没了正确的气血公式和战斗系统，移植再多武功门派也只是空壳。
| 伤害 | `feature/damage.c` | `feature/damage.c` | 🟢 基本一致 |
