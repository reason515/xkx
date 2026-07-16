import { useMemo, useState } from "react";
import {
  getMapLabel,
  getMapText,
  highlightMapText,
  resolveRegionMapKey,
  worldHighlightMarkers,
} from "../data/maps";

interface Props {
  roomTitle?: string;
  roomArea?: string;
  onClose: () => void;
}

export function MapSheet({ roomTitle, roomArea, onClose }: Props) {
  const [mode, setMode] = useState<"region" | "world">("region");

  const regionKey = useMemo(
    () => resolveRegionMapKey(roomArea, roomTitle),
    [roomArea, roomTitle]
  );
  const regionText = getMapText(regionKey);
  const regionLabel = getMapLabel(regionKey);

  const worldText = getMapText("all") || "";
  const regionHtml = useMemo(() => {
    if (!regionText) return "";
    return highlightMapText(regionText, [roomTitle]);
  }, [regionText, roomTitle]);

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
            ) : (
              <p className="map-empty">
                暂无此区域地图
                {roomTitle ? `（${roomTitle}）` : ""}。可切换「世界」查看总图。
              </p>
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
