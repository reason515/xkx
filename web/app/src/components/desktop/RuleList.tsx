import { useDesktop } from "../../context/DesktopContext";
import type { Rule } from "../../lib/ruleTypes";

type Props = {
  onEdit: (rule: Rule) => void;
  onNew: (kind: Rule["kind"]) => void;
};

export function RuleList({ onEdit, onNew }: Props) {
  const { rules, setRules, doEmergencyStop, emergencyStopped } = useDesktop();
  const aliases = rules.filter((r) => r.kind === "alias");
  const triggers = rules.filter((r) => r.kind === "trigger");
  const timers = rules.filter((r) => r.kind === "timer");

  const toggle = (id: string) => {
    setRules((prev) =>
      prev.map((r) => (r.id === id ? { ...r, enabled: !r.enabled } : r))
    );
  };

  const section = (title: string, list: Rule[]) => (
    <div className="desktop-rule-section">
      <h4>
        {title} ({list.length})
      </h4>
      {list.length === 0 && <p className="desktop-muted">暂无</p>}
      <ul>
        {list.map((r) => (
          <li key={r.id} data-testid={`rule-row-${r.id}`}>
            <label className="desktop-check">
              <input
                type="checkbox"
                checked={r.enabled}
                onChange={() => toggle(r.id)}
              />
              <span>
                {r.kind === "alias"
                  ? `${r.alias} → ${r.expansion}`
                  : r.name}
              </span>
            </label>
            <button type="button" onClick={() => onEdit(r)} aria-label="编辑">
              ✎
            </button>
          </li>
        ))}
      </ul>
    </div>
  );

  return (
    <div className="desktop-rule-list" data-testid="desktop-rule-list">
      <div className="desktop-rule-toolbar">
        <span>规则</span>
        <div className="desktop-rule-new">
          <button type="button" onClick={() => onNew("alias")}>
            + Alias
          </button>
          <button type="button" onClick={() => onNew("trigger")}>
            + Trigger
          </button>
          <button type="button" onClick={() => onNew("timer")}>
            + Timer
          </button>
        </div>
      </div>
      {section("Alias", aliases)}
      {section("Trigger", triggers)}
      {section("Timer", timers)}
      <button
        type="button"
        className={`desktop-estop ${emergencyStopped ? "on" : ""}`}
        onClick={doEmergencyStop}
      >
        急停 (Ctrl+Shift+X)
      </button>
    </div>
  );
}
