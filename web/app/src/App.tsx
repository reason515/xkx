import { ExitPad } from "./components/ExitPad";
import { LoginPage } from "./components/LoginPage";
import { CharacterSheet } from "./components/CharacterSheet";
import { MapSheet } from "./components/MapSheet";
import { HelpSheet } from "./components/HelpSheet";
import { TrainSheet } from "./components/TrainSheet";
import { CombatSheet } from "./components/CombatSheet";
import { EntitySheet } from "./components/EntitySheet";
import { useGame } from "./hooks/useGame";
import { sceneActionChips } from "./lib/parser";
import { useEffect, useRef, useState } from "react";
import type { ExitInfo, LogEntry } from "./lib/types";

function pct(cur?: number, max?: number) {
  if (!cur || !max) return "0%";
  return `${Math.min(100, Math.round((cur / max) * 100))}%`;
}

function EventLog({
  logs,
  onCmd,
}: {
  logs: LogEntry[];
  onCmd: (command: string) => void;
}) {
  const panelRef = useRef<HTMLElement>(null);
  const [following, setFollowing] = useState(true);
  const [cmdDraft, setCmdDraft] = useState("");

  useEffect(() => {
    const panel = panelRef.current;
    if (panel && following) panel.scrollTop = panel.scrollHeight;
  }, [logs, following]);

  const submitCmd = () => {
    const text = cmdDraft.trim();
    if (!text) return;
    onCmd(text);
    setCmdDraft("");
  };

  return (
    <div className="log-section">
      <section
        ref={panelRef}
        className="log log-panel"
        aria-label="见闻"
        onScroll={() => {
          const panel = panelRef.current;
          if (!panel) return;
          setFollowing(
            panel.scrollHeight - panel.scrollTop - panel.clientHeight < 24
          );
        }}
      >
        {!following && (
          <div className="log-head">
            <button
              type="button"
              onClick={() => {
                const panel = panelRef.current;
                if (panel) panel.scrollTop = panel.scrollHeight;
                setFollowing(true);
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
    </div>
  );
}

export default function App() {
  const g = useGame();
  const { state, toast } = g;
  const v = state.vitals;
  const [menuOpen, setMenuOpen] = useState(false);
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
    g.cmd(command);
    const verb = command.trim().split(/\s+/)[0]?.toLowerCase();
    // 拾起/丢下后补 look，避免 room.update 迟到时场景列表残留
    if (verb === "get" || verb === "drop") g.cmd("look", { silent: true });
  };

  const afterBoardDocAction = (command: string) => {
    g.docCmd(command, "entity");
  };

  const openMap = () => {
    g.clearDoc();
    g.openSheet("map");
  };

  const sceneActions = sceneActionChips(state.suggestedActions);

  if (!state.inGame) {
    return (
      <LoginPage
        onLogin={g.login}
        error={g.loginError || undefined}
      />
    );
  }

  return (
    <div className="phone">
      <div className={`toast ${toast ? "show" : ""}`}>{toast}</div>
      <div className="screen">
        <header className="topbar">
          <button type="button" className="hero-btn" onClick={g.onOpenCharacter}>
            <div className="hero-meta">
              <div className="hero-name">{state.playerName}</div>
            </div>
            <div className="vitals">
              <div className="vital hp">
                <div className="bar">
                  <div className="fill" style={{ width: pct(v.qi, v.maxQi) }} />
                </div>
                <span className="n">{v.qi ?? "—"}</span>
              </div>
              <div className="vital sp">
                <div className="bar">
                  <div className="fill" style={{ width: pct(v.jing, v.maxJing) }} />
                </div>
                <span className="n">{v.jing ?? "—"}</span>
              </div>
              <div className="vital mp">
                <div className="bar">
                  <div className="fill" style={{ width: pct(v.neili, v.maxNeili) }} />
                </div>
                <span className="n">{v.neili ?? "—"}</span>
              </div>
            </div>
          </button>
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
              <p className="room-desc">{state.room.desc || "环顾四周以了解所处之地。"}</p>

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
                </div>

                {state.room.npcs.length > 0 && (
                  <div className="ctx-block">
                    <h2>人物</h2>
                    <div className="chips">
                      {state.room.npcs.map((n) => (
                        <button
                          key={n.id}
                          type="button"
                          className="chip npc"
                          onClick={() => {
                            g.clearDoc();
                            g.setSelectedEntity({
                              id: n.id,
                              name: n.name,
                              kind: "npc",
                            });
                            g.openSheet("entity");
                          }}
                        >
                          {n.name}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {state.room.items.length > 0 && (
                  <div className="ctx-block">
                    <h2>物品</h2>
                    <div className="chips">
                      {state.room.items.map((it, idx) => (
                        <button
                          key={`${it.id}-${it.name}-${idx}`}
                          type="button"
                          className="chip item"
                          onClick={() => {
                            g.clearDoc();
                            g.setSelectedEntity({
                              id: it.id,
                              name: it.name,
                              kind: "item",
                            });
                            g.openSheet("entity");
                          }}
                        >
                          {it.name}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {sceneActions.length > 0 && (
                  <div className="ctx-block">
                    <h2>动作</h2>
                    <div className="chips">
                      {sceneActions.map((a) => (
                        <button
                          key={a.command}
                          type="button"
                          className="chip action"
                          onClick={() => g.cmd(a.command)}
                        >
                          {a.label}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </section>
            </section>

            <EventLog logs={state.logs} onCmd={g.cmd} />
          </div>
        </main>
      </div>

      {state.sheet === "character" && (
        <CharacterSheet
          state={state}
          tab={g.charTab}
          onTab={g.setCharTab}
          onClose={g.closeSheet}
          onCmd={(c) => g.cmd(c, { silent: true })}
        />
      )}
      {state.sheet === "map" && (
        <MapSheet
          roomTitle={state.room.title}
          roomArea={state.room.area}
          onClose={g.closeSheet}
        />
      )}
      {state.sheet === "help" && (
        <HelpSheet
          docText={state.docText}
          docLoading={state.docLoading}
          onClose={g.closeSheet}
          onPickTopic={g.onHelpTopic}
          onBackToTopics={g.onBackToHelpTopics}
        />
      )}
      {state.sheet === "train" && (
        <TrainSheet
          active={state.assistActive}
          status={state.assistStatus}
          trainLog={state.trainLog}
          onClose={g.closeSheet}
          onStart={g.startAssist}
          onStop={g.stopAssist}
          onCmd={g.cmd}
        />
      )}
      {state.sheet === "combat" && (
        <CombatSheet
          npcs={state.room.npcs}
          combatLog={state.combatLog}
          onClose={g.closeSheet}
          onCmd={g.cmd}
          assistActive={state.assistActive}
          onStartAssist={(pct, action) =>
            g.startAssist({ mode: "combat", lowHpPct: pct, lowHpAction: action })
          }
          onStopAssist={g.stopAssist}
        />
      )}
      {state.sheet === "entity" && g.selectedEntity && (
        <EntitySheet
          id={g.selectedEntity.id}
          name={g.selectedEntity.name}
          kind={g.selectedEntity.kind}
          docText={state.docTarget === "entity" ? state.docText : ""}
          docLoading={state.docTarget === "entity" && state.docLoading}
          askHints={state.suggestedActions}
          onClose={g.closeSheet}
          onAction={afterEntityAction}
          onDocAction={afterBoardDocAction}
          onAskList={(command) => g.docCmd(command, "entity")}
          onLearnList={(command) => g.docCmd(command, "entity")}
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
                className="go"
                onClick={() => g.confirmGo(g.selectedExit!.dir)}
              >
                前往
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
