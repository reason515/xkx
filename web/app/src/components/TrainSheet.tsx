import { useState } from "react";
import type { AssistConfig } from "../lib/types";

interface Props {
  active: boolean;
  status: string;
  trainLog: string[];
  onClose: () => void;
  onStart: (config: AssistConfig) => void;
  onStop: () => void;
  onCmd: (cmd: string) => void;
}

export function TrainSheet({
  active,
  status,
  trainLog,
  onClose,
  onStart,
  onStop,
  onCmd,
}: Props) {
  const [mode, setMode] = useState<AssistConfig["mode"]>("dazuo");
  const [stopWhen, setStopWhen] = useState<AssistConfig["stopWhen"]>("full");
  const [stopCount, setStopCount] = useState(10);
  const [stopOnCombat, setStopOnCombat] = useState(true);

  return (
    <div className="overlay open" onClick={onClose}>
      <div className="sheet" onClick={(e) => e.stopPropagation()}>
        <div className="sheet-top">
          <div>
            <h3>修炼</h3>
            {active && (
              <p style={{ fontSize: 12, color: "var(--jade-bright)", marginTop: 4 }}>
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
                ["dazuo", "打坐", "恢复内力"],
                ["tuna", "吐纳", "恢复精力"],
                ["lian", "练功", "消耗潜能提升武功"],
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
                onClick={() => setMode(m)}
              >
                <strong style={{ display: "block", fontFamily: "var(--font-display)" }}>
                  {title}
                </strong>
                <span style={{ fontSize: 12, color: "var(--paper-dim)" }}>{sub}</span>
              </button>
            ))}
          </div>
          <div style={{ marginBottom: 14, fontSize: 13 }}>
            <p style={{ marginBottom: 8, color: "var(--paper-dim)" }}>停止条件</p>
            <label style={{ display: "block", marginBottom: 6 }}>
              <input
                type="radio"
                checked={stopWhen === "full"}
                onChange={() => setStopWhen("full")}
              />{" "}
              内力/精力接近满
            </label>
            <label style={{ display: "block", marginBottom: 6 }}>
              <input
                type="radio"
                checked={stopWhen === "count"}
                onChange={() => setStopWhen("count")}
              />{" "}
              练{" "}
              <input
                type="number"
                min={1}
                max={999}
                value={stopCount}
                onChange={(e) => setStopCount(+e.target.value)}
                style={{ width: 56, padding: 4, borderRadius: 6, border: "1px solid var(--line)" }}
              />{" "}
              次
            </label>
            <label style={{ display: "block" }}>
              <input
                type="radio"
                checked={stopWhen === "potential"}
                onChange={() => setStopWhen("potential")}
              />{" "}
              潜能耗尽
            </label>
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
                    stopWhen,
                    stopCount,
                    stopOnCombat,
                  })
                }
              >
                开始
              </button>
              <button type="button" onClick={() => onCmd(mode)}>
                单次
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
