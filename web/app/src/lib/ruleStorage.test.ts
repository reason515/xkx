import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  RULES_STORAGE_KEY,
  exportRuleSet,
  importRuleSet,
  loadRulesFromStorage,
  saveRulesToStorage,
} from "./ruleStorage";
import type { Rule } from "./ruleTypes";

const store = new Map<string, string>();
vi.stubGlobal("localStorage", {
  getItem: (k: string) => store.get(k) ?? null,
  setItem: (k: string, v: string) => {
    store.set(k, v);
  },
  removeItem: (k: string) => {
    store.delete(k);
  },
  clear: () => store.clear(),
});

const sample: Rule[] = [
  {
    kind: "alias",
    id: "a1",
    name: "score",
    enabled: true,
    alias: "sc",
    expansion: "score",
  },
];

describe("ruleStorage", () => {
  beforeEach(() => {
    store.clear();
  });

  it("saves and loads rules", () => {
    saveRulesToStorage(sample);
    expect(localStorage.getItem(RULES_STORAGE_KEY)).toBeTruthy();
    const loaded = loadRulesFromStorage();
    expect(loaded).toHaveLength(1);
    expect(loaded[0]).toMatchObject({ alias: "sc", expansion: "score" });
  });

  it("export / import disables imported rules", () => {
    const json = exportRuleSet(sample, "test");
    const imported = importRuleSet(json);
    expect(imported).toHaveLength(1);
    expect(imported[0].enabled).toBe(false);
    expect(imported[0].kind).toBe("alias");
  });

  it("rejects invalid import", () => {
    expect(() => importRuleSet("{}")).toThrow(/无效/);
  });
});
