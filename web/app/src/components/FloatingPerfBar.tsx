import { useMemo } from "react";
import type { EnabledSkill } from "../lib/types";
import { PERF_MOVES } from "../lib/perfMoves.generated";
import type { PerfAction } from "../lib/perfMoves.generated";

interface PerfGroup {
  slot: string;
  skill: string;
  skillName: string;
  actions: PerfAction[];
}

/**
 * 从已激发武功收集绝招。
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
  enabled: Record<string, EnabledSkill>;
  onCmd: (command: string) => void;
  onClose: () => void;
}

/**
 * 战斗中的悬浮绝招按钮条：战斗开始后浮现，点击发 perform 指令；
 * 悬浮在见闻浮层之上，方便边看战斗信息边出招。
 */
export function FloatingPerfBar({ enabled, onCmd, onClose }: Props) {
  const groups = useMemo(() => collectPerfGroups(enabled), [enabled]);
  if (groups.length === 0) return null;

  return (
    <div className="floating-perf" data-testid="floating-perf">
      <div className="floating-perf-head">
        <span className="floating-perf-title">绝招</span>
        <button
          type="button"
          className="floating-perf-close"
          onClick={onClose}
          aria-label="收起绝招按钮"
          title="收起绝招按钮"
        >
          ×
        </button>
      </div>
      <div className="chips">
        {groups.flatMap((g) =>
          g.actions.map((a) => (
            <button
              key={`${g.skill}-${a.action}`}
              type="button"
              className="chip action"
              onClick={() => onCmd(a.command || `perform ${a.action}`)}
            >
              {a.name}
            </button>
          ))
        )}
      </div>
    </div>
  );
}
