import { useRef, type CSSProperties, type MutableRefObject } from "react";
import {
  DesktopProvider,
  useDesktop,
  type GameApi,
} from "../../context/DesktopContext";
import type { UiMode } from "../../lib/uiMode";
import { CharacterSheet } from "../CharacterSheet";
import { CombatSheet } from "../CombatSheet";
import { GrindBanner } from "../GrindBanner";
import { EntitySheet } from "../EntitySheet";
import { HelpSheet } from "../HelpSheet";
import { MapSheet } from "../MapSheet";
import { SpeechSheet } from "../SpeechSheet";
import { TrainSheet } from "../TrainSheet";
import { LeftSidebar } from "./LeftSidebar";
import { ModeSwitch } from "./ModeSwitch";
import { RightSidebar } from "./RightSidebar";
import { TerminalPane } from "./TerminalPane";

function ResizeHandle({ onDrag }: { onDrag: (clientX: number) => void }) {
  return (
    <div
      className="desktop-resize"
      role="separator"
      aria-orientation="vertical"
      onPointerDown={(e) => {
        e.preventDefault();
        const move = (ev: PointerEvent) => onDrag(ev.clientX);
        const up = () => {
          window.removeEventListener("pointermove", move);
          window.removeEventListener("pointerup", up);
        };
        window.addEventListener("pointermove", move);
        window.addEventListener("pointerup", up);
      }}
    />
  );
}

function DesktopShell({
  mode,
  onModeChange,
}: {
  mode: UiMode;
  onModeChange: (m: UiMode) => void;
}) {
  const desk = useDesktop();
  const g = desk.game;
  const state = g.state;
  const shellRef = useRef<HTMLDivElement>(null);

  return (
    <div className="desktop-app" data-testid="desktop-app" ref={shellRef}>
      <div className={`toast ${g.toast ? "show" : ""}`}>{g.toast}</div>
      <header className="desktop-topbar">
        <div className="desktop-brand">
          <span className="desktop-title">侠客行</span>
          <span className="desktop-room" data-testid="desktop-room-title">
            {state.room.title || "…"}
          </span>
        </div>
        <div className="desktop-top-actions">
          <ModeSwitch mode={mode} onChange={onModeChange} />
          <button type="button" onClick={() => g.openSheet("speech")}>
            发言
          </button>
          <button type="button" onClick={() => g.onOpenHelp()}>
            帮助
          </button>
          <button type="button" onClick={() => g.quit()}>
            退出
          </button>
        </div>
      </header>
      <GrindBanner
        active={state.assistActive}
        status={state.assistStatus}
        onStop={g.stopAssist}
      />

      <div
        className="desktop-body"
        style={
          {
            "--desktop-left": `${desk.leftWidth}px`,
            "--desktop-right": `${desk.rightWidth}px`,
          } as CSSProperties
        }
      >
        <div
          className="desktop-col-left"
          style={{ width: desk.leftWidth }}
        >
          <LeftSidebar />
        </div>
        <ResizeHandle
          onDrag={(x) => {
            const rect = shellRef.current?.getBoundingClientRect();
            if (!rect) return;
            desk.setLeftWidth(x - rect.left);
          }}
        />
        <TerminalPane />
        <ResizeHandle
          onDrag={(x) => {
            const rect = shellRef.current?.getBoundingClientRect();
            if (!rect) return;
            desk.setRightWidth(rect.right - x);
          }}
        />
        <div
          className="desktop-col-right"
          style={{ width: desk.rightWidth }}
        >
          <RightSidebar />
        </div>
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
          roomPath={state.room.path}
          roomNpcs={state.room.npcs}
          roomItems={state.room.items}
          roomExits={state.room.exits}
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
          showGrind={(state.room.area || "").toLowerCase() === "xiakedao"}
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
          inventory={state.inventory}
          docText={state.docTarget === "entity" ? state.docText : ""}
          docLoading={state.docTarget === "entity" && state.docLoading}
          askHints={state.suggestedActions}
          recentLog={state.logs
            .slice(-40)
            .map((l) => l.text)
            .join("\n")}
          onClose={g.closeSheet}
          onAction={(command) => {
            g.cmd(command);
            const verb = command.trim().split(/\s+/)[0]?.toLowerCase();
            if (verb === "get" || verb === "drop") {
              g.cmd("look", { silent: true });
            }
          }}
          onDocAction={(command) => g.docCmd(command, "entity")}
          onAskList={(command) => g.docCmd(command, "entity")}
          onLearnList={(command) => g.docCmd(command, "entity")}
          onStartLearn={g.startAssist}
          onClearDoc={g.clearDoc}
        />
      )}
    </div>
  );
}

export function DesktopApp({
  game,
  rawSinkRef,
  mode,
  onModeChange,
}: {
  game: GameApi;
  rawSinkRef: MutableRefObject<((raw: string) => void) | null>;
  mode: UiMode;
  onModeChange: (m: UiMode) => void;
}) {
  return (
    <DesktopProvider game={game} rawSinkRef={rawSinkRef}>
      <DesktopShell mode={mode} onModeChange={onModeChange} />
    </DesktopProvider>
  );
}
