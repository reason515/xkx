import type { GameState } from "../lib/types";

interface Props {
  state: GameState;
  tab: number;
  onTab: (n: number) => void;
  onClose: () => void;
}

function pct(cur?: number, max?: number) {
  if (!cur || !max) return 0;
  return Math.min(100, Math.round((cur / max) * 100));
}

export function CharacterSheet({ state, tab, onTab, onClose }: Props) {
  const v = state.vitals;
  const tabs = ["仪容", "气血", "档案", "武功", "行囊"];

  return (
    <div className="overlay open" onClick={onClose}>
      <div className="sheet" onClick={(e) => e.stopPropagation()}>
        <div className="sheet-top">
          <h3>{state.playerName}</h3>
          <button type="button" className="close" onClick={onClose}>
            ×
          </button>
        </div>
        <div className="tabs">
          {tabs.map((t, i) => (
            <button
              key={t}
              type="button"
              className={tab === i ? "on" : ""}
              onClick={() => onTab(i)}
            >
              {t}
            </button>
          ))}
        </div>
        <div className="sheet-scroll">
          <div className={`panel ${tab === 0 ? "on" : ""}`}>
            <div className="look-block">
              {state.lookText || "你看起来平平无奇，似乎需要环顾或刷新面板。"}
            </div>
          </div>
          <div className={`panel ${tab === 1 ? "on" : ""}`}>
            <div className="meter-list">
              {[
                ["气", v.qi, v.maxQi, "var(--stat-qi)"],
                ["精", v.jing, v.maxJing, "var(--stat-jing)"],
                ["精力", v.jingli, v.maxJingli, "var(--stat-jingli)"],
                ["内力", v.neili, v.maxNeili, "var(--stat-neili)"],
                ["食物", v.food, v.maxFood, "var(--stat-food)"],
                ["饮水", v.water, v.maxWater, "var(--stat-water)"],
              ].map(([label, cur, max, color]) => (
                <div key={label as string}>
                  <div className="meter-head">
                    <span>{label as string}</span>
                    <span>
                      {cur ?? "—"}/{max ?? "—"}
                    </span>
                  </div>
                  <div className="meter-track">
                    <div
                      className="meter-fill"
                      style={{
                        width: `${pct(cur as number, max as number)}%`,
                        background: color as string,
                      }}
                    />
                  </div>
                </div>
              ))}
              <p style={{ marginTop: 12, fontSize: 13, color: "var(--paper-dim)" }}>
                经验 <span style={{ color: "var(--stat-exp)" }}>{v.exp ?? "—"}</span>
                {" · "}
                潜能 <span style={{ color: "var(--stat-potential)" }}>{v.potential ?? "—"}</span>
              </p>
            </div>
          </div>
          <div className={`panel ${tab === 2 ? "on" : ""}`}>
            <div className="look-block">
              {state.scoreText || "档案数据将在进入游戏后自动同步。"}
            </div>
          </div>
          <div className={`panel ${tab === 3 ? "on" : ""}`}>
            {state.skills.length === 0 ? (
              <p style={{ color: "var(--paper-dim)", fontSize: 13 }}>暂无武功数据</p>
            ) : (
              state.skills.map((sk) => (
                <div key={sk.id} className="skill-row" style={{ display: "grid", gridTemplateColumns: "1fr auto", padding: "10px 0", borderBottom: "1px solid var(--line)" }}>
                  <span>
                    {sk.equipped ? "□ " : ""}
                    {sk.name}
                  </span>
                  <span style={{ color: "var(--jade-bright)" }}>Lv{sk.level}</span>
                </div>
              ))
            )}
          </div>
          <div className={`panel ${tab === 4 ? "on" : ""}`}>
            {state.inventory.length === 0 ? (
              <p style={{ color: "var(--paper-dim)", fontSize: 13 }}>行囊空空如也</p>
            ) : (
              state.inventory.map((it) => (
                <div key={it.id} className="bag-item" style={{ padding: "10px 0", borderBottom: "1px solid var(--line)" }}>
                  {it.equipped ? "□ " : ""}
                  {it.name}
                  <span style={{ color: "var(--paper-dim)", fontSize: 12 }}>{it.type}</span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
