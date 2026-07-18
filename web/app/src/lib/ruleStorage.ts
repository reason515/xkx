import {
  MAX_RULES,
  MIN_TIMER_MS,
  type Rule,
  type RuleSet,
} from "./ruleTypes";

export const RULES_STORAGE_KEY = "xkx-desktop-rules";

function isRule(v: unknown): v is Rule {
  if (!v || typeof v !== "object") return false;
  const r = v as Rule;
  if (typeof r.id !== "string" || typeof r.name !== "string") return false;
  if (typeof r.enabled !== "boolean") return false;
  if (r.kind === "alias") {
    return typeof r.alias === "string" && typeof r.expansion === "string";
  }
  if (r.kind === "trigger") {
    return (
      typeof r.pattern === "string" &&
      Array.isArray(r.action) &&
      (r.patternType === "wildcard" ||
        r.patternType === "regex" ||
        r.patternType === "exact")
    );
  }
  if (r.kind === "timer") {
    return typeof r.intervalMs === "number" && typeof r.action === "string";
  }
  return false;
}

export function loadRulesFromStorage(): Rule[] {
  try {
    const raw = localStorage.getItem(RULES_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (Array.isArray(parsed)) {
      return parsed.filter(isRule).slice(0, MAX_RULES);
    }
    if (parsed && typeof parsed === "object" && Array.isArray((parsed as RuleSet).rules)) {
      return (parsed as RuleSet).rules.filter(isRule).slice(0, MAX_RULES);
    }
  } catch {
    /* ignore */
  }
  return [];
}

export function saveRulesToStorage(rules: Rule[]): void {
  try {
    localStorage.setItem(RULES_STORAGE_KEY, JSON.stringify(rules.slice(0, MAX_RULES)));
  } catch {
    /* ignore */
  }
}

export function exportRuleSet(rules: Rule[], name = "我的规则"): string {
  const set: RuleSet = {
    version: 1,
    name,
    rules: rules.slice(0, MAX_RULES),
    exportedAt: new Date().toISOString(),
  };
  return JSON.stringify(set, null, 2);
}

export function importRuleSet(json: string): Rule[] {
  const parsed = JSON.parse(json) as unknown;
  let rules: unknown[] = [];
  if (Array.isArray(parsed)) rules = parsed;
  else if (
    parsed &&
    typeof parsed === "object" &&
    Array.isArray((parsed as RuleSet).rules)
  ) {
    rules = (parsed as RuleSet).rules;
  } else {
    throw new Error("无效的规则包");
  }
  const out: Rule[] = [];
  for (const item of rules) {
    if (!isRule(item)) continue;
    const copy: Rule = {
      ...item,
      id: item.id || `imp_${Math.random().toString(36).slice(2, 9)}`,
      enabled: false,
    };
    if (copy.kind === "timer" && copy.intervalMs < MIN_TIMER_MS) {
      copy.intervalMs = MIN_TIMER_MS;
    }
    out.push(copy);
    if (out.length >= MAX_RULES) break;
  }
  return out;
}

export function downloadRulesJson(json: string, filename: string): void {
  const blob = new Blob([json], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
