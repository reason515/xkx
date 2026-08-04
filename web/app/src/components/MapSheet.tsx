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
import { AREA_MAPS, resolveRegionGraphMapKey } from "../data/roomMaps";
import type { RoomMap } from "../data/roomMaps";
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
  roomPath,
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
    const mapKey = resolveRegionGraphMapKey(roomArea);
    if (!mapKey || !AREA_MAPS[mapKey]) return null;
    const map = AREA_MAPS[mapKey] as RoomMap;

    // 1) 精确匹配：roomPath 对应 LPC 文件名（同名房间如 东大街×3 必须靠它区分）
    const pathKey = (roomPath || "").toLowerCase().replace(/\.c$/, "");
    if (pathKey) {
      const byPath = map.nodes.find(
        (n) =>
          n.path &&
          (n.path.toLowerCase() === pathKey ||
            pathKey.endsWith(`/${n.path.toLowerCase()}`))
      );
      if (byPath) return { map, currentId: byPath.id };
    }

    // 2) 标题模糊匹配 + 出口去重
    const title = (roomTitle || "").replace(/[【】\[\]「」]/g, "").trim();
    const candidates = map.nodes.filter(
      (n) => title.includes(n.name) || n.name.includes(title)
    );
    let currentId = candidates[0]?.id;
    if (candidates.length > 1) {
      const exitNames = new Set(roomExits.map((e) => (e.name || "").trim()).filter(Boolean));
      let bestScore = 0;
      for (const c of candidates) {
        let score = 0;
        const connIds = new Set(
          map.edges
            .filter(e => e.from === c.id || e.to === c.id)
            .map(e => e.from === c.id ? e.to : e.from)
        );
        for (const tid of connIds) {
          const tgt = map.nodes.find(n => n.id === tid);
          if (tgt && exitNames.has(tgt.name)) score++;
        }
        if (score > bestScore) { bestScore = score; currentId = c.id; }
      }
    }
    return { map, currentId };
  }, [roomArea, roomTitle, roomExits, roomPath]);

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
        {!roomGraph && (
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
        )}
        <div className="sheet-scroll">
          {mode === "region" ? (
            roomGraph ? (
              <RoomGraph
                map={roomGraph.map}
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
