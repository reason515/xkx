import { useRef } from "react";
import { DIR_MAP, PAD_SLOTS } from "../lib/parser";
import type { ExitInfo } from "../lib/types";

interface Props {
  exits: ExitInfo[];
  exitNames?: Record<string, string>;
  roomTitle?: string;
  onSelect: (exit: ExitInfo) => void;
}

export function ExitPad({ exits, exitNames = {}, roomTitle = "", onSelect }: Props) {
  const lastClick = useRef(0);
  const byDir = Object.fromEntries(exits.map((e) => [e.dir, e]));
  const padDirs = new Set(
    PAD_SLOTS.flat().filter((d): d is string => typeof d === "string")
  );
  const extra = exits.filter((e) => !padDirs.has(e.dir));

  return (
    <div className="exit-row">
      <div className="exit-pad">
        {PAD_SLOTS.flat().map((dir, i) => {
          if (!dir) {
            return (
              <div key={i} className="cell here">
                <span className="d">此</span>
              </div>
            );
          }
          const ex = byDir[dir];
          // 无出口方位留空，避免像可点方向一样误导
          if (!ex) {
            return <div key={dir} className="cell empty" aria-hidden />;
          }
          const discoveredName = exitNames[`${roomTitle}|${dir}`];
          const displayName = ex.name || discoveredName || "";
          return (
            <button
              key={dir}
              type="button"
              className="cell open"
              onClick={() => {
                if (Date.now() - lastClick.current < 600) return;
                lastClick.current = Date.now();
                onSelect(ex);
              }}
            >
              <span className="d">{ex.label || DIR_MAP[dir] || dir}</span>
              {displayName}
            </button>
          );
        })}
      </div>
      {extra.length > 0 && (
        <div className="exit-extra">
          {extra.map((ex) => {
            const discoveredName = exitNames[`${roomTitle}|${ex.dir}`];
            const displayName = ex.name || discoveredName || "";
            return (
            <button
              key={ex.dir}
              type="button"
              className="cell open"
              onClick={() => {
                if (Date.now() - lastClick.current < 600) return;
                lastClick.current = Date.now();
                onSelect(ex);
              }}
            >
              <span className="d">{ex.label || DIR_MAP[ex.dir] || ex.dir}</span>
              {displayName}
            </button>
          )})}
        </div>
      )}
    </div>
  );
}
