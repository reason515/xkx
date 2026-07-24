import { useMemo, useState } from "react";
import {
  getMapLabel,
  getMapText,
  highlightMapText,
  mapMarkerOccurrence,
  resolveRegionMapKey,
  worldHighlightMarkers,
} from "../data/maps";
import type { Entity } from "../lib/types";

interface Props {
  roomTitle?: string;
  roomArea?: string;
  roomPath?: string;
  roomNpcs?: Entity[];
  roomItems?: Entity[];
  /** Exit destination names for duplicate-label disambiguation. */
  roomExits?: { name?: string }[];
  onClose: () => void;
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
  roomNpcs = [],
  roomItems = [],
  roomExits = [],
  onClose,
  onLocalmaps,
  localmapsText = "",
  localmapsLoading = false,
}: Props) {
  const [mode, setMode] = useState<"region" | "world">("region");

  const regionKey = useMemo(
    () => resolveRegionMapKey(roomArea, roomTitle),
    [roomArea, roomTitle]
  );
  const regionText = getMapText(regionKey);
  const regionLabel = getMapLabel(regionKey);

  const worldText = getMapText("all") || "";
  const regionHtml = useMemo(() => {
    if (!regionText || !roomTitle) return regionText ? highlightMapText(regionText, []) : "";
    const nth = mapMarkerOccurrence(regionKey, roomTitle, {
      roomPath,
      hasFisherman: roomNpcs.some(
        (n) => /yu fu|渔夫/i.test(n.id) || /渔夫/.test(n.name)
      ),
      hasCarriage: roomItems.some(
        (i) => /da che|carriage/i.test(i.id) || /大车/.test(i.name)
      ),
      exitNames: roomExits.map((e) => e.name || "").filter(Boolean),
    });
    return highlightMapText(regionText, [roomTitle], { [roomTitle]: nth });
  }, [
    regionText,
    regionKey,
    roomTitle,
    roomPath,
    roomNpcs,
    roomItems,
    roomExits,
  ]);

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
        <div className="sheet-scroll">
          {mode === "region" ? (
            regionText ? (
              <>
                <p className="map-legend">◎ 当前位置已高亮　图源同 MUD「map」</p>
                <pre
                  className="map-ascii"
                  dangerouslySetInnerHTML={{ __html: regionHtml }}
                />
              </>
            ) : localmapsText ? (
              <>
                <p className="map-legend">来自 MUD localmaps 命令</p>
                <pre className="map-ascii">{localmapsText}</pre>
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
              <p className="map-legend">侠客行第一阶段总图　当前区域地标已高亮</p>
              <pre
                className="map-ascii"
                dangerouslySetInnerHTML={{ __html: worldHtml }}
              />
            </>
          )}
        </div>
      </div>
    </div>
  );
}
