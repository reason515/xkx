/** 侠客岛新人挂机目标：由弱到强（combat_exp，与 adm/daemons 一致） */
export type GrindTarget = {
  id: string;
  label: string;
  hint: string;
};

export const GRIND_TARGETS: GrindTarget[] = [
  { id: "monkey", label: "小猴子", hint: "最弱 · 石壁" },
  { id: "haigui_s", label: "小海龟", hint: "弱 · 多处沙滩" },
  { id: "haigui", label: "海龟", hint: "稍强 · 多处沙滩" },
  { id: "maque", label: "麻雀", hint: "中弱 · 上山路" },
  { id: "wuya", label: "乌鸦", hint: "中等 · 山顶南下野林" },
  { id: "haidao_w", label: "受伤海盗", hint: "较强 · 野林进海盗窝" },
  { id: "haidao_s", label: "小海盗", hint: "强 · 野林进海盗窝" },
  { id: "haidao_o", label: "老海盗", hint: "最强 · 野林进海盗窝" },
];

/** 扬州城南练级路：民屋后门起，低血自动回免费民屋休整。 */
export const YANGZHOU_GRIND_TARGETS: GrindTarget[] = [
  { id: "yz_crow", label: "乌鸦", hint: "300 · 城南小径" },
  { id: "yz_monkey", label: "野猴", hint: "500 · 荒草坡" },
  { id: "yz_goat", label: "野羊", hint: "750 · 野羊坡" },
  { id: "yz_dog", label: "野狗", hint: "1000 · 枯藤径" },
  { id: "yz_boar", label: "野猪", hint: "1500 · 泥潭边" },
  { id: "yz_wolf", label: "野狼", hint: "2000 · 狼嚎谷" },
  { id: "yz_bandit", label: "山贼喽啰", hint: "2500 · 断桥" },
  { id: "yz_bandit_leader", label: "山贼头目", hint: "3000 · 寨口" },
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
