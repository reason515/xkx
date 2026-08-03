import { useState } from "react";
import {
  STUDY_SKILLS,
  YANGZHOU_GRIND_TARGETS,
  recExpRange,
} from "../lib/grindTargets";

type Area = "xiakedao" | "yangzhou";

interface Props {
  onClose: () => void;
  onStartQuest?: () => void;
  onStartFishing?: () => void;
  onStartGrind?: (target: string, lowHpPct?: number) => void;
  onStartStudy?: (skill: string) => void;
  onStopAssist: () => void;
  /** 战斗/busy 中停手（不依赖挂机） */
  onHalt?: () => void;
  assistActive: boolean;
  assistStatus?: string;
  /** 当前所在区域；挂机任务按区域开放 */
  area?: Area;
}

interface AssistTask {
  mode: "quest" | "fishing" | "study" | "grind";
  name: string;
  tag: string;
  /** 推荐经验排序键（从低到高） */
  expMin: number;
  expLabel: string;
  expNote?: string;
  rewards: string[];
  flow: string;
  area: Area;
  areaName: string;
  cta: string;
}

/** 挂机任务：按推荐经验从低到高排列 */
const TASKS: AssistTask[] = [
  {
    mode: "fishing",
    name: "钓鱼挂机",
    tag: "零战斗 · 挣钱",
    expMin: 0,
    expLabel: "0 起 · 纯新手",
    rewards: [
      "每钓一条 1~2 实战经验 · 概率 1 潜能",
      "鱼可卖 80~300 文铜钱（钓够 8 条回城出售）",
    ],
    flow: "自动前往水塘垂钓 → 钓够 8 条回醉仙楼卖钱 → 返回水塘循环；精力不足自动调息，饿了吃烤鱼。",
    area: "yangzhou",
    areaName: "扬州城内",
    cta: "开始钓鱼",
  },
  {
    mode: "quest",
    name: "悬赏任务",
    tag: "高收益 · 需战斗",
    expMin: 1,
    expLabel: "0 起 · 弱怪起步",
    expNote: "随经验解锁强敌：野猪 3000 · 强盗 8000 · 流氓头 15000",
    rewards: [
      "每单 200~500 实战经验 · 20~50 潜能 · 100~250 铜钱",
      "连续完成每次 +10% 奖励，最高 +50%",
    ],
    flow: "自动在衙门接悬赏 → 前往击杀目标 → 回衙门领赏 → 循环；气血偏低回民屋免费休整。",
    area: "yangzhou",
    areaName: "扬州城内",
    cta: "开始悬赏",
  },
  {
    mode: "study",
    name: "石壁领悟",
    tag: "侠客岛 · 修炼",
    expMin: 2,
    expLabel: "0 起 · 新手成长",
    rewards: ["所选武功修为：太玄功 / 流星步 / 吴钩剑法 / 五狱掌法"],
    flow: "自动前往对应石室领悟；精神不足时先取腊八粥，没有则上山摘野果恢复。",
    area: "xiakedao",
    areaName: "侠客岛",
    cta: "开始领悟",
  },
  {
    mode: "grind",
    name: "打怪练级",
    tag: "需战斗 · 逐步升级",
    expMin: 0,
    expLabel: "0 起 · 从最弱开刷",
    expNote: "按推荐经验区间选档：超过上限的怪不再给经验，换下一档",
    rewards: [
      "每杀 20~200 实战经验（按所选目标）· 每杀 2~20 潜能",
      "低血自动回民屋免费休整，无需手动吃药",
    ],
    flow: "自动前往所选怪点 → 反复击杀 → 低血回免费民屋睡觉恢复 → 返回继续；按难度从低到高换档。",
    area: "yangzhou",
    areaName: "扬州城内",
    cta: "开始打怪",
  },
];

