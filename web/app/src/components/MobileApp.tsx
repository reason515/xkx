import { ExitPad } from "./ExitPad";
import type { GameApi } from "../context/DesktopContext";
import type { UiMode } from "../lib/uiMode";
import { CharacterSheet } from "./CharacterSheet";
import { MapSheet } from "./MapSheet";
import { HelpSheet } from "./HelpSheet";
import { TrainSheet } from "./TrainSheet";
import { CombatSheet } from "./CombatSheet";
import { CollapsibleDesc } from "./CollapsibleDesc";
import { GrindBanner } from "./GrindBanner";
import { EntitySheet } from "./EntitySheet";
import { SpeechSheet } from "./SpeechSheet";
import { GuideTip } from "./GuideTip";
import { FloatingQuestBar } from "./FloatingQuestBar";
import { AttributeSheet } from "./AttributeSheet";
import { BankingPrompt } from "./BankingPrompt";
import { inferredShutDoorActions, sceneActionChips, vitalCap } from "../lib/parser";
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import type { ExitInfo, LogEntry } from "../lib/types";

function pct(cur?: number, max?: number) {
  if (!cur || !max) return "0%";
  return `${Math.min(100, Math.round((cur / max) * 100))}%`;
}

function vitalClass(cur?: number, max?: number) {
  if (!cur || !max) return "";
  return cur / max < 0.3 ? " vital-low" : "";
}

function vitalValue(cur?: number, max?: number) {
  return `${cur ?? "—"}/${max ?? "—"}`;
}

const LOG_FOLLOW_PX = 48;

function EventLog({
  logs,
  onCmd,
  showCmd,
}: {
  logs: LogEntry[];
  onCmd: (command: string) => void;
  showCmd: boolean;
}) {
  const panelRef = useRef<HTMLElement>(null);
  const followingRef = useRef(true);
  const pinningRef = useRef(false);
  const [following, setFollowing] = useState(true);
  const [expanded, setExpanded] = useState(false);
  const [cmdDraft, setCmdDraft] = useState("");
  const lastLogId = logs.length ? logs[logs.length - 1]!.id : 0;
  const latest = logs.length ? logs[logs.length - 1] : undefined;

  const pinToBottom = () => {
    const panel = panelRef.current;
    if (!panel) return;
    pinningRef.current = true;
    panel.scrollTop = panel.scrollHeight;
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        pinningRef.current = false;
      });
    });
  };

  useLayoutEffect(() => {
    if (expanded && followingRef.current) pinToBottom();
  }, [expanded, lastLogId, logs.length]);

  const openLog = () => {
    followingRef.current = true;
    setFollowing(true);
    setExpanded(true);
  };

  const submitCmd = () => {
    const text = cmdDraft.trim();
    if (!text) return;
    onCmd(text);
    setCmdDraft("");
  };

  return (
    <div className="log-section">
      <button
        type="button"
        className="log-summary"
        data-testid="event-log"
        aria-expanded={expanded}
        onClick={openLog}
      >
        <span className="log-summary-title">见闻</span>
        <span className={`log-summary-text${latest?.kind === "combat" ? " hl" : ""}`}>
          {latest?.html ? (
            <span dangerouslySetInnerHTML={{ __html: latest.html }} />
          ) : (
            latest?.text || "尚无新的见闻"
          )}
        </span>
        <span className="log-summary-open">展开</span>
      </button>
      {showCmd && (
        <form
          className="log-cmd"
          onSubmit={(e) => {
            e.preventDefault();
            submitCmd();
          }}
        >
          <input
            type="text"
            className="log-cmd-input"
            value={cmdDraft}
            onChange={(e) => setCmdDraft(e.target.value)}
            placeholder="输入指令…"
            aria-label="指令"
            autoComplete="off"
            spellCheck={false}
          />
          <button type="submit" className="log-cmd-send">
            发送
          </button>
        </form>
      )}
      {expanded && (
        <div className="overlay open log-overlay" onClick={() => setExpanded(false)}>
          <div className="sheet log-sheet" onClick={(e) => e.stopPropagation()}>
            <div className="sheet-top">
              <h3>见闻</h3>
              <button type="button" className="close" onClick={() => setExpanded(false)}>
                ×
              </button>
            </div>
            <section
              ref={panelRef}
              className="log log-panel"
              aria-label="完整见闻"
              onScroll={() => {
                if (pinningRef.current) return;
                const panel = panelRef.current;
                if (!panel) return;
                const atBottom =
                  panel.scrollHeight - panel.scrollTop - panel.clientHeight <
                  LOG_FOLLOW_PX;
                followingRef.current = atBottom;
                setFollowing(atBottom);
              }}
            >
              {!following && (
                <div className="log-head">
                  <button
                    type="button"
                    onClick={() => {
                      followingRef.current = true;
                      setFollowing(true);
                      pinToBottom();
                    }}
                  >
                    最新
                  </button>
                </div>
              )}
              <div aria-live="polite" aria-relevant="additions text">
                {logs.slice(-100).map((l) =>
                  l.html ? (
                    <p
                      key={l.id}
                      className={l.kind === "combat" ? "hl" : ""}
                      dangerouslySetInnerHTML={{ __html: l.html }}
                    />
                  ) : (
                    <p key={l.id} className={l.kind === "combat" ? "hl" : ""}>
                      {l.text}
                    </p>
                  )
                )}
              </div>
            </section>
          </div>
        </div>
      )}
    </div>
  );
}

