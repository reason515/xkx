import type { GameState, ScoreAttr, ScoreInfo } from "../lib/types";

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

function attrTone(a?: ScoreAttr): "up" | "down" | "same" {
  if (!a) return "same";
  if (a.cur > a.base) return "up";
  if (a.cur < a.base) return "down";
  return "same";
}

function ScorePanel({ score, fallbackHtml, fallbackText }: {
  score?: ScoreInfo;
  fallbackHtml?: string;
  fallbackText?: string;
}) {
  if (!score || (!score.bio && !score.attrs && score.exp == null && !score.headline)) {
    if (fallbackHtml) {
      return (
        <div
          className="look-block score-block"
          dangerouslySetInnerHTML={{ __html: fallbackHtml }}
        />
      );
    }
    return (
      <div className="look-block score-block">
        {fallbackText || "档案数据将在进入游戏后自动同步。"}
      </div>
    );
  }

  const attrs = [
    ["膂力", "str", score.attrs?.str],
    ["悟性", "int", score.attrs?.int],
    ["根骨", "con", score.attrs?.con],
    ["身法", "dex", score.attrs?.dex],
  ] as const;

  return (
    <div className="score-panel">
      {score.headline && <div className="score-headline">{score.headline}</div>}
      {(score.bio || score.master || score.spouse) && (
        <div className="profile-line">
          {score.bio && <p>{score.bio}</p>}
          {score.master && <p>师父：{score.master}</p>}
          {score.spouse && <p>{score.spouse}</p>}
        </div>
      )}

      {(score.attack != null || score.defense != null) && (
        <div className="combat-grid">
          {score.attack != null && (
            <div className="combat-pill atk">
              <div className="k">攻击</div>
              <div className="v">{score.attack}</div>
            </div>
          )}
          {score.defense != null && (
            <div className="combat-pill def">
              <div className="k">防御</div>
              <div className="v">{score.defense}</div>
            </div>
          )}
        </div>
      )}

      {score.attrs && (
        <div className="attr-list">
          <div className="attr-row head">
            <span className="name" />
            <span className="nums">
              <span className="cur">当前</span>
              <span className="sep">/</span>
              <span className="base">先天</span>
            </span>
          </div>
          {attrs.map(([label, cls, a]) =>
            a ? (
              <div key={cls} className={`attr-row ${cls}`}>
                <span className="name">{label}</span>
                <span className={`nums tone-${attrTone(a)}`}>
                  <span className="cur">{a.cur}</span>
                  <span className="sep">/</span>
                  <span className="base">{a.base}</span>
                </span>
              </div>
            ) : null
          )}
        </div>
      )}

      <div className="scalar-grid">
        {score.exp != null && (
          <div className="scalar exp">
            <span>经验</span>
            <span className="v">{score.exp}</span>
          </div>
        )}
        {score.shen != null && (
          <div className="scalar shen">
            <span>神</span>
            <span className="v">{score.shen}</span>
          </div>
        )}
        {score.questExp != null && (
          <div className="scalar">
            <span>阅历</span>
            <span className="v">{score.questExp}</span>
          </div>
        )}
        {score.kills != null && (
          <div className="scalar">
            <span>杀敌</span>
            <span className="v">
              {score.kills}
              {score.playerKills != null ? `（玩家 ${score.playerKills}）` : ""}
            </span>
          </div>
        )}
        {score.deaths != null && (
          <div className="scalar">
            <span>死亡</span>
            <span className="v">
              {score.deaths}
              {score.normalDeaths != null ? `（正常 ${score.normalDeaths}）` : ""}
            </span>
          </div>
        )}
      </div>
      <p className="attr-legend">当前含装备与临时加成；气血详见上一页。</p>
    </div>
  );
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
            {state.lookHtml ? (
              <div
                className="look-block"
                dangerouslySetInnerHTML={{ __html: state.lookHtml }}
              />
            ) : (
              <div className="look-block">
                {state.lookText || "你看起来平平无奇，似乎需要环顾或刷新面板。"}
              </div>
            )}
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
            <ScorePanel
              score={state.score}
              fallbackHtml={state.scoreHtml}
              fallbackText={state.scoreText}
            />
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
