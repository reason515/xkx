import { PAD_SLOTS } from "../lib/parser";
import type { ExitInfo } from "../lib/types";
import { DIR_MAP } from "../lib/parser";

interface Props {
  exits: ExitInfo[];
  onSelect: (exit: ExitInfo) => void;
}

export function ExitPad({ exits, onSelect }: Props) {
  const byDir = Object.fromEntries(exits.map((e) => [e.dir, e]));
  const extra = exits.filter((e) =>
    ["up", "down", "enter", "out"].includes(e.dir)
  );

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
          if (!ex) {
            return (
              <div key={dir} className="cell">
                <span className="d">{DIR_MAP[dir] || dir}</span>
              </div>
            );
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
