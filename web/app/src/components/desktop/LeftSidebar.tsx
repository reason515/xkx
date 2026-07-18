import { useState } from "react";
import { ExitPad } from "../ExitPad";
import { GuideTip } from "../GuideTip";
import { useDesktop } from "../../context/DesktopContext";
import type { ExitInfo } from "../../lib/types";

export function LeftSidebar() {
  const { game, sendCommand, doEmergencyStop, emergencyStopped } = useDesktop();
  const { state } = game;
  const [menu, setMenu] = useState<{
    x: number;
    y: number;
    id: string;
    kind: "npc" | "item";
    scenery?: boolean;
  } | null>(null);

  return (
    <aside className="desktop-left" data-testid="desktop-left">
      {game.guideTip && (
        <div className="desktop-left-block">
          <GuideTip
            text={game.guideTip.text}
            onDismiss={game.dismissGuideTip}
          />
        </div>
      )}
      <div className="desktop-left-block">
        <h2>出口</h2>
        <ExitPad
          exits={state.room.exits}
          onSelect={(ex: ExitInfo) => {
            // Desktop: go immediately (classic MUD); optional look first via right-click later
            game.confirmGo(ex.dir);
          }}
        />
      </div>

      {state.room.npcs.length > 0 && (
        <div className="desktop-left-block">
          <h2>人物</h2>
          <div className="chips">
            {state.room.npcs.map((n) => (
              <button
                key={n.id}
                type="button"
                className="chip npc"
                data-testid={`desktop-npc-${n.id}`}
                onClick={() => sendCommand(`look ${n.id}`)}
                onContextMenu={(e) => {
                  e.preventDefault();
                  setMenu({
                    x: e.clientX,
                    y: e.clientY,
                    id: n.id,
                    kind: "npc",
                  });
                }}
              >
                {n.name}
              </button>
            ))}
          </div>
        </div>
      )}

      {state.room.items.length > 0 && (
        <div className="desktop-left-block">
          <h2>物品</h2>
          <div className="chips">
            {state.room.items.map((it, idx) => (
              <button
                key={`${it.id}-${idx}`}
                type="button"
                className="chip item"
                data-testid={`desktop-item-${it.id}`}
                onClick={() => {
                  if (it.scenery) {
                    sendCommand(`look ${it.id}`);
                  } else {
                    sendCommand(`get ${it.id}`);
                    sendCommand("look", { silent: true });
                  }
                }}
                onContextMenu={(e) => {
                  e.preventDefault();
                  setMenu({
                    x: e.clientX,
                    y: e.clientY,
                    id: it.id,
                    kind: "item",
                    scenery: it.scenery,
                  });
                }}
              >
                {it.name}
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="desktop-left-block">
        <h2>快捷</h2>
        <div className="desktop-quick">
          <button type="button" onClick={() => sendCommand("look")}>
            环顾
          </button>
          <button type="button" onClick={() => sendCommand("save")}>
            存档
          </button>
          <button
            type="button"
            onClick={() => {
              game.refreshCharacter();
              game.openSheet("train");
            }}
          >
            修炼
          </button>
          <button type="button" onClick={() => game.openSheet("combat")}>
            战斗
          </button>
          <button type="button" onClick={() => game.onOpenCharacter()}>
            角色
          </button>
          <button type="button" onClick={() => game.openSheet("map")}>
            地图
          </button>
        </div>
      </div>

      <button
        type="button"
        className={`desktop-estop ${emergencyStopped ? "on" : ""}`}
        data-testid="desktop-estop"
        onClick={doEmergencyStop}
      >
        急停
      </button>

      {menu && (
        <div
          className="desktop-ctx-menu"
          style={{ left: menu.x, top: menu.y }}
          role="menu"
        >
          {menu.kind === "npc" ? (
            <>
              <button
                type="button"
                role="menuitem"
                onClick={() => {
                  sendCommand(`look ${menu.id}`);
                  setMenu(null);
                }}
              >
                查看
              </button>
              <button
                type="button"
                role="menuitem"
                onClick={() => {
                  sendCommand(`fight ${menu.id}`);
                  setMenu(null);
                }}
              >
                动手
              </button>
              <button
                type="button"
                role="menuitem"
                onClick={() => {
                  game.clearDoc();
                  game.setSelectedEntity(
                    state.room.npcs.find((npc) => npc.id === menu.id) || {
                      id: menu.id,
                      name: menu.id,
                      kind: "npc",
                    }
                  );
                  game.openSheet("entity");
                  setMenu(null);
                }}
              >
                更多
              </button>
            </>
          ) : (
            <>
              <button
                type="button"
                role="menuitem"
                onClick={() => {
                  sendCommand(`look ${menu.id}`);
                  setMenu(null);
                }}
              >
                查看
              </button>
              {!menu.scenery && (
                <button
                  type="button"
                  role="menuitem"
                  onClick={() => {
                    sendCommand(`get ${menu.id}`);
                    setMenu(null);
                  }}
                >
                  拾取
                </button>
              )}
            </>
          )}
          <button type="button" role="menuitem" onClick={() => setMenu(null)}>
            取消
          </button>
        </div>
      )}
    </aside>
  );
}
