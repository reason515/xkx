import { ExitPad } from "./components/ExitPad";
import { LoginPage } from "./components/LoginPage";
import { CharacterSheet } from "./components/CharacterSheet";
import { MapSheet } from "./components/MapSheet";
import { TrainSheet } from "./components/TrainSheet";
import { CombatSheet } from "./components/CombatSheet";
import { EntitySheet } from "./components/EntitySheet";
import { GUIDE_STEPS } from "./data/maps";
import { useGame } from "./hooks/useGame";
import type { ExitInfo } from "./lib/types";

function pct(cur?: number, max?: number) {
  if (!cur || !max) return "0%";
  return `${Math.min(100, Math.round((cur / max) * 100))}%`;
}

export default function App() {
  const g = useGame();
  const { state, toast } = g;
  const v = state.vitals;

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
          <button type="button" className="map-btn" onClick={() => g.openSheet("map")}>
            地<br />图
          </button>
        </header>

        <main className="main">
          {state.guideStep < GUIDE_STEPS.length && (
            <div className="guide-banner">
              新手引导 {state.guideStep + 1}/{GUIDE_STEPS.length}：{GUIDE_STEPS[state.guideStep]}
              <button
                type="button"
                style={{
                  marginLeft: 8,
                  border: "none",
                  background: "transparent",
                  color: "var(--paper)",
                  cursor: "pointer",
                  fontSize: 12,
                }}
                onClick={g.advanceGuide}
              >
                下一步
              </button>
            </div>
          )}

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
                        g.setSelectedEntity({ name: n.name, kind: "npc" });
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
                  {state.room.items.map((it) => (
                    <button
                      key={it.id}
                      type="button"
                      className="chip item"
                      onClick={() => {
                        g.setSelectedEntity({ name: it.name, kind: "item" });
                        g.openSheet("entity");
                      }}
                    >
                      {it.name}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </section>

          <div className="log">
            <h2>见闻</h2>
            {state.logs.slice(-20).map((l) => (
              <p key={l.id} className={l.kind === "combat" ? "hl" : ""}>
                {l.text}
              </p>
            ))}
          </div>
        </main>

        <footer className="dock">
          <button
            type="button"
            onClick={() => {
              g.cmd("look");
              g.advanceGuide();
            }}
          >
            环顾
          </button>
          <button
            type="button"
            className={state.assistActive ? "busy" : ""}
            onClick={() => g.openSheet("train")}
          >
            修炼
          </button>
          <button type="button" className="fight" onClick={() => g.openSheet("combat")}>
            动手
          </button>
        </footer>
      </div>

      {state.sheet === "character" && (
        <CharacterSheet
          state={state}
          tab={g.charTab}
          onTab={g.setCharTab}
          onClose={g.closeSheet}
        />
      )}
      {state.sheet === "map" && <MapSheet onClose={g.closeSheet} />}
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
          name={g.selectedEntity.name}
          kind={g.selectedEntity.kind}
          onClose={g.closeSheet}
          onAction={g.cmd}
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