export function MobileApp({ game: g, mode, onModeChange }: { game: GameApi; mode: UiMode; onModeChange: (m: UiMode) => void }) {
  const { state, toast } = g;
  const v = state.vitals;
  const [menuOpen, setMenuOpen] = useState(false);
  const [showCmd, setShowCmd] = useState(false);
  const [ctxTab, setCtxTab] = useState<"npcs" | "items" | "actions">("npcs");
  const [bankingCmd, setBankingCmd] = useState<"cun" | "qu" | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!menuOpen) return;
    const onPointerDown = (e: PointerEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setMenuOpen(false);
    };
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [menuOpen]);

  const afterEntityAction = (command: string) => {
    g.cmd(command, { feedback: true });
  };

  const afterBoardDocAction = (command: string) => {
    g.docCmd(command, "entity");
  };

  const openMap = () => {
    g.clearDoc();
    g.openSheet("map");
    // 同步触发 localmaps 命令（正厅有任务触发器，其他区域显示内置地图）
    g.cmd("localmaps", { silent: true });
  };

  const doorActions = inferredShutDoorActions(state.room);
  const doorCmds = new Set(doorActions.map((a) => a.command));
  // 开门/开锁已贴在出口下，动作区不再重复
  const sceneActions = sceneActionChips(state.suggestedActions).filter(
    (a) => !doorCmds.has(a.command)
  );

  const hasNpcs = state.room.npcs.length > 0;
  const hasItems = state.room.items.length > 0;

  // 切换房间时重置场景 tab 到第一个可用项
  useEffect(() => {
    if (hasNpcs) setCtxTab("npcs");
    else if (hasItems) setCtxTab("items");
    else if (sceneActions.length > 0) setCtxTab("actions");
  }, [state.room.title]);

  const hasNewbieQuest = (state.newbieQuestIndex ?? 0) > 0;

  return (
    <div className={`phone${hasNewbieQuest ? " has-quest" : ""}`}>
      <div className={`toast ${toast ? "show" : ""}`}>{toast}</div>
      <div className="screen">
        <header className="topbar">
          <button
            type="button"
            className="hero-avatar"
            onClick={g.onOpenCharacter}
            aria-label={`角色：${state.playerName}`}
          >
            {(state.playerName || "侠")[0]}
          </button>
          <div className="vitals" aria-label="身体状态">
            <div className={`vital hp${vitalClass(v.qi, vitalCap(v, "qi"))}`}>
              <span className="vital-label">气</span>
              <div className="bar">
                <div className="fill" style={{ width: pct(v.qi, vitalCap(v, "qi")) }} />
              </div>
              <span className="n">{vitalValue(v.qi, vitalCap(v, "qi"))}</span>
            </div>
            <div className={`vital sp${vitalClass(v.jing, vitalCap(v, "jing"))}`}>
              <span className="vital-label">精</span>
              <div className="bar">
                <div
                  className="fill"
                  style={{ width: pct(v.jing, vitalCap(v, "jing")) }}
                />
              </div>
              <span className="n">{vitalValue(v.jing, vitalCap(v, "jing"))}</span>
            </div>
            <div className={`vital mp${vitalClass(v.neili, vitalCap(v, "neili"))}`}>
              <span className="vital-label">内</span>
              <div className="bar">
                <div
                  className="fill"
                  style={{ width: pct(v.neili, vitalCap(v, "neili")) }}
                />
              </div>
              <span className="n">{vitalValue(v.neili, vitalCap(v, "neili"))}</span>
            </div>
          </div>
          <div className="topbar-menu" ref={menuRef}>
            <button
              type="button"
              className="menu-btn"
              aria-label="菜单"
              aria-expanded={menuOpen}
              aria-haspopup="menu"
              onClick={() => setMenuOpen((o) => !o)}
            >
              菜<br />单
            </button>
            {menuOpen && (
              <div className="menu-panel" role="menu">
                <button
                  type="button"
                  role="menuitem"
                  onClick={() => {
                    setMenuOpen(false);
                    g.refreshCharacter();
                    g.openSheet("train");
                  }}
                >
                  修炼
                </button>
                <button
                  type="button"
                  role="menuitem"
                  onClick={() => {
                    setMenuOpen(false);
                    g.openSheet("combat");
                  }}
                >
                  江湖助手
                </button>
                <button
                  type="button"
                  role="menuitem"
                  onClick={() => {
                    setMenuOpen(false);
                    openMap();
                  }}
                >
                  地图
                </button>
                <button
                  type="button"
                  role="menuitem"
                  onClick={() => {
                    setMenuOpen(false);
                    g.openSheet("speech");
                  }}
                >
                  发言
                </button>
                <button
                  type="button"
                  role="menuitem"
                  onClick={() => {
                    setMenuOpen(false);
                    setShowCmd((v) => !v);
                  }}
                >
                  指令{showCmd ? " ✓" : ""}
                </button>
                <button
                  type="button"
                  role="menuitem"
                  onClick={() => {
                    setMenuOpen(false);
                    g.cmd("save");
                  }}
                >
                  存档
                </button>
                <button
                  type="button"
                  role="menuitem"
                  onClick={() => {
                    setMenuOpen(false);
                    g.onOpenHelp();
                  }}
                >
                  帮助
                </button>
                <button
                  type="button"
                  role="menuitem"
                  className="menu-sep"
                  onClick={() => {
                    setMenuOpen(false);
                    onModeChange(mode === "desktop" ? "mobile" : "desktop");
                  }}
                >
                  {mode === "desktop" ? "移动版" : "桌面版"}
                </button>
                <button
                  type="button"
                  role="menuitem"
                  className="menu-quit"
                  onClick={() => {
                    setMenuOpen(false);
                    g.quit();
                  }}
                >
                  退出
                </button>
              </div>
            )}
          </div>
        </header>

        <main className="main">
          <div className="game-body">
            <section className="scene-panel" aria-label="场景">
              <h1 className="room-title">{state.room.title || "…"}</h1>
              <CollapsibleDesc text={state.room.desc} />
              <GrindBanner
                active={state.assistActive}
                status={state.assistStatus}
                onStop={g.stopAssist}
              />
              {g.guideTip && (
                <GuideTip text={g.guideTip.text} onDismiss={g.dismissGuideTip} />
              )}

              <section className="context">
                <div className="ctx-block">
                  <div className="ctx-head">
                    <h2>出口</h2>
                    <button
                      type="button"
                      className="scene-map-btn"
                      aria-label="地图"
                      onClick={openMap}
                    >
                      地图
                    </button>
                  </div>
                  <ExitPad
                    exits={state.room.exits}
                    onSelect={(ex: ExitInfo) => {
                      g.clearDoc();
                      g.setSelectedExit({ dir: ex.dir, name: ex.name });
                      g.openSheet("exit");
                      g.docCmd(`look ${ex.dir}`, "exit");
                    }}
                  />
                  {doorActions.length > 0 && (
                    <div className="chips door-actions" data-testid="door-actions">
                      {doorActions.map((a) => (
                        <button
                          key={a.command}
                          type="button"
                          className="chip action"
                          onClick={() => g.cmd(a.command, { feedback: true })}
                        >
                          {a.label}
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {(hasNpcs || hasItems || sceneActions.length > 0) && (
                  <div className="ctx-block">
                    <div className="scene-tabs" role="tablist" aria-label="场景交互">
                      {hasNpcs && (
                        <button
                          type="button"
                          role="tab"
                          aria-selected={ctxTab === "npcs"}
                          className={ctxTab === "npcs" ? "on" : ""}
                          onClick={() => setCtxTab("npcs")}
                        >
                          人物{state.room.npcs.length > 0 && (
                            <span className="scene-tab-count">{state.room.npcs.length}</span>
                          )}
                        </button>
                      )}
                      {hasItems && (
                        <button
                          type="button"
                          role="tab"
                          aria-selected={ctxTab === "items"}
                          className={ctxTab === "items" ? "on" : ""}
                          onClick={() => setCtxTab("items")}
                        >
                          物品{state.room.items.length > 0 && (
                            <span className="scene-tab-count">{state.room.items.length}</span>
                          )}
                        </button>
                      )}
                      {sceneActions.length > 0 && (
                        <button
                          type="button"
                          role="tab"
                          aria-selected={ctxTab === "actions"}
                          className={ctxTab === "actions" ? "on" : ""}
                          onClick={() => setCtxTab("actions")}
                        >
                          动作{sceneActions.length > 0 && (
                            <span className="scene-tab-count">{sceneActions.length}</span>
                          )}
                        </button>
                      )}
                    </div>

                    {ctxTab === "npcs" && (
                      <div className="chips">
                        {state.room.npcs.map((n) => (
                          <button
                            key={n.id}
                            type="button"
                            className="chip npc"
                            onClick={() => {
                              g.clearDoc();
                              g.setSelectedEntity(n);
                              g.openSheet("entity");
                            }}
                          >
                            {n.name}
                          </button>
                        ))}
                      </div>
                    )}

                    {ctxTab === "items" && (
                      <div className="chips">
                        {state.room.items.map((it, idx) => (
                          <button
                            key={`${it.id}-${it.name}-${idx}`}
                            type="button"
                            className="chip item"
                            onClick={() => {
                              g.clearDoc();
                              g.setSelectedEntity(it);
                              g.openSheet("entity");
                            }}
                          >
                            {it.name}
                          </button>
                        ))}
                      </div>
                    )}

                    {ctxTab === "actions" && (
                      <div className="chips">
                        {sceneActions.map((a) => (
                          <button
                            key={a.command}
                            type="button"
                            className="chip action"
                            onClick={() => { if (a.command === 'cun' || a.command === 'qu') setBankingCmd(a.command as 'cun' | 'qu'); else if (a.command.startsWith('__shop__:')) { const cmdId = a.command.slice(9); const npc = state.room.npcs.find(n => (n.commandId || n.id) === cmdId); if (npc) { g.setSelectedEntity(npc); g.openSheet('entity'); } } else g.cmd(a.command, { feedback: true }); }}
                          >
                            {a.label}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* 战斗绝招——基于已激发的武功 */}
                {Object.keys(state.enabled).length > 0 && (
                  <div className="ctx-block">
                    <h2>绝招</h2>
                    <div className="chips">
                      {Object.entries(state.enabled).map(([slot, ent]) => {
                        const skill = ent.skill;
                        if (!skill || skill === "无") return null;
                        // 常见绝招映射
                        const perfMap: Record<string, [string,string][]> = {
                          sword: [["八方风雨","perform sword.bafang"]],
                          strike: [["太乙掌","perform strike.zhang"]],
                          blade: [["刀法绝招","perform blade.dao"]],
                          cuff: [["拳法绝招","perform cuff.quan"]],
                        };
                        const perfs = perfMap[slot] || [];
                        return perfs.map(([label, cmd]) => (
                          <button key={cmd} type="button" className="chip action"
                            onClick={() => g.cmd(cmd, { feedback: true })}>{label}</button>
                        ));
                      })}
                    </div>
                  </div>
                )}
              </section>
            </section>

            <EventLog logs={state.logs} onCmd={g.cmd} showCmd={showCmd} />
          </div>
        </main>
      </div>

      <FloatingQuestBar questIndex={state.newbieQuestIndex ?? 0} />

      {state.sheet === "character" && (
        <CharacterSheet
          state={state}
          tab={g.charTab}
          onTab={g.setCharTab}
          onClose={g.closeSheet}
          onCmd={(c) => g.cmd(c, { silent: true })}
          onSetWimpy={g.setWimpy}
        />
      )}
      {state.sheet === "map" && (
        <MapSheet
          roomTitle={state.room.title}
          roomArea={state.room.area}
          roomPath={state.room.path}
          roomNpcs={state.room.npcs}
          roomItems={state.room.items}
          roomExits={state.room.exits}
          onClose={g.closeSheet}
          onLocalmaps={() => g.docCmd("localmaps", "help")}
          onNavigate={(ex) => {
            g.closeSheet();
            g.clearDoc();
            g.setSelectedExit({ dir: ex.dir, name: ex.name || ex.dir });
            g.openSheet("exit");
            g.docCmd(`look ${ex.dir}`, "exit");
          }}
          localmapsText={state.docTarget === "help" ? state.docText : ""}
          localmapsLoading={state.docTarget === "help" && state.docLoading}
        />
      )}
      {state.sheet === "help" && (
        <HelpSheet
          currentStage={
            state.newbieQuestIndex && state.newbieQuestIndex > 0
              ? "newbie_village"
              : state.attrSelectData
                ? "graduate"
                : "yangzhou"
          }
          onClose={g.closeSheet}
          onBackToTopics={g.onBackToHelpTopics}
          onCmd={(command) => g.cmd(command)}
        />
      )}
      {state.sheet === "train" && (
        <TrainSheet
          active={state.assistActive}
          status={state.assistStatus}
          trainLog={state.trainLog}
          enabled={state.enabled}
          onClose={g.closeSheet}
          onStart={g.startAssist}
          onStop={g.stopAssist}
        />
      )}
      {state.sheet === "combat" && (
        <CombatSheet
          onClose={g.closeSheet}
          assistActive={state.assistActive}
          assistStatus={state.assistStatus}
          grindArea={
            (state.room.area || "").toLowerCase() === "xiakedao"
              ? "xiakedao"
              : (state.room.area || "").toLowerCase() === "city"
                ? "yangzhou"
                : undefined
          }
          showGrind={["xiakedao", "city"].includes(
            (state.room.area || "").toLowerCase()
          )}
          onStartGrind={(grindTarget, pct) => {
            g.startAssist({
              mode: "grind",
              grindTarget,
              lowHpPct: pct,
            });
            g.closeSheet();
          }}
          onStartStudy={(skill) => {
            g.startAssist({
              mode: "study",
              skill,
            });
            g.closeSheet();
          }}
          onStopAssist={g.stopAssist}
          onHalt={g.halt}
        />
      )}
      {state.sheet === "speech" && (
        <SpeechSheet
          nearby={state.room.npcs}
          onClose={g.closeSheet}
          onSend={(command) => g.cmd(command, { silent: true })}
        />
      )}
      {state.sheet === "entity" && g.selectedEntity && (
        <EntitySheet
          id={g.selectedEntity.id}
          name={g.selectedEntity.name}
          kind={g.selectedEntity.kind}
          commandId={g.selectedEntity.commandId}
          scenery={g.selectedEntity.scenery}
          canApprentice={g.selectedEntity.canApprentice}
          canTrade={g.selectedEntity.canTrade}
          canSell={g.selectedEntity.canSell}
          canSteal={g.selectedEntity.canSteal}
          isCorpse={g.selectedEntity.isCorpse}
          canLoot={g.selectedEntity.canLoot}
          canLead={g.selectedEntity.canLead}
          canBeg={g.selectedEntity.canBeg}
          canPersuade={g.selectedEntity.canPersuade}
          canWithdraw={g.selectedEntity.canWithdraw}
          initialShopMode={!!(g.selectedEntity?.canTrade || g.selectedEntity?.canSell)}
          isContainer={g.selectedEntity.isContainer}
          isBook={g.selectedEntity.isBook}
          canSit={g.selectedEntity.canSit}
          canRide={g.selectedEntity.canRide}
          inventory={state.inventory}
          docText={state.docTarget === "entity" ? state.docText : ""}
          docLoading={state.docTarget === "entity" && state.docLoading}
          askHints={state.suggestedActions}
          recentLog={state.logs
            .slice(-40)
            .map((l) => l.text)
            .join("\n")}
          onClose={g.closeSheet}
          onAction={afterEntityAction}
          onDocAction={afterBoardDocAction}
          onAskList={(command) => g.docCmd(command, "entity")}
          onLearnList={(command) => g.docCmd(command, "entity")}
          onStartLearn={g.startAssist}
          onClearDoc={g.clearDoc}
        />
      )}
      {state.sheet === "exit" && g.selectedExit && (
        <div className="overlay open" onClick={g.closeSheet}>
          <div className="sheet" onClick={(e) => e.stopPropagation()}>
            <div className="sheet-top">
              <h3>{g.selectedExit.name || g.selectedExit.dir}</h3>
              <button type="button" className="close" onClick={g.closeSheet}>
                ×
              </button>
            </div>
            <div className="sheet-scroll">
              {state.docTarget === "exit" &&
              state.docLoading &&
              !state.docText ? (
                <p className="doc-status">正在远眺…</p>
              ) : state.docTarget === "exit" && state.docText ? (
                <pre className="doc-body exit-preview">{state.docText}</pre>
              ) : (
                <p style={{ color: "var(--paper-dim)", lineHeight: 1.75 }}>
                  可至「{g.selectedExit.name || g.selectedExit.dir}」。
                </p>
              )}
              {state.docTarget === "exit" &&
              state.docLoading &&
              state.docText ? (
                <p className="doc-status">继续载入…</p>
              ) : null}
            </div>
            <div className="sheet-acts">
              <button
                type="button"
                onClick={() => g.docCmd(`look ${g.selectedExit!.dir}`, "exit")}
              >
                眺望
              </button>
              <button
                type="button"
                className="go"
                onClick={() => g.confirmGo(g.selectedExit!.dir)}
              >
                前往
              </button>
            </div>
          </div>
        </div>
      )}
      {state.sheet === "attribute" && state.attrSelectData && (
        <AttributeSheet
          budget={state.attrSelectData.budget}
          min={state.attrSelectData.min}
          max={state.attrSelectData.max}
          initial={state.attrSelectData.initial}
          onConfirm={(str, intel, con, dex) =>
            g.confirmAttribute(str, intel, con, dex)
          }
        />
      )}
      {bankingCmd && (
        <BankingPrompt
          command={bankingCmd}
          onConfirm={(fullCmd) => { g.cmd(fullCmd, { feedback: true }); setBankingCmd(null); }}
          onClose={() => setBankingCmd(null)}
        />
      )}
    </div>
  );
}
