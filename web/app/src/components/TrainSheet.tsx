import { useMemo, useState } from "react";
import { ENABLE_SLOTS } from "../lib/parser";
import type { AssistConfig, EnabledSkill } from "../lib/types";
import { ChoiceRow } from "./ChoiceRow";

interface Props {
  active: boolean;
  status: string;
  trainLog: string[];
  enabled: Record<string, EnabledSkill>;
  onClose: () => void;
  onStart: (config: AssistConfig) => void;
  onStop: () => void;
}

type TrainMode = "dazuo" | "tuna" | "lian";
type TrainStop = "full" | "count";

export function buildPracticeOptions(enabled: Record<string, EnabledSkill>) {
  return Object.entries(enabled)
    .filter(
      ([slot, ent]) => slot !== "parry" && !!ent?.skill && ent.skill !== "无"
    )
    .map(([slot, ent]) => ({
      id: slot,
      label: `${
        ENABLE_SLOTS.find((item) => item.id === slot)?.label || slot
      } · ${ent.name || ent.skill}`,
    }));
}

export function TrainSheet({
  active,
  status,
  trainLog,
  enabled,
  onClose,
  onStart,
  onStop,
}: Props) {
  const [mode, setMode] = useState<TrainMode>("dazuo");
  const [stopWhen, setStopWhen] = useState<TrainStop>("full");
  const [stopCount, setStopCount] = useState(1);
  const [stopOnCombat, setStopOnCombat] = useState(true);
  const practiceOptions = useMemo(() => buildPracticeOptions(enabled), [enabled]);
  const [practiceSkill, setPracticeSkill] = useState("");
  const selectedPractice =
    practiceOptions.find((item) => item.id === practiceSkill)?.id ||
    practiceOptions[0]?.id ||
    "";
  const canStart = mode !== "lian" || !!selectedPractice;

  return (
    <div className="overlay open" onClick={onClose}>
      <div className="sheet" onClick={(e) => e.stopPropagation()}>
        <div className="sheet-top">
          <div>
            <h3>修炼</h3>
            {active && (
              <p
                className={`train-status${/调息/.test(status) ? " resting" : ""}`}
              >
                {status}
              </p>
            )}
          </div>
          <button type="button" className="close" onClick={onClose}>
            ×
          </button>
        </div>
        <div className="sheet-scroll">
          <div style={{ display: "grid", gap: 8, marginBottom: 14 }}>
            {(
              [
                ["dazuo", "打坐", "耗气转内力；气不足时原地调息后续打"],
                ["tuna", "吐纳", "耗精转精力；精不足时原地调息后续吐"],
                ["lian", "练功", "耗精力/内力；不足时原地调息后续练"],
              ] as const
            ).map(([m, title, sub]) => (
              <button
                key={m}
                type="button"
                className="chip"
                style={{
                  textAlign: "left",
                  borderRadius: 12,
                  borderColor:
                    mode === m ? "rgba(95,143,120,0.55)" : undefined,
                  background:
                    mode === m ? "rgba(95,143,120,0.15)" : undefined,
                }}
                onClick={() => {
                  setMode(m);
                  setStopWhen(m === "lian" ? "count" : "full");
                }}
              >
                <strong style={{ display: "block", fontFamily: "var(--font-display)" }}>
                  {title}
                </strong>
                <span style={{ fontSize: 12, color: "var(--paper-dim)" }}>{sub}</span>
              </button>
            ))}
          </div>
          {mode === "lian" && (
            <div className="train-practice">
              <p>选择已激发功夫</p>
              {practiceOptions.length ? (
                <div className="chips train-skill-options">
                  {practiceOptions.map((option) => (
                    <button
                      key={option.id}
                      type="button"
                      className={`chip action${
                        selectedPractice === option.id ? " on" : ""
                      }`}
                      onClick={() => setPracticeSkill(option.id)}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
              ) : (
                <p className="doc-status">
                  暂无已激发且可选择的功夫，请先在角色「武功」中激发。
                </p>
              )}
            </div>
          )}
          <div className="train-stop">
            <p style={{ marginBottom: 8, color: "var(--paper-dim)" }}>停止条件</p>
            {mode === "lian" ? (
              <p className="train-stop-fixed">按成功练功次数停止</p>
            ) : (
              <ChoiceRow
                label="停止条件"
                value={stopWhen}
                options={[
                  { id: "full", label: mode === "dazuo" ? "内力接近满" : "精力接近满" },
                  { id: "count", label: "按次数" },
                ]}
                onChange={setStopWhen}
              />
            )}
            {(mode === "lian" || stopWhen === "count") && (
              <label className="train-count-field">
                <span>{mode === "lian" ? "练功次数" : "修炼次数"}</span>
              <input
                type="number"
                min={1}
                max={999}
                value={stopCount}
                  onChange={(e) =>
                    setStopCount(
                      Math.min(999, Math.max(1, Number(e.target.value) || 1))
                    )
                  }
                />
              </label>
            )}
            <label style={{ display: "block", marginTop: 10 }}>
              <input
                type="checkbox"
                checked={stopOnCombat}
                onChange={(e) => setStopOnCombat(e.target.checked)}
              />{" "}
              遇战斗则停止
            </label>
          </div>
          <div className="train-log">
            {trainLog.length === 0 ? (
              <p style={{ color: "var(--paper-dim)" }}>修炼叙事将在此滚动显示</p>
            ) : (
              trainLog.map((l, i) => <p key={i}>{l}</p>)
            )}
          </div>
        </div>
        <div className="sheet-acts">
          {!active ? (
            <>
              <button
                type="button"
                className="go"
                onClick={() =>
                  onStart({
                    mode,
                    stopWhen: mode === "lian" ? "count" : stopWhen,
                    stopCount,
                    skill: mode === "lian" ? selectedPractice : undefined,
                    stopOnCombat,
                  })
                }
                disabled={!canStart}
              >
                开始
              </button>
            </>
          ) : (
            <button type="button" className="go danger" onClick={onStop}>
              停止
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
