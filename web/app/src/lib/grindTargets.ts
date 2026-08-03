/**
 * 扬州城南练级挂机目标：由弱到强（怪 combat_exp 与 adm/daemons/xkd_pathd.c 一致）。
 *
 * 收益规则（adm/daemons/combatd.c killer_reward）：
 *   - 每次击杀收益 = 怪 combat_exp / 15，下限 15，上限 3000
 *   - 玩家 combat_exp ≤ 100000 时任意怪有效；超过后需 玩家exp ≤ 怪exp×50 才有效
 * 推荐玩家经验区间 [怪exp, 怪exp×50]，超过上限该档无收益，应换下一档。
 */
export type GrindTarget = {
  id: string;
  label: string;
  /** 刷怪地点 */
  hint: string;
  /** 怪 combat_exp（MUD 数值） */
  exp: number;
  /** 每杀收益 = floor(怪exp/15)，封顶 3000 */
  gain: number;
};

/** 将数值格式化为界面友好的经验文案：<1万 原样，≥1万 显示 x.x万 */
export function formatExp(n: number): string {
  if (n >= 10000) {
    const w = n / 10000;
    return `${w % 1 === 0 ? w.toFixed(0) : w.toFixed(1)}万`;
  }
  return String(n);
}

/** 推荐玩家经验区间文案（怪exp ~ 怪exp×50） */
export function recExpRange(t: GrindTarget): string {
  return `${formatExp(t.exp)}~${formatExp(t.exp * 50)}`;
}

/** 扬州城南练级路：民屋后门起，低血自动回免费民屋休整。 */
export const YANGZHOU_GRIND_TARGETS: GrindTarget[] = [
  { id: "yz_crow", label: "乌鸦", hint: "城南小径", exp: 300, gain: 20 },
  { id: "yz_monkey", label: "野猴", hint: "荒草坡", exp: 500, gain: 33 },
  { id: "yz_goat", label: "野羊", hint: "野羊坡", exp: 750, gain: 50 },
  { id: "yz_dog", label: "野狗", hint: "枯藤径", exp: 1000, gain: 66 },
  { id: "yz_boar", label: "野猪", hint: "泥潭边", exp: 1500, gain: 100 },
  { id: "yz_wolf", label: "野狼", hint: "狼嚎谷", exp: 2000, gain: 133 },
  { id: "yz_bandit", label: "山贼喽啰", hint: "断桥", exp: 2500, gain: 166 },
  { id: "yz_bandit_leader", label: "山贼头目", hint: "寨口", exp: 3000, gain: 200 },
];

/** 侠客岛石壁领悟武功（与 d/xiakedao/xkx.h flag 1–4 一致） */
export type StudySkill = {
  id: string;
  label: string;
  hint: string;
};

export const STUDY_SKILLS: StudySkill[] = [
  { id: "taixuan-gong", label: "太玄功", hint: "内功 · 石室" },
  { id: "liuxing-bu", label: "流星步", hint: "轻功 · 石室" },
  { id: "wugou-jianfa", label: "吴钩剑法", hint: "剑法 · 石室" },
  { id: "wuyu-zhangfa", label: "五狱掌法", hint: "掌法 · 石室" },
];
