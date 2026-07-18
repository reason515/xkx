import { useState } from "react";
import type { Entity } from "../lib/types";
import { ChoiceRow } from "./ChoiceRow";

interface Props {
  npcs: Entity[];
  combatLog: string[];
  onClose: () => void;
  onCmd: (cmd: string) => void;
  onStartAssist: (lowHpPct: number, action: "warn" | "flee" | "stop") => void;
  onStartGrind?: (grindTarget: string, lowHpPct: number) => void;
  onStopAssist: () => void;
  assistActive: boolean;
  /** 侠客岛场景才显示挂机练级 */
  showGrind?: boolean;
  assistStatus?: string;
}

const GRIND_TARGETS = [{ id: "haigui_s", label: "小海龟" }];

export function CombatSheet({
  npcs,
  combatLog,
  onClose,
  onCmd,
  onStartAssist,
  onStartGrind,
  onStopAssist,
  assistActive,
  showGrind = false,
  assistStatus = "",
}: Props) {
  const [target, setTarget] = useState("");
  const [lowHpPct, setLowHpPct] = useState(30);
  const [lowHpAction, setLowHpAction] = useState<"warn" | "flee" | "stop">("flee");
  const [grindTarget, setGrindTarget] = useState("haigui_s");
  const [grindLowHp, setGrindLowHp] = useState(30);

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
          {showGrind && (
            <div className="combat-assist" style={{ marginBottom: 16 }}>
              <p className="combat-assist-label">岛上练级</p>
              <p
                style={{
                  fontSize: 13,
                  color: "var(--paper-dim)",
                  marginBottom: 8,
                }}
              >
                自动寻怪交手；危险时撤回休整，再回场继续。
              </p>
              <div className="chips" style={{ marginBottom: 10 }}>
                {GRIND_TARGETS.map((t) => (
                  <button
                    key={t.id}
                    type="button"
                    className={`chip ${grindTarget === t.id ? "on" : ""}`}
                    onClick={() => setGrindTarget(t.id)}
                  >
                    {t.label}
                  </button>
                ))}
              </div>
              <label className="combat-assist-threshold">
                气血低于{" "}
                <input
                  type="number"
                  min={5}
                  max={80}
                  value={grindLowHp}
                  onChange={(e) => setGrindLowHp(+e.target.value)}
                />
                % 时撤回
              </label>
              {assistActive && /挂机打怪/.test(assistStatus) && (
                <p
                  style={{
                    fontSize: 13,
                    color: "var(--jade-bright)",
                    marginTop: 8,
                  }}
                >
                  {assistStatus}
                </p>
              )}
              {!assistActive ? (
                <button
                  type="button"
                  className="go"
                  style={{ marginTop: 10, width: "100%" }}
                  disabled={!onStartGrind || !grindTarget}
                  onClick={() => onStartGrind?.(grindTarget, grindLowHp)}
                >
                  开始挂机
                </button>
              ) : (
                <button
                  type="button"
                  style={{ marginTop: 10, width: "100%" }}
                  onClick={onStopAssist}
                >
                  停止挂机
                </button>
              )}
            </div>
          )}

          <p style={{ fontSize: 13, color: "var(--paper-dim)", marginBottom: 8 }}>
            选择目标
          </p>
          <div className="chips" style={{ marginBottom: 14 }}>
            {npcs.length === 0 ? (
              <span style={{ color: "var(--paper-dim)", fontSize: 13 }}>
                附近暂无可战目标
              </span>
            ) : (
              npcs.map((n) => {
                const cmdTarget =
                  n.id && /^[a-z]/i.test(n.id) && n.id !== n.name
                    ? n.id
                    : n.name;
                return (
                  <button
                    key={n.id}
                    type="button"
                    className={`chip npc ${target === cmdTarget ? "on" : ""}`}
                    onClick={() => setTarget(cmdTarget)}
                  >
                    {n.name}
                  </button>
                );
              })
            )}
          </div>
          <div className="combat-assist">
            <p className="combat-assist-label">战斗辅助</p>
            <label className="combat-assist-threshold">
              气血低于{" "}
              <input
                type="number"
                min={5}
                max={80}
                value={lowHpPct}
                onChange={(e) => setLowHpPct(+e.target.value)}
              />
              % 时
            </label>
            <ChoiceRow
              label="低血处置"
              value={lowHpAction}
              options={[
                { id: "warn", label: "提示" },
                { id: "flee", label: "逃跑" },
                { id: "stop", label: "停手" },
              ]}
              onChange={setLowHpAction}
            />
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
