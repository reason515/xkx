import { GraphicalMap } from "./GraphicalMap";
import { RoomGraph } from "./RoomGraph";
import { useMemo, useState } from "react";
import {
  getMapLabel,
  getMapText,
  highlightMapText,
  resolveRegionMapKey,
  worldHighlightMarkers,
} from "../data/maps";
import { AREA_MAPS } from "../data/roomMaps";
import type { Entity } from "../lib/types";

interface Props {
  roomTitle?: string;
  roomArea?: string;
  roomPath?: string;
  roomNpcs?: Entity[];
  roomItems?: Entity[];
  /** Exit destination names for duplicate-label disambiguation. */
  roomExits?: { dir?: string; name?: string; label?: string }[];
  onClose: () => void;
  /** Navigate via an exit from the quick-jump chips. */
  onNavigate?: (exit: { dir: string; name?: string; label?: string }) => void;
  /** Trigger localmaps command on the MUD server. */
  onLocalmaps?: () => void;
  /** Captured localmaps output text. */
  localmapsText?: string;
  localmapsLoading?: boolean;
}

export function MapSheet({
  roomTitle,
  roomArea,
  roomPath: _roomPath,
  roomNpcs: _roomNpcs = [],
  roomItems: _roomItems = [],
  roomExits = [],
  onClose,
  onLocalmaps,
  onNavigate,
  localmapsText = "",
  localmapsLoading = false,
}: Props) {
  const [mode, setMode] = useState<"region" | "world">("region");
  const [mapZoom, setMapZoom] = useState(1.25);

  const regionKey = useMemo(
    () => resolveRegionMapKey(roomArea, roomTitle),
    [roomArea, roomTitle]
  );
  const regionText = getMapText(regionKey);
  const regionLabel = getMapLabel(regionKey);

  // Structured room-graph map for known areas
  const roomGraph = useMemo(() => {
    const area = (roomArea || "").toLowerCase();
    const mapKey =
      area === "newbie_lxsz" || area === "liuxiu-shanzhuang"
        ? "newbie_lxsz"
        : null;
    if (!mapKey || !AREA_MAPS[mapKey]) return null;
    const nodes = AREA_MAPS[mapKey];
    const title = (roomTitle || "").replace(/[【】\[\]「」]/g, "").trim();
    // Find candidates whose name matches the room title
    const candidates = nodes.filter((n) =>
      title.includes(n.name) || n.name.includes(title)
    );
    let currentId = candidates[0]?.id;
    // Disambiguate: use exit destination names when multiple candidates share a base name
    if (candidates.length > 1) {
      const exitNames = new Set(roomExits.map((e) => (e.name || "").trim()).filter(Boolean));
      const byId = new Map(nodes.map((n) => [n.id, n]));
      let bestScore = 0;
      for (const c of candidates) {
        let score = 0;
        for (const tid of Object.values(c.exits)) {
          const tgt = byId.get(tid);
          if (tgt && exitNames.has(tgt.name)) score++;
        }
        if (score > bestScore) { bestScore = score; currentId = c.id; }
      }
    }
    return { nodes, currentId };
  }, [roomArea, roomTitle, roomExits]);

  const worldText = getMapText("all") || "";

  const worldHtml = useMemo(() => {
    if (!worldText) return "";
    return highlightMapText(
      worldText,
      worldHighlightMarkers(roomArea, roomTitle)
    );
  }, [worldText, roomArea, roomTitle]);

  const title =
    mode === "world"
      ? "世界地图"
      : regionKey
        ? `${regionLabel}${roomTitle ? ` · ${roomTitle}` : ""}`
        : "区域地图";

  return (
    <div className="overlay open" onClick={onClose}>
      <div className="sheet map-sheet" onClick={(e) => e.stopPropagation()}>
        <div className="sheet-top">
          <h3>{title}</h3>
          <button type="button" className="close" onClick={onClose}>
            ×
          </button>
        </div>
        <div className="tabs">
          <button
            type="button"
            className={mode === "region" ? "on" : ""}
            onClick={() => setMode("region")}
          >
            区域
          </button>
          <button
            type="button"
            className={mode === "world" ? "on" : ""}
            onClick={() => setMode("world")}
          >
            世界
          </button>
        </div>
        <div className="map-tools" aria-label="地图缩放">
          {roomTitle && (
            <span className="map-loc-chip" title="当前位置">{roomTitle}</span>
          )}
          <button
            type="button"
            aria-label="缩小地图"
            onClick={() => setMapZoom((zoom) => Math.max(0.8, zoom - 0.2))}
            disabled={mapZoom <= 0.8}
          >
            −
          </button>
          <span>{Math.round(mapZoom * 100)}%</span>
          <button
            type="button"
            aria-label="放大地图"
            onClick={() => setMapZoom((zoom) => Math.min(1.6, zoom + 0.2))}
            disabled={mapZoom >= 1.6}
          >
            ＋
          </button>
        </div>
        <div className="sheet-scroll">
          {mode === "region" ? (
            roomGraph ? (
              <RoomGraph
                nodes={roomGraph.nodes}
                currentRoomId={roomGraph.currentId}
              />
            ) : regionText ? (
              <>
                <p className="map-legend">◎ 当前位置已高亮　△ 出口方向　图源同 MUD「map」</p>
                <GraphicalMap
                  text={regionText}
                  roomTitle={roomTitle}
                  exitLabels={roomExits.map((e) => e.label || e.dir || "").filter(Boolean)}
                  scale={mapZoom}
                />
                {roomExits.length > 0 && (
                  <div className="map-exit-chips">
                    <span className="map-exit-label">快速前往</span>
                    <div className="chips">
                      {roomExits.filter((ex) => ex.dir).map((ex) => (
                        <button
                          key={ex.dir}
                          type="button"
                          className="chip exit"
                          onClick={() => onNavigate?.({ dir: ex.dir!, name: ex.name, label: ex.label })}
                        >
                          <span className="dir">{ex.label || ex.dir}</span>
                          {ex.name || ex.dir}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </>
            ) : localmapsText ? (
              <>
                <p className="map-legend">来自 MUD localmaps 命令</p>
                <pre className="map-ascii" style={{ fontSize: `${11 * mapZoom}px` }}>{localmapsText}</pre>
              </>
            ) : (
              <div className="map-empty">
                <p>
                  暂无此区域地图
                  {roomTitle ? `（${roomTitle}）` : ""}。可切换「世界」查看总图。
                </p>
                {onLocalmaps && (
                  <button
                    type="button"
                    className="help-topic"
                    style={{ marginTop: 12 }}
                    onClick={onLocalmaps}
                    disabled={localmapsLoading}
                  >
                    {localmapsLoading ? "正在查询…" : "查询 localmaps"}
                  </button>
                )}
              </div>
            )
          ) : (
            <>
              <p className="map-legend">侠客行第一阶段总图　当前区域地标已高亮
              <br /><span className="map-legend-sub">红色底块 = 当前区域 · 绿色标记 = 城市 · 青色 = 门派 · 黄色 = 山川地带</span></p>
              <pre
                className="map-ascii"
                style={{ fontSize: `${11 * mapZoom}px` }}
                dangerouslySetInnerHTML={{ __html: worldHtml }}
              />
            </>
          )}
        </div>
      </div>
    </div>
  );
}
