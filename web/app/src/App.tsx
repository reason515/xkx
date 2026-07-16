import { ExitPad } from "./components/ExitPad";
import { LoginPage } from "./components/LoginPage";
import { CharacterSheet } from "./components/CharacterSheet";
import { MapSheet } from "./components/MapSheet";
import { TrainSheet } from "./components/TrainSheet";
import { CombatSheet } from "./components/CombatSheet";
import { EntitySheet } from "./components/EntitySheet";
import { useGame } from "./hooks/useGame";
import { useEffect, useRef, useState } from "react";
import type { ExitInfo, LogEntry } from "./lib/types";

type MainTab = "log" | "scene";

function pct(cur?: number, max?: number) {
  if (!cur || !max) return "0%";
  return `${Math.min(100, Math.round((cur / max) * 100))}%`;
}

function EventLog({ logs }: { logs: LogEntry[] }) {
  const panelRef = useRef<HTMLElement>(null);
  const [following, setFollowing] = useState(true);

  useEffect(() => {
    const panel = panelRef.current;
    if (panel && following) panel.scrollTop = panel.scrollHeight;
  }, [logs, following]);

  return (
    <section
      ref={panelRef}
      className="log log-panel"
      aria-label="见闻"
      onScroll={() => {
        const panel = panelRef.current;
        if (!panel) return;
        setFollowing(panel.scrollHeight - panel.scrollTop - panel.clientHeight < 24);
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
  );
}

export default function App() {
  const g = useGame();
  const { state, toast } = g;
  const v = state.vitals;
  const [mainTab, setMainTab] = useState<MainTab>("log");

  const afterEntityAction = (command: string) => {
    g.cmd(command);
    const verb = command.trim().split(/\s+/)[0]?.toLowerCase();
    // 拾起/丢下后留在场景，方便立刻看到物品列表刷新
    if (verb === "get" || verb === "drop") setMainTab("scene");
    else setMainTab("log");
  };

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
            <div className="hero-name">{state.playerName}</div>
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
          <button
            type="button"
            className="map-btn"
            aria-label="地图"
            onClick={() => g.openSheet("map")}
          >
            地<br />图
          </button>
        </header>

        <main className="main">
          <div className="game-tabs" role="tablist" aria-label="见闻与场景">
            <button
              type="button"
              role="tab"
              aria-selected={mainTab === "log"}
              className={mainTab === "log" ? "on" : ""}
              onClick={() => setMainTab("log")}
            >
              见闻
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={mainTab === "scene"}
              className={mainTab === "scene" ? "on" : ""}
              onClick={() => setMainTab("scene")}
            >
              场景
            </button>
          </div>

          <div className="game-body">
            {mainTab === "log" ? (
              <EventLog logs={state.logs} />
            ) : (
              <section className="scene-panel" aria-label="场景">
                <h1 className="room-title">{state.room.title || "…"}</h1>
                <p className="room-desc">{state.room.desc || "环顾四周以了解所处之地。"}</p>

                <section className="context">
                  <div className="ctx-block">
                    <h2>出口</h2>
                    <ExitPad
                      exits={state.room.exits}
                      onSelect={(ex: ExitInfo) => {
                        g.setSelectedExit({ dir: ex.dir, name: ex.name });
                        g.openSheet("exit");
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

                  {state.suggestedActions.length > 0 && (
                    <div className="ctx-block">
                      <h2>动作</h2>
                      <div className="chips">
                        {state.suggestedActions.map((a) => (
                          <button
                            key={a.command}
                            type="button"
                            className="chip action"
                            onClick={() => {
                              g.cmd(a.command);
                              setMainTab("log");
                            }}
                          >
                            {a.label}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </section>
              </section>
            )}
          </div>
        </main>
      </div>

      {state.sheet === "character" && (
        <CharacterSheet
          state={state}
          tab={g.charTab}
          onTab={g.setCharTab}
          onClose={g.closeSheet}
        />
      )}
      {state.sheet === "map" && (
        <MapSheet
          roomTitle={state.room.title}
          roomArea={state.room.area}
          onClose={g.closeSheet}
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
          onClose={g.closeSheet}
          onAction={afterEntityAction}
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
              <p style={{ color: "var(--paper-dim)", lineHeight: 1.75 }}>
                向{g.selectedExit.dir}可至「{g.selectedExit.name}」。
              </p>
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
