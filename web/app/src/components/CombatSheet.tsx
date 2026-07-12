import { useState } from "react";
import type { Entity } from "../lib/types";

interface Props {
  npcs: Entity[];
  combatLog: string[];
  onClose: () => void;
  onCmd: (cmd: string) => void;
  onStartAssist: (lowHpPct: number, action: "warn" | "flee" | "stop") => void;
  onStopAssist: () => void;
  assistActive: boolean;
}

export function CombatSheet({
  npcs,
  combatLog,
  onClose,
  onCmd,
  onStartAssist,
  onStopAssist,
  assistActive,
}: Props) {
  const [target, setTarget] = useState("");
  const [lowHpPct, setLowHpPct] = useState(30);
  const [lowHpAction, setLowHpAction] = useState<"warn" | "flee" | "stop">("flee");

  return (
    <div className="overlay open" onClick={onClose}>
      <div className="sheet" onClick={(e) => e.stopPropagation()}>
        <div className="sheet-top">
          <h3>动手</h3>
          <button type="button" className="close" onClick={onClose}>
            ×
          </button>
        </div>
        <div className="sheet-scroll">
          <p style={{ fontSize: 13, color: "var(--paper-dim)", marginBottom: 8 }}>
            选择目标
          </p>
          <div className="chips" style={{ marginBottom: 14 }}>
            {npcs.length === 0 ? (
              <span style={{ color: "var(--paper-dim)", fontSize: 13 }}>
                附近暂无可战目标
              </span>
            ) : (
              npcs.map((n) => (
                <button
                  key={n.id}
                  type="button"
                  className={`chip npc ${target === n.name ? "on" : ""}`}
                  onClick={() => setTarget(n.name)}
                >
                  {n.name}
                </button>
              ))
            )}
          </div>
          <div style={{ marginBottom: 14, fontSize: 13 }}>
            <p style={{ color: "var(--paper-dim)", marginBottom: 8 }}>战斗辅助</p>
            <label>
              气血低于{" "}
              <input
                type="number"
                min={5}
                max={80}
                value={lowHpPct}
                onChange={(e) => setLowHpPct(+e.target.value)}
                style={{ width: 48, padding: 4, borderRadius: 6, border: "1px solid var(--line)" }}
              />
              % 时
            </label>
            <select
              value={lowHpAction}
              onChange={(e) =>
                setLowHpAction(e.target.value as "warn" | "flee" | "stop")
              }
              style={{
                marginLeft: 8,
                padding: 4,
                borderRadius: 6,
                border: "1px solid var(--line)",
                background: "var(--ink-lift)",
                color: "var(--paper)",
              }}
            >
              <option value="warn">提示</option>
              <option value="flee">逃跑</option>
              <option value="stop">停手</option>
            </select>
          </div>
          <div className="combat-log">
            {combatLog.length === 0 ? (
              <p style={{ color: "var(--paper-dim)" }}>战报将在此显示</p>
            ) : (
              combatLog.map((l, i) => <p key={i}>{l}</p>)
            )}
          </div>
        </div>
        <div className="sheet-acts">
          <button
            type="button"
            className="go"
            disabled={!target}
            onClick={() => onCmd(`kill ${target}`)}
          >
            开战
          </button>
          <button type="button" onClick={() => onCmd("hit")}>
            普攻
          </button>
          <button type="button" className="danger" onClick={() => onCmd("halt")}>
            停手
          </button>
          <button type="button" className="danger" onClick={() => onCmd("flee")}>
            逃跑
          </button>
          {!assistActive ? (
            <button
              type="button"
              className="go"
              onClick={() => onStartAssist(lowHpPct, lowHpAction)}
            >
              自动普攻
            </button>
          ) : (
            <button type="button" onClick={onStopAssist}>
              关闭自动
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
