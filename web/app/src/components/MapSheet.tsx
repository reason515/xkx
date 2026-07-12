import { useState } from "react";
import { WORLD_SPOTS, YANGZHOU_CELLS } from "../data/maps";

interface Props {
  onClose: () => void;
}

export function MapSheet({ onClose }: Props) {
  const [mode, setMode] = useState<"region" | "world">("region");

  return (
    <div className="overlay open" onClick={onClose}>
      <div className="sheet" onClick={(e) => e.stopPropagation()}>
        <div className="sheet-top">
          <h3>地图</h3>
          <button type="button" className="close" onClick={onClose}>
            ×
          </button>
        </div>
        <div className="tabs">
          <button
            type="button"
            className={mode === "region" ? "on" : ""}
            onClick={() => setMode("region")}
          >
            区域
          </button>
          <button
            type="button"
            className={mode === "world" ? "on" : ""}
            onClick={() => setMode("world")}
          >
            世界
          </button>
        </div>
        <div className="sheet-scroll">
          {mode === "region" ? (
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(3, 1fr)",
                gap: 6,
              }}
            >
              {YANGZHOU_CELLS.map((c) => (
                <div
                  key={c.id}
                  style={{
                    minHeight: 52,
                    borderRadius: 8,
                    border: "1px solid var(--line)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: 11,
                    background:
                      c.kind === "here"
                        ? "rgba(181,74,58,0.35)"
                        : c.kind === "landmark"
                          ? "rgba(106,143,158,0.18)"
                          : "rgba(95,143,120,0.12)",
                  }}
                >
                  {c.label}
                </div>
              ))}
            </div>
          ) : (
            <div
              style={{
                position: "relative",
                minHeight: 320,
                borderRadius: 12,
                border: "1px solid var(--line-strong)",
                background: "rgba(0,0,0,0.25)",
              }}
            >
              {WORLD_SPOTS.map((s) => (
                <div
                  key={s.id}
                  style={{
                    position: "absolute",
                    left: `${s.x}%`,
                    top: `${s.y}%`,
                    transform: "translate(-50%,-50%)",
                    padding: "5px 8px",
                    borderRadius: 8,
                    fontSize: 10,
                    border: "1px solid var(--line-strong)",
                    background: s.here
                      ? "rgba(181,74,58,0.35)"
                      : "rgba(26,23,20,0.85)",
                  }}
                >
                  {s.label}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
