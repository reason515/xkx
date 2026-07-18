import { useState } from "react";
import { createRuleId } from "../../lib/ruleEngine";
import type { AliasRule, Rule, TimerRule, TriggerRule } from "../../lib/ruleTypes";
import { MIN_TIMER_MS } from "../../lib/ruleTypes";

type Props = {
  initial?: Rule | null;
  kind: Rule["kind"];
  onSave: (rule: Rule) => void;
  onCancel: () => void;
  onDelete?: () => void;
};

export function RuleForm({ initial, kind, onSave, onCancel, onDelete }: Props) {
  const [name, setName] = useState(initial?.name ?? "");
  const [enabled, setEnabled] = useState(initial?.enabled ?? true);

  // alias
  const [alias, setAlias] = useState(
    initial?.kind === "alias" ? initial.alias : ""
  );
  const [expansion, setExpansion] = useState(
    initial?.kind === "alias" ? initial.expansion : ""
  );

  // trigger
  const [pattern, setPattern] = useState(
    initial?.kind === "trigger" ? initial.pattern : ""
  );
  const [patternType, setPatternType] = useState<TriggerRule["patternType"]>(
    initial?.kind === "trigger" ? initial.patternType : "exact"
  );
  const [command, setCommand] = useState(
    initial?.kind === "trigger"
      ? initial.action.find((a) => a.type === "send")?.command ?? ""
      : ""
  );
  const [cooldownMs, setCooldownMs] = useState(
    initial?.kind === "trigger" ? initial.advanced?.cooldownMs ?? 500 : 500
  );

  // timer
  const [intervalSec, setIntervalSec] = useState(
    initial?.kind === "timer"
      ? Math.max(1, Math.round(initial.intervalMs / 1000))
      : 30
  );
  const [timerAction, setTimerAction] = useState(
    initial?.kind === "timer" ? initial.action : "hp"
  );
  const [oneShot, setOneShot] = useState(
    initial?.kind === "timer" ? initial.oneShot : false
  );

  const submit = () => {
    const id = initial?.id ?? createRuleId();
    if (kind === "alias") {
      const rule: AliasRule = {
        kind: "alias",
        id,
        name: name || alias,
        enabled,
        alias: alias.trim(),
        expansion: expansion.trim(),
      };
      onSave(rule);
      return;
    }
    if (kind === "trigger") {
      const rule: TriggerRule = {
        kind: "trigger",
        id,
        name: name || pattern,
        enabled,
        pattern,
        patternType,
        caseSensitive: true,
        action: command.trim()
          ? [{ type: "send", command: command.trim() }]
          : [],
        advanced: { cooldownMs },
      };
      onSave(rule);
      return;
    }
    const rule: TimerRule = {
      kind: "timer",
      id,
      name: name || "定时",
      enabled,
      intervalMs: Math.max(MIN_TIMER_MS, intervalSec * 1000),
      action: timerAction.trim(),
      oneShot,
    };
    onSave(rule);
  };

  return (
    <div className="desktop-rule-form" data-testid="desktop-rule-form">
      <h3>{initial ? "编辑规则" : "新建规则"}</h3>
      <label>
        名称
        <input value={name} onChange={(e) => setName(e.target.value)} />
      </label>
      {kind === "alias" && (
        <>
          <label>
            缩写
            <input
              data-testid="rule-alias"
              value={alias}
              onChange={(e) => setAlias(e.target.value)}
            />
          </label>
          <label>
            展开
            <input
              data-testid="rule-expansion"
              value={expansion}
              onChange={(e) => setExpansion(e.target.value)}
            />
          </label>
          <p className="desktop-hint">占位符：$1 $2 … $*（全部参数）</p>
        </>
      )}
      {kind === "trigger" && (
        <>
          <label>
            匹配文本
            <input
              data-testid="rule-pattern"
              value={pattern}
              onChange={(e) => setPattern(e.target.value)}
            />
          </label>
          <label>
            匹配方式
            <select
              value={patternType}
              onChange={(e) =>
                setPatternType(e.target.value as TriggerRule["patternType"])
              }
            >
              <option value="exact">精确</option>
              <option value="wildcard">通配符</option>
              <option value="regex">正则</option>
            </select>
          </label>
          <label>
            发送指令
            <input
              data-testid="rule-trigger-cmd"
              value={command}
              onChange={(e) => setCommand(e.target.value)}
            />
          </label>
          <label>
            冷却 (ms)
            <input
              type="number"
              value={cooldownMs}
              onChange={(e) => setCooldownMs(Number(e.target.value) || 0)}
            />
          </label>
        </>
      )}
      {kind === "timer" && (
        <>
          <label>
            间隔（秒）
            <input
              type="number"
              min={1}
              value={intervalSec}
              onChange={(e) => setIntervalSec(Number(e.target.value) || 1)}
            />
          </label>
          <label>
            指令
            <input
              data-testid="rule-timer-cmd"
              value={timerAction}
              onChange={(e) => setTimerAction(e.target.value)}
            />
          </label>
          <label className="desktop-check">
            <input
              type="checkbox"
              checked={oneShot}
              onChange={(e) => setOneShot(e.target.checked)}
            />
            仅执行一次
          </label>
        </>
      )}
      <label className="desktop-check">
        <input
          type="checkbox"
          checked={enabled}
          onChange={(e) => setEnabled(e.target.checked)}
        />
        启用
      </label>
      <div className="desktop-form-acts">
        <button type="button" className="primary" onClick={submit}>
          保存
        </button>
        <button type="button" onClick={onCancel}>
          取消
        </button>
        {onDelete && (
          <button type="button" className="danger" onClick={onDelete}>
            删除
          </button>
        )}
      </div>
    </div>
  );
}
