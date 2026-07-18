import { useRef, useState } from "react";
import { RULE_TEMPLATES } from "../../data/ruleTemplates";
import { useDesktop } from "../../context/DesktopContext";
import {
  downloadRulesJson,
  exportRuleSet,
  importRuleSet,
} from "../../lib/ruleStorage";
import type { Rule } from "../../lib/ruleTypes";
import { RuleForm } from "./RuleForm";
import { RuleList } from "./RuleList";

export function RuleEditor() {
  const { rules, setRules, game } = useDesktop();
  const [editing, setEditing] = useState<Rule | null>(null);
  const [creating, setCreating] = useState<Rule["kind"] | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const persist = (next: Rule[]) => setRules(next);

  if (creating || editing) {
    const kind = creating ?? editing!.kind;
    return (
      <RuleForm
        kind={kind}
        initial={editing}
        onCancel={() => {
          setCreating(null);
          setEditing(null);
        }}
        onDelete={
          editing
            ? () => {
                persist(rules.filter((r) => r.id !== editing.id));
                setEditing(null);
              }
            : undefined
        }
        onSave={(rule) => {
          if (editing) {
            persist(rules.map((r) => (r.id === rule.id ? rule : r)));
          } else {
            persist([...rules, rule]);
          }
          setCreating(null);
          setEditing(null);
        }}
      />
    );
  }

  return (
    <div className="desktop-rule-editor" data-testid="desktop-rule-editor">
      <RuleList
        onEdit={(r) => setEditing(r)}
        onNew={(k) => setCreating(k)}
      />
      <div className="desktop-rule-io">
        <button
          type="button"
          onClick={() => {
            const json = exportRuleSet(rules);
            const stamp = new Date().toISOString().slice(0, 10);
            downloadRulesJson(json, `xkx-rules-${stamp}.json`);
          }}
        >
          导出规则包
        </button>
        <button type="button" onClick={() => fileRef.current?.click()}>
          导入规则包
        </button>
        <input
          ref={fileRef}
          type="file"
          accept="application/json,.json"
          hidden
          data-testid="desktop-rule-import"
          onChange={async (e) => {
            const file = e.target.files?.[0];
            e.target.value = "";
            if (!file) return;
            try {
              const text = await file.text();
              const imported = importRuleSet(text);
              persist([...rules, ...imported]);
              game.showToast(`已导入 ${imported.length} 条（默认禁用）`);
            } catch (err) {
              game.showToast(
                err instanceof Error ? err.message : "导入失败"
              );
            }
          }}
        />
      </div>
      <div className="desktop-templates">
        <h4>模板</h4>
        <div className="desktop-template-list">
          {RULE_TEMPLATES.map((t) => (
            <button
              key={t.id}
              type="button"
              title={t.description}
              onClick={() => {
                const added = t.rules();
                persist([...rules, ...added]);
                game.showToast(`已添加「${t.name}」（默认禁用）`);
              }}
            >
              {t.name}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
