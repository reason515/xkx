import { useState } from "react";
import {
  bagItemActions,
  canPrepareSkill,
  DEFAULT_WIMPY_PCT,
  enableSlotLabel,
  findEnabledSlot,
  FORCE_EXERT_ACTIONS,
  formatVitalMeter,
  hasLearnedForceSkill,
  hasMappedForce,
  isBasicSkillId,
  isKnowledgeSkill,
  resolveEnableSlots,
  vitalCap,
} from "../lib/parser";
import type { GameState, InvItem, ScoreAttr, ScoreInfo, SkillRow } from "../lib/types";

/** MUD next-level cost: (level + 1)^2 */
function skillNextCost(level: number) {
  const n = Math.max(0, level) + 1;
  return n * n;
}

function skillProgress(sk: SkillRow) {
  const need = skillNextCost(sk.level);
  const learned = Math.max(0, sk.learned || 0);
  const pct = need > 0 ? Math.min(100, Math.round((learned / need) * 100)) : 0;
  return { need, learned, pct };
}

interface Props {
  state: GameState;
  tab: number;
  onTab: (n: number) => void;
  onClose: () => void;
  onCmd: (cmd: string) => void;
  onSetWimpy?: (pct: number) => void;
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

const WIMPY_PRESETS = [40, 50, 60, 70] as const;

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
              <div className="v">
                {score.attack}
                {score.attackBonus != null && score.attackBonus !== 0 ? (
                  <span className="bonus">+{score.attackBonus}</span>
                ) : null}
              </div>
            </div>
          )}
          {score.defense != null && (
            <div className="combat-pill def">
              <div className="k">防御</div>
              <div className="v">
                {score.defense}
                {score.defenseBonus != null && score.defenseBonus !== 0 ? (
                  <span className="bonus">+{score.defenseBonus}</span>
                ) : null}
              </div>
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

function ForceExertBlock({
  state,
  onCmd,
}: {
  state: GameState;
  onCmd: (cmd: string) => void;
}) {
  const mapped = hasMappedForce(state.enabled);
  const learned = hasLearnedForceSkill(state.skills);
  if (!mapped && !learned) return null;

  const forceName =
    state.enabled.force?.name || state.enabled.force?.skill || "内功";

  return (
    <div className="force-exert" data-testid="force-exert">
      <h4>运功</h4>
      {mapped ? (
        <>
          <p className="skill-hint">
            已激发{forceName}。可消耗内力调息恢复，或运转内息疗伤。
          </p>
          <div className="skill-act-chips">
            {FORCE_EXERT_ACTIONS.map((act) => (
              <button
                key={act.id}
                type="button"
                className="skill-act chip"
                title={act.hint}
                data-testid={`force-exert-${act.id}`}
                onClick={() => onCmd(act.command)}
              >
                {act.label}
              </button>
            ))}
          </div>
        </>
      ) : (
        <p className="skill-hint">
          学会内功后可运功回气、疗伤。请先到「武功」激发一门内功。
        </p>
      )}
    </div>
  );
}

function WimpyBlock({
  current,
  onSetWimpy,
}: {
  current?: number;
  onSetWimpy?: (pct: number) => void;
}) {
  const set = typeof current === "number" && current > 0 ? current : null;
  const highlight = set ?? DEFAULT_WIMPY_PCT;
  return (
    <div className="wimpy-block">
      <p className="skill-hint">遇险撤退：气血低于设定比例时自动逃离战斗。新手宜偏高。</p>
      <p className="wimpy-current">
        {set == null ? (
          <>
            当前未设置 · 建议 <strong>{DEFAULT_WIMPY_PCT}%</strong>
          </>
        ) : (
          <>
            当前 <strong>{set}%</strong>
          </>
        )}
      </p>
      <div className="skill-act-chips">
        {WIMPY_PRESETS.map((n) => (
          <button
            key={n}
            type="button"
            className={`skill-act chip${highlight === n ? " on" : ""}`}
            onClick={() => onSetWimpy?.(n)}
          >
            {n}%
            {n === DEFAULT_WIMPY_PCT && set == null ? " · 建议" : ""}
          </button>
        ))}
      </div>
    </div>
  );
}

function SkillsPanel({
  state,
  onCmd,
}: {
  state: GameState;
  onCmd: (cmd: string) => void;
}) {
  const [openId, setOpenId] = useState<string | null>(null);
  const enabledEntries = Object.entries(state.enabled);
  const preparedEntries = Object.entries(state.prepared);

  const slotsBlock = (
    <section className="skill-slots">
      <h4>已激发</h4>
      {enabledEntries.length === 0 ? (
        <p className="skill-hint">
          尚未激发特殊武功。特殊功夫点开后可选门类激发；基本功夫无需激发。
        </p>
      ) : (
        <ul className="slot-list">
          {enabledEntries.map(([slot, ent]) => (
            <li key={slot}>
              <span className="slot-name">{enableSlotLabel(slot)}</span>
              <span className="slot-skill">{ent.name || ent.skill}</span>
              <span className="slot-lv">Lv{ent.level}</span>
            </li>
          ))}
        </ul>
      )}
      {preparedEntries.length > 0 && (
        <>
          <h4>已准备</h4>
          <ul className="slot-list">
            {preparedEntries.map(([slot, name]) => (
              <li key={slot}>
                <span className="slot-name">{enableSlotLabel(slot)}</span>
                <span className="slot-skill">{name}</span>
              </li>
            ))}
          </ul>
          <button
            type="button"
            className="skill-act ghost"
            onClick={() => onCmd("prepare none")}
          >
            取消准备
          </button>
        </>
      )}
    </section>
  );

  if (state.skills.length === 0) {
    return (
      <div className="skills-panel">
        {slotsBlock}
        <p style={{ color: "var(--paper-dim)", fontSize: 13 }}>暂无武功数据</p>
      </div>
    );
  }

  return (
    <div className="skills-panel">
      {slotsBlock}

      {state.skills.map((sk) => {
        const { need, learned, pct } = skillProgress(sk);
        const band = Math.min(6, Math.max(1, sk.mastery || 1));
        const open = openId === sk.id;
        const basic = isBasicSkillId(sk.id);
        const knowledge = isKnowledgeSkill(sk);
        const slots = resolveEnableSlots(
          sk.id,
          state.skillEnableSlots,
          sk.enableSlots
        );
        const mappedSlot = findEnabledSlot(sk.id, state.enabled);
        const prepareSlot = canPrepareSkill(sk.id, state.enabled);
        const special = !basic && !knowledge;

        return (
          <div key={sk.id} className={`skill-row ${sk.category || "misc"} ${open ? "open" : ""}`}>
            <button
              type="button"
              className="skill-row-btn"
              onClick={() => setOpenId(open ? null : sk.id)}
            >
              <div className="skill-main">
                <div className="name">
                  {sk.equipped || mappedSlot ? <span className="eq">□</span> : null}
                  <span className="skname">{sk.name}</span>
                </div>
                <div className="barline" aria-hidden="true">
                  <i style={{ width: `${pct}%` }} />
                </div>
              </div>
              <div className="meta">
                <span className={`mastery m${band}`}>
                  {sk.masteryLabel || "初学乍练"}
                </span>
                <span className="num">
                  Lv{sk.level}
                  <span className="prog">
                    {learned}/{need}
                  </span>
                </span>
              </div>
            </button>

            {open && (
              <div className="skill-actions">
                {basic && (
                  <p className="skill-hint">基本功夫，无需激发。</p>
                )}
                {knowledge && (
                  <p className="skill-hint">知识技能，无需激发。</p>
                )}
                {special && mappedSlot && (
                  <button
                    type="button"
                    className="skill-act"
                    onClick={() => onCmd(`enable ${mappedSlot} none`)}
                  >
                    卸下（{enableSlotLabel(mappedSlot)}）
                  </button>
                )}
                {special && prepareSlot && (
                  <button
                    type="button"
                    className="skill-act"
                    onClick={() => onCmd(`prepare ${sk.id}`)}
                  >
                    准备出招
                  </button>
                )}
                {special && slots.length > 0 && (
                  <>
                    <p className="skill-hint">激发为：</p>
                    <div className="skill-act-chips">
                      {slots.map((slot) => (
                        <button
                          key={slot}
                          type="button"
                          className={`skill-act chip ${mappedSlot === slot ? "on" : ""}`}
                          onClick={() => onCmd(`enable ${slot} ${sk.id}`)}
                        >
                          {enableSlotLabel(slot)}
                        </button>
                      ))}
                    </div>
                  </>
                )}
                {special && slots.length === 0 && !mappedSlot && (
                  <p className="skill-hint">此武功暂无可激发门类。</p>
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

function BagPanel({
  items,
  onCmd,
}: {
  items: InvItem[];
  onCmd: (cmd: string) => void;
}) {
  const [openKey, setOpenKey] = useState<string | null>(null);

  if (items.length === 0) {
    return (
      <p style={{ color: "var(--paper-dim)", fontSize: 13 }}>行囊空空如也</p>
    );
  }

  return (
    <div className="bag-panel">
      <p className="skill-hint">点开物品可查看、穿戴、食用或丢下。</p>
      {items.map((it) => {
        const key = `${it.id}-${it.name}`;
        const open = openKey === key;
        const actions = bagItemActions(it, items);
        const kindLabel =
          it.equipKind === "weapon"
            ? "武器"
            : it.equipKind === "armor"
              ? "防具"
              : it.equipKind === "food"
                ? "食物"
                : it.equipKind === "drink"
                  ? "饮品"
                  : it.equipKind === "drug"
                    ? "药品"
                    : it.type && /[\u4e00-\u9fff]/.test(it.type)
                      ? it.type
                      : "";
        return (
          <div key={key} className={`bag-item ${open ? "open" : ""}`}>
            <button
              type="button"
              className="bag-item-btn"
              onClick={() => setOpenKey(open ? null : key)}
            >
              <span className="bag-name">
                {it.equipped ? <span className="eq">□</span> : null}
                {it.embedded ? <span className="eq">√</span> : null}
                {it.name}
              </span>
              {kindLabel ? <span className="bag-kind">{kindLabel}</span> : null}
            </button>
            {open && (
              <div className="skill-actions">
                {it.embedded ? (
                  <p className="skill-hint">嵌在身上，无法直接操作。</p>
                ) : actions.length === 0 ? (
                  <p className="skill-hint">暂无可做之事。</p>
                ) : (
                  <div className="skill-act-chips">
                    {actions.map((a) => (
                      <button
                        key={a.command}
                        type="button"
                        className="skill-act chip"
                        onClick={() => onCmd(a.command)}
                      >
                        {a.label}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

export function CharacterSheet({
  state,
  tab,
  onTab,
  onClose,
  onCmd,
  onSetWimpy,
}: Props) {
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
              {(
                [
                  {
                    key: "qi",
                    label: "气",
                    cur: v.qi,
                    cap: vitalCap(v, "qi"),
                    innate: v.maxQi,
                    color: "var(--stat-qi)",
                  },
                  {
                    key: "jing",
                    label: "精",
                    cur: v.jing,
                    cap: vitalCap(v, "jing"),
                    innate: v.maxJing,
                    color: "var(--stat-jing)",
                  },
                  {
                    key: "jingli",
                    label: "精力",
                    cur: v.jingli,
                    cap: vitalCap(v, "jingli"),
                    color: "var(--stat-jingli)",
                  },
                  {
                    key: "neili",
                    label: "内力",
                    cur: v.neili,
                    cap: vitalCap(v, "neili"),
                    color: "var(--stat-neili)",
                  },
                  {
                    key: "food",
                    label: "食物",
                    cur: v.food,
                    cap: vitalCap(v, "food"),
                    color: "var(--stat-food)",
                  },
                  {
                    key: "water",
                    label: "饮水",
                    cur: v.water,
                    cap: vitalCap(v, "water"),
                    color: "var(--stat-water)",
                  },
                ] as Array<{
                  key: string;
                  label: string;
                  cur?: number;
                  cap?: number;
                  innate?: number;
                  color: string;
                }>
              ).map((row) => {
                const wounded =
                  row.innate != null &&
                  row.cap != null &&
                  row.innate > row.cap;
                return (
                  <div
                    key={row.key}
                    data-testid={`vital-${row.key}`}
                    className={wounded ? "meter wounded" : "meter"}
                  >
                    <div className="meter-head">
                      <span>{row.label}</span>
                      <span className="meter-val">
                        {formatVitalMeter(row.cur, row.cap, row.innate)}
                      </span>
                    </div>
                    <div className="meter-track">
                      <div
                        className="meter-fill"
                        style={{
                          width: `${pct(row.cur, row.cap)}%`,
                          background: row.color,
                        }}
                      />
                    </div>
                  </div>
                );
              })}
              <p style={{ marginTop: 12, fontSize: 13, color: "var(--paper-dim)" }}>
                经验 <span style={{ color: "var(--stat-exp)" }}>{v.exp ?? "—"}</span>
                {" · "}
                潜能 <span style={{ color: "var(--stat-potential)" }}>{v.potential ?? "—"}</span>
              </p>
              <ForceExertBlock state={state} onCmd={onCmd} />
            </div>
          </div>
          <div className={`panel ${tab === 2 ? "on" : ""}`}>
            <ScorePanel
              score={state.score}
              fallbackHtml={state.scoreHtml}
              fallbackText={state.scoreText}
            />
            <WimpyBlock current={state.wimpyPct} onSetWimpy={onSetWimpy} />
          </div>
          <div className={`panel ${tab === 3 ? "on" : ""}`}>
            <SkillsPanel state={state} onCmd={onCmd} />
          </div>
          <div className={`panel ${tab === 4 ? "on" : ""}`}>
            <BagPanel items={state.inventory} onCmd={onCmd} />
          </div>
        </div>
      </div>
    </div>
  );
}
