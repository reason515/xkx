import { useState } from "react";
import {
  GRIND_TARGETS,
  STUDY_SKILLS,
  YANGZHOU_GRIND_TARGETS,
} from "../lib/grindTargets";

type GrindTab = "fight" | "study";

interface Props {
  onClose: () => void;
  onStartGrind?: (grindTarget: string, lowHpPct: number) => void;
  onStartStudy?: (skill: string) => void;
  onStartQuest?: () => void;
  onStartFishing?: () => void;
  onStopAssist: () => void;
  /** 战斗/busy 中停手（不依赖挂机） */
  onHalt?: () => void;
  assistActive: boolean;
  /** 当前可用的挂机区域；石壁领悟仅侠客岛支持。 */
  grindArea?: "xiakedao" | "yangzhou";
  showGrind?: boolean;
  assistStatus?: string;
}

export function CombatSheet({
  onClose,
  onStartGrind,
  onStartStudy,
  onStartQuest,
  onStartFishing,
  onStopAssist,
  onHalt,
  assistActive,
  grindArea,
  showGrind = false,
  assistStatus = "",
}: Props) {
  const targets = grindArea === "yangzhou" ? YANGZHOU_GRIND_TARGETS : GRIND_TARGETS;
  const canStudy = grindArea === "xiakedao";
  const [tab, setTab] = useState<GrindTab>("fight");
  const [grindTarget, setGrindTarget] = useState(() => targets[0].id);
  const [grindLowHp, setGrindLowHp] = useState(30);
  const [studySkill, setStudySkill] = useState("taixuan-gong");
  const grinding = assistActive && /挂机/.test(assistStatus || "");
  const displayStatus = assistStatus.replace(/挂机/g, "自动历练");
  const studying =
    grinding &&
    /石壁|领悟|前往石室|摘野果|取粥|喝粥|吃果/.test(assistStatus || "");

  return (
    <div className="overlay open" onClick={onClose}>
      <div className="sheet" onClick={(e) => e.stopPropagation()}>
        <div className="sheet-top">
          <h3>江湖助手</h3>
          <button type="button" className="close" onClick={onClose}>
            ×
          </button>
        </div>
        <div className="sheet-scroll">
          {!showGrind ? (
            <p className="doc-status">请前往侠客岛，或扬州城内任意地点。</p>
          ) : grinding ? (
            <>
              <p className="combat-assist-label">自动历练进行中</p>
              <p
                style={{
                  fontSize: 14,
                  color: "var(--jade-bright)",
                  marginBottom: 16,
                }}
              >
                {displayStatus || "自动历练中"}
              </p>
              <p
                style={{
                  fontSize: 13,
                  color: "var(--paper-dim)",
                  marginBottom: 12,
                }}
              >
                {studying
                  ? "自动前往石室领悟；精神不足时先取腊八粥，没有则上山摘野果。"
                  : grindArea === "yangzhou"
                    ? "自动寻怪交手；气血过低会回民屋免费休整，恢复后再回场。"
                    : "自动寻怪交手；气血过低会撤回休整，恢复后再回场。"}
              </p>
            </>
          ) : (
            <>
              {canStudy && (
                <div className="grind-tab-row" role="tablist" aria-label="历练类型">
                  <button
                    type="button"
                    role="tab"
                    aria-selected={tab === "fight"}
                    className={`grind-tab${tab === "fight" ? " on" : ""}`}
                    onClick={() => setTab("fight")}
                  >
                    自动战斗
                  </button>
                  <button
                    type="button"
                    role="tab"
                    aria-selected={tab === "study"}
                    className={`grind-tab${tab === "study" ? " on" : ""}`}
                    onClick={() => setTab("study")}
                  >
                    自动领悟
                  </button>
                </div>
              )}
              {grindArea === "yangzhou" && onStartQuest && (
                <div className="quest-assist-block">
                  <button
                    type="button"
                    className="chip action"
                    onClick={() => onStartQuest()}
                  >
                    悬赏任务挂机
                  </button>
                  <p className="quest-assist-desc">
                    自动接衙门悬赏 → 前往击杀目标 → 回衙门领赏，循环进行。
                  </p>
                </div>
              )}
              {grindArea === "yangzhou" && onStartFishing && (
                <div className="quest-assist-block">
                  <button
                    type="button"
                    className="chip action"
                    onClick={() => onStartFishing()}
                  >
                    钓鱼挂机
                  </button>
                  <p className="quest-assist-desc">
                    自动前往东郊水塘垂钓，钓到的鱼回醉仙楼卖钱，零战斗挣钱。
                  </p>
                </div>
              )}
              {tab === "fight" || !canStudy ? (
                <>
                  <p className="combat-assist-label">选择对手</p>
                  <p
                    style={{
                      fontSize: 13,
                      color: "var(--paper-dim)",
                      marginBottom: 12,
                    }}
                  >
                    {grindArea === "yangzhou"
                      ? "按由弱到强排列；低血时会回民屋免费休整。"
                      : "按由弱到强排列；开始后自动寻路前往刷怪点。"}
                  </p>
                  <div className="grind-target-list">
                    {targets.map((t) => (
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
                  <label
                    className="combat-assist-threshold"
                    style={{ marginTop: 14 }}
                  >
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
              ) : (
                <>
                  <p className="combat-assist-label">选择武功</p>
                  <p
                    style={{
                      fontSize: 13,
                      color: "var(--paper-dim)",
                      marginBottom: 12,
                    }}
                  >
                    开始后自动前往对应石室领悟；精神不足时取粥或摘野果恢复。
                  </p>
                  <div className="grind-target-list">
                    {STUDY_SKILLS.map((s) => (
                      <button
                        key={s.id}
                        type="button"
                        className={`grind-target${
                          studySkill === s.id ? " on" : ""
                        }`}
                        onClick={() => setStudySkill(s.id)}
                      >
                        <span className="grind-target-name">{s.label}</span>
                        <span className="grind-target-hint">{s.hint}</span>
                      </button>
                    ))}
                  </div>
                </>
              )}
            </>
          )}
        </div>
        <div className="sheet-acts">
          {grinding ? (
            <button type="button" className="danger" onClick={onStopAssist}>
              停止自动历练
            </button>
          ) : tab === "fight" ? (
            <button
              type="button"
              className="go"
              disabled={!showGrind || !onStartGrind || !grindTarget}
              onClick={() => onStartGrind?.(grindTarget, grindLowHp)}
            >
              开始自动战斗
            </button>
          ) : (
            <button
              type="button"
              className="go"
              disabled={!showGrind || !onStartStudy || !studySkill}
              onClick={() => onStartStudy?.(studySkill)}
            >
              开始自动领悟
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
