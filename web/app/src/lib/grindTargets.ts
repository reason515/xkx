/** 侠客岛新人挂机目标：由弱到强（与 adm/daemons 一致） */
export type GrindTarget = {
  id: string;
  label: string;
  hint: string;
};

export const GRIND_TARGETS: GrindTarget[] = [
  { id: "monkey", label: "小猴子", hint: "最弱 · 石壁" },
  { id: "haigui_s", label: "小海龟", hint: "弱 · 沙滩" },
  { id: "haigui", label: "海龟", hint: "稍强 · 沙滩尽头" },
  { id: "haidao_w", label: "受伤海盗", hint: "中等 · 海盗窝" },
  { id: "haidao_s", label: "小海盗", hint: "较强 · 海盗窝" },
  { id: "haidao_o", label: "老海盗", hint: "更强 · 海盗窝" },
];
