import { useEffect } from "react";
import { useDesktop } from "../../context/DesktopContext";
import type { SkillRow } from "../../lib/types";

function pct(cur?: number, max?: number) {
  if (cur == null || max == null || max <= 0) return 0;
  return Math.min(100, Math.round((cur / max) * 100));
}

function Bar({
  label,
  cur,
  max,
  tone,
}: {
  label: string;
  cur?: number;
  max?: number;
  tone: string;
}) {
  return (
    <div className={`desktop-stat ${tone}`}>
      <div className="desktop-stat-label">
        <span>{label}</span>
        <span>
          {cur ?? "—"}/{max ?? "—"}
        </span>
      </div>
      <div className="desktop-stat-bar">
        <div className="fill" style={{ width: `${pct(cur, max)}%` }} />
      </div>
    </div>
  );
}

function skillNextCost(level: number) {
  const n = Math.max(0, level) + 1;
  return n * n;
}

export function StatusPanel() {
  const { game } = useDesktop();
  const { state } = game;
  const v = state.vitals;
  const score = state.score;

  useEffect(() => {
    game.refreshCharacter();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="desktop-status" data-testid="desktop-status">
      <div className="desktop-status-head">
        <h3>{state.playerName || "角色"}</h3>
        <button type="button" onClick={() => game.onOpenCharacter()}>
          详情
        </button>
      </div>

      <section>
        <h4>气血精内力</h4>
        <Bar label="气" cur={v.qi} max={v.effQi ?? v.maxQi} tone="qi" />
        <Bar label="精" cur={v.jing} max={v.effJing ?? v.maxJing} tone="jing" />
        <Bar label="内力" cur={v.neili} max={v.maxNeili} tone="neili" />
        <Bar label="精力" cur={v.jingli} max={v.maxJingli} tone="jingli" />
        <Bar label="食物" cur={v.food} max={v.maxFood} tone="food" />
        <Bar label="饮水" cur={v.water} max={v.maxWater} tone="water" />
      </section>

      {score?.attrs && (
        <section>
          <h4>基本属性</h4>
          <div className="desktop-attrs">
            <span>
              膂力 {score.attrs.str?.cur ?? "—"} / {score.attrs.str?.base ?? "—"}
            </span>
            <span>
              悟性 {score.attrs.int?.cur ?? "—"} / {score.attrs.int?.base ?? "—"}
            </span>
            <span>
              根骨 {score.attrs.con?.cur ?? "—"} / {score.attrs.con?.base ?? "—"}
            </span>
            <span>
              身法 {score.attrs.dex?.cur ?? "—"} / {score.attrs.dex?.base ?? "—"}
            </span>
          </div>
          {(score.attack != null || score.defense != null) && (
            <p className="desktop-muted">
              攻击 {score.attack ?? "—"} · 防御 {score.defense ?? "—"}
            </p>
          )}
        </section>
      )}

      <section>
        <h4>武功</h4>
        <ul className="desktop-skills">
          {state.skills.slice(0, 24).map((sk: SkillRow) => {
            const need = skillNextCost(sk.level);
            const p =
              need > 0
                ? Math.min(100, Math.round(((sk.learned || 0) / need) * 100))
                : 0;
            return (
              <li key={sk.id}>
                <span>{sk.name}</span>
                <span className="lv">Lv{sk.level}</span>
                <div className="mini-bar">
                  <div className="fill" style={{ width: `${p}%` }} />
                </div>
              </li>
            );
          })}
          {state.skills.length === 0 && (
            <li className="desktop-muted">暂无武功数据</li>
          )}
        </ul>
      </section>

      <section>
        <h4>行囊 ({state.inventory.length})</h4>
        <ul className="desktop-inv">
          {state.inventory.slice(0, 40).map((it) => (
            <li key={`${it.id}-${it.name}`}>
              {it.equipped ? "□ " : "· "}
              {it.name}
            </li>
          ))}
          {state.inventory.length === 0 && (
            <li className="desktop-muted">行囊为空</li>
          )}
        </ul>
      </section>
    </div>
  );
}
