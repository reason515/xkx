import { DIR_MAP, PAD_SLOTS } from "../lib/parser";
import type { ExitInfo } from "../lib/types";

interface Props {
  exits: ExitInfo[];
  onSelect: (exit: ExitInfo) => void;
}

export function ExitPad({ exits, onSelect }: Props) {
  const byDir = Object.fromEntries(exits.map((e) => [e.dir, e]));
  const padDirs = new Set(
    PAD_SLOTS.flat().filter((d): d is string => typeof d === "string")
  );
  const extra = exits.filter((e) => !padDirs.has(e.dir));

  return (
    <>
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
          return (
            <button
              key={dir}
              type="button"
              className="cell open"
              onClick={() => onSelect(ex)}
            >
              <span className="d">{ex.label || DIR_MAP[dir] || dir}</span>
              {ex.name}
            </button>
          );
        })}
      </div>
      {extra.length > 0 && (
        <div className="exit-extra">
          {extra.map((ex) => (
            <button
              key={ex.dir}
              type="button"
              className="chip exit"
              onClick={() => onSelect(ex)}
            >
              <span className="dir">{ex.label}</span>
              {ex.name}
            </button>
          ))}
        </div>
      )}
    </>
  );
}