export function CombatSheet({
  onClose,
  onStartQuest,
  onStartFishing,
  onStartGrind,
  onStartStudy,
  onStopAssist,
  onHalt,
  assistActive,
  assistStatus = "",
  area,
}: Props) {
  const [studySkill, setStudySkill] = useState("taixuan-gong");
  const [grindTarget, setGrindTarget] = useState(YANGZHOU_GRIND_TARGETS[0].id);
  const running = assistActive && /挂机/.test(assistStatus || "");
  /** 按推荐经验从低到高排列 */
  const tasks = [...TASKS].sort((a, b) => a.expMin - b.expMin);

  const hasStart = (t: AssistTask) =>
    t.mode === "fishing"
      ? !!onStartFishing
      : t.mode === "quest"
        ? !!onStartQuest
        : t.mode === "grind"
          ? !!onStartGrind
          : !!onStartStudy;
  const areaOk = (t: AssistTask) => area === t.area;
  const startFor = (t: AssistTask) => {
    if (t.mode === "fishing") onStartFishing?.();
    else if (t.mode === "quest") onStartQuest?.();
    else if (t.mode === "grind") onStartGrind?.(grindTarget, 30);
    else onStartStudy?.(studySkill);
  };

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
          {running ? (
            <div className="assist-running">
              <p className="assist-running-title">挂机进行中</p>
              <p className="assist-running-status">{assistStatus}</p>
            </div>
          ) : (
            <>
              <p className="assist-task-section-title">
                挂机任务 · 按推荐经验从低到高
              </p>
              <div className="assist-task-list">
                {tasks.map((t) => {
                  const ok = areaOk(t);
                  return (
                    <div key={t.mode} className="assist-task-card">
                      <div className="assist-task-head">
                        <span className="assist-task-name">{t.name}</span>
                        <span className="assist-task-tag">{t.tag}</span>
                      </div>
                      <div className="assist-task-meta">
                        <div className="assist-task-row">
                          <span className="assist-task-row-key">推荐经验</span>
                          <span className="assist-task-row-val">
                            {t.expLabel}
                            {t.expNote && (
                              <span className="assist-task-note">{t.expNote}</span>
                            )}
                          </span>
                        </div>
                        <div className="assist-task-row">
                          <span className="assist-task-row-key">可得奖励</span>
                          <span className="assist-task-row-val">
                            {t.rewards.map((r) => (
                              <span key={r} className="assist-task-reward-line">
                                {r}
                              </span>
                            ))}
                          </span>
                        </div>
                        <div className="assist-task-row">
                          <span className="assist-task-row-key">运作流程</span>
                          <span className="assist-task-row-val">{t.flow}</span>
                        </div>
                        {t.mode === "study" && ok && (
                          <div className="assist-task-row">
                            <span className="assist-task-row-key">选择武功</span>
                            <span
                              className="assist-task-skills"
                              role="group"
                              aria-label="选择领悟武功"
                            >
                              {STUDY_SKILLS.map((s) => (
                                <button
                                  key={s.id}
                                  type="button"
                                  className={`chip${studySkill === s.id ? " on" : ""}`}
                                  onClick={() => setStudySkill(s.id)}
                                >
                                  {s.label}
                                </button>
                              ))}
                            </span>
                          </div>
                        )}
                        {t.mode === "grind" && ok && (
                          <div className="assist-task-row">
                            <span className="assist-task-row-key">选择目标</span>
                            <span
                              className="assist-task-skills"
                              role="group"
                              aria-label="选择打怪目标"
                            >
                              {YANGZHOU_GRIND_TARGETS.map((g) => (
                                <button
                                  key={g.id}
                                  type="button"
                                  className={`chip grind-chip${grindTarget === g.id ? " on" : ""}`}
                                  onClick={() => setGrindTarget(g.id)}
                                  title={`推荐玩家经验 ${recExpRange(g)} · 每杀 ${g.gain} 经验`}
                                >
                                  {g.label}
                                  <span className="grind-chip-exp">{recExpRange(g)}</span>
                                </button>
                              ))}
                            </span>
                          </div>
                        )}
                      </div>
                      <div className="assist-task-footer">
                        <span className="assist-task-hint">
                          {ok ? "" : `需在${t.areaName}进行`}
                        </span>
                        <button
                          type="button"
                          className="chip action"
                          disabled={!ok || !hasStart(t)}
                          onClick={() => startFor(t)}
                        >
                          {t.cta}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
              {!area && (
                <p className="doc-status">
                  挂机任务需在扬州城内或侠客岛进行，当前区域暂不支持。
                </p>
              )}
            </>
          )}
        </div>
        {running && (
          <div className="sheet-acts">
            <button type="button" className="danger" onClick={onStopAssist}>
              停止挂机
            </button>
            {onHalt ? (
              <button type="button" onClick={onHalt}>
                停手
              </button>
            ) : null}
          </div>
        )}
      </div>
    </div>
  );
}
