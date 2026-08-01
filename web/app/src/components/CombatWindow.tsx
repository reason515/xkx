import { useEffect, useMemo, useRef } from "react";
import type { EnabledSkill, Vitals } from "../lib/types";
import { PERF_MOVES } from "../lib/perfMoves.generated";
import type { PerfAction } from "../lib/perfMoves.generated";

interface PerfGroup {
  slot: string;
  skill: string;
  skillName: string;
  actions: PerfAction[];
}

/**
 * 从已激发武功收集绝招按钮。
 * 命令统一用无前缀 `perform <action>`：perform.c 对玩家禁止 `<门类>.<招式>`
 * 形式，服务端按当前武器 / 已准备空手门类自动解析。
 */
export function collectPerfGroups(
  enabled: Record<string, EnabledSkill>
): PerfGroup[] {
  const groups: PerfGroup[] = [];
  const seen = new Set<string>();
  for (const [slot, ent] of Object.entries(enabled)) {
    if (!ent || !ent.skill || ent.skill === "无") continue;
    if (seen.has(ent.skill)) continue;
    const data = PERF_MOVES[ent.skill];
    if (!data || data.actions.length === 0) continue;
    seen.add(ent.skill);
    groups.push({
      slot,
      skill: ent.skill,
      skillName: data.name,
      actions: data.actions,
    });
  }
  return groups;
}

interface Props {
  combatLog: { text: string; html?: string }[];
  enabled: Record<string, EnabledSkill>;
  vitals: Vitals;
  onCmd: (command: string) => void;
  onClose: () => void;
}

export function CombatWindow({
  combatLog,
  enabled,
  vitals,
  onCmd,
  onClose,
}: Props) {
  const logRef = useRef<HTMLDivElement>(null);
  const groups = useMemo(() => collectPerfGroups(enabled), [enabled]);

  // 新战斗行到达时自动滚到底部
  useEffect(() => {
    const el = logRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [combatLog.length]);

  return (
    <div className="combat-window" data-testid="combat-window">
      <div className="combat-window-head">
        <span className="combat-window-title">战斗</span>
        <span className="combat-window-vitals">
          气 {vitals.qi ?? 0}/{vitals.maxQi ?? 0} · 内{" "}
          {vitals.neili ?? 0}/{vitals.maxNeili ?? 0}
        </span>
        <button
          type="button"
          className="combat-window-close"
          onClick={onClose}
          aria-label="收起战斗窗"
          title="收起战斗窗"
        >
          ×
        </button>
      </div>
      <div
        className="combat-window-log"
        ref={logRef}
        aria-live="polite"
        aria-relevant="additions text"
      >
        {combatLog.length === 0 ? (
          <p className="combat-window-empty">交战之中…</p>
        ) : (
          combatLog.slice(-40).map((l, i) =>
            l.html ? (
              <p key={i} dangerouslySetInnerHTML={{ __html: l.html }} />
            ) : (
              <p key={i}>{l.text}</p>
            )
          )
        )}
      </div>
      {groups.length > 0 && (
        <div className="combat-window-perf">
          {groups.map((g) => (
            <div key={g.skill} className="combat-window-perf-group">
              <span className="combat-window-perf-skill">{g.skillName}</span>
              <div className="chips">
                {g.actions.map((a) => (
                  <button
                    key={a.action}
                    type="button"
                    className="chip action"
                    onClick={() => onCmd(`perform ${a.action}`)}
                  >
                    {a.name}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
