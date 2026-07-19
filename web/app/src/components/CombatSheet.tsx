import { useState } from "react";
import { GRIND_TARGETS } from "../lib/grindTargets";

interface Props {
  onClose: () => void;
  onStartGrind?: (grindTarget: string, lowHpPct: number) => void;
  onStopAssist: () => void;
  /** 战斗/busy 中停手（不依赖挂机） */
  onHalt?: () => void;
  assistActive: boolean;
  /** 侠客岛场景才可挂机 */
  showGrind?: boolean;
  assistStatus?: string;
}

export function CombatSheet({
  onClose,
  onStartGrind,
  onStopAssist,
  onHalt,
  assistActive,
  showGrind = false,
  assistStatus = "",
}: Props) {
  const [grindTarget, setGrindTarget] = useState("haigui_s");
  const [grindLowHp, setGrindLowHp] = useState(30);
  const grinding = assistActive && /挂机/.test(assistStatus || "");

  return (
    <div className="overlay open" onClick={onClose}>
      <div className="sheet" onClick={(e) => e.stopPropagation()}>
        <div className="sheet-top">
          <h3>挂机</h3>
          <button type="button" className="close" onClick={onClose}>
            ×
          </button>
        </div>
        <div className="sheet-scroll">
          {!showGrind ? (
            <p className="doc-status">挂机练级仅在侠客岛可用。</p>
          ) : grinding ? (
            <>
              <p className="combat-assist-label">挂机进行中</p>
              <p
                style={{
                  fontSize: 14,
                  color: "var(--jade-bright)",
                  marginBottom: 16,
                }}
              >
                {assistStatus || "挂机中"}
              </p>
              <p
                style={{
                  fontSize: 13,
                  color: "var(--paper-dim)",
                  marginBottom: 12,
                }}
              >
                自动寻怪交手；气血过低会撤回休整，恢复后再回场。
              </p>
            </>
          ) : (
            <>
              <p className="combat-assist-label">选择对手</p>
              <p
                style={{
                  fontSize: 13,
                  color: "var(--paper-dim)",
                  marginBottom: 12,
                }}
              >
                按由弱到强排列；开始后自动寻路前往刷怪点。
              </p>
              <div className="grind-target-list">
                {GRIND_TARGETS.map((t) => (
                  <button
                    key={t.id}
                    type="button"
                    className={`grind-target${
                      grindTarget === t.id ? " on" : ""
                    }`}
                    onClick={() => setGrindTarget(t.id)}
                  >
                    <span className="grind-target-name">{t.label}</span>
                    <span className="grind-target-hint">{t.hint}</span>
                  </button>
                ))}
              </div>
              <label className="combat-assist-threshold" style={{ marginTop: 14 }}>
                气血低于{" "}
                <input
                  type="number"
                  min={5}
                  max={80}
                  value={grindLowHp}
                  onChange={(e) => setGrindLowHp(+e.target.value)}
                />
                % 时撤回休整
              </label>
            </>
          )}
        </div>
        <div className="sheet-acts">
          {grinding ? (
            <button type="button" className="danger" onClick={onStopAssist}>
              停止挂机
            </button>
          ) : (
            <button
              type="button"
              className="go"
              disabled={!showGrind || !onStartGrind || !grindTarget}
              onClick={() => onStartGrind?.(grindTarget, grindLowHp)}
            >
              开始挂机
            </button>
          )}
          {onHalt ? (
            <button type="button" onClick={onHalt}>
              停手
            </button>
          ) : null}
        </div>
      </div>
    </div>
  );
}
