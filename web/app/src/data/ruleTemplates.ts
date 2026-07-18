import { createRuleId } from "../lib/ruleEngine";
import type { Rule } from "../lib/ruleTypes";

export interface RuleTemplate {
  id: string;
  name: string;
  description: string;
  rules: () => Rule[];
}

function alias(
  name: string,
  a: string,
  expansion: string,
  enabled = false
): Rule {
  return {
    kind: "alias",
    id: createRuleId(),
    name,
    enabled,
    alias: a,
    expansion,
  };
}

function trigger(
  name: string,
  pattern: string,
  command: string,
  enabled = false
): Rule {
  return {
    kind: "trigger",
    id: createRuleId(),
    name,
    enabled,
    pattern,
    patternType: "exact",
    caseSensitive: true,
    action: [{ type: "send", command }],
    advanced: { cooldownMs: 2000 },
  };
}

function timer(
  name: string,
  intervalMs: number,
  action: string,
  enabled = false
): Rule {
  return {
    kind: "timer",
    id: createRuleId(),
    name,
    enabled,
    intervalMs,
    action,
    oneShot: false,
  };
}

export const RULE_TEMPLATES: RuleTemplate[] = [
  {
    id: "common-alias",
    name: "常用缩写",
    description: "score / hp / inventory / skills 等常用缩写",
    rules: () => [
      alias("查看档案", "sc", "score"),
      alias("查看气血", "hp", "hp"),
      alias("查看行囊", "i", "inventory"),
      alias("查看武功", "sk", "skills"),
      alias("环顾", "l", "look"),
    ],
  },
  {
    id: "eat-drink",
    name: "快速吃喝",
    description: "饿了吃干粮、渴了饮酒袋",
    rules: () => [
      trigger("饿了吃干粮", "你饿了。", "eat gan liang"),
      trigger("渴了喝水", "你渴了。", "drink jiu dai"),
    ],
  },
  {
    id: "train-guard",
    name: "修炼守护",
    description: "定时查看气血",
    rules: () => [timer("定时查看气血", 30000, "hp")],
  },
  {
    id: "combat-hint",
    name: "战斗辅助",
    description: "受伤时提示",
    rules: () => [
      {
        kind: "trigger",
        id: createRuleId(),
        name: "受伤提示",
        enabled: false,
        pattern: "你受了*",
        patternType: "wildcard",
        caseSensitive: true,
        action: [{ type: "toast", message: "你受伤了，注意气血！" }],
        advanced: { cooldownMs: 3000 },
      },
    ],
  },
  {
    id: "goout-equip",
    name: "出门装备",
    description: "一键穿戴常用装备（按需改 expansion）",
    rules: () => [alias("出门装备", "goout", "wear all")],
  },
  {
    id: "gohome",
    name: "回城路径",
    description: "示例路径别名，请按实际路线修改",
    rules: () => [alias("回城", "gohome", "n;n;w;enter")],
  },
  {
    id: "auto-loot",
    name: "批量拾取",
    description: "见到金创药自动拾取",
    rules: () => [
      {
        kind: "trigger",
        id: createRuleId(),
        name: "拾取金创药",
        enabled: false,
        pattern: "*金创药*",
        patternType: "wildcard",
        caseSensitive: true,
        action: [{ type: "send", command: "get jin chuang yao" }],
        advanced: { cooldownMs: 1500 },
      },
    ],
  },
  {
    id: "daily-timer",
    name: "门派日常提醒",
    description: "定时提醒查看状态",
    rules: () => [
      {
        kind: "timer",
        id: createRuleId(),
        name: "日常提醒",
        enabled: false,
        intervalMs: 600000,
        action: "hp",
        oneShot: false,
      },
    ],
  },
];
