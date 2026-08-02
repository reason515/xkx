import { useMemo, useState } from "react";

interface Props {
  /** 当前先天属性（str/int/con/dex），默认 20。 */
  initial?: Partial<Record<"str" | "int" | "con" | "dex", number>>;
  onConfirm: (str: number, int: number, con: number, dex: number) => void;
  onClose: () => void;
}

const BUDGET = 80;
const MIN = 10;
const MAX = 30;

const ATTRS: {
  key: "str" | "int" | "con" | "dex";
  label: string;
  desc: string;
}[] = [
  { key: "str", label: "膂力", desc: "近身攻击威力与负重" },
  { key: "int", label: "悟性", desc: "领悟武功与学习速度" },
  { key: "con", label: "根骨", desc: "气血上限与体格" },
  { key: "dex", label: "身法", desc: "闪避与出手速度" },
];

/**
 * 杏子林游鲲翼「重新设置属性」（changegift，一生一次）。
 * 前四项（膂力/悟性/根骨/身法）总和 80，单项 10–30；福缘/容貌保持当前。
 */
export function ChangeGiftSheet({ initial, onConfirm, onClose }: Props) {
  const [values, setValues] = useState<Record<"str" | "int" | "con" | "dex", number>>({
    str: Math.max(MIN, Math.min(MAX, initial?.str ?? 20)),
    int: Math.max(MIN, Math.min(MAX, initial?.int ?? 20)),
    con: Math.max(MIN, Math.min(MAX, initial?.con ?? 20)),
    dex: Math.max(MIN, Math.min(MAX, initial?.dex ?? 20)),
  });

  const sum = values.str + values.int + values.con + values.dex;
  const valid = sum === BUDGET && ATTRS.every((a) => values[a.key] >= MIN && values[a.key] <= MAX);
  const remaining = BUDGET - sum;

  const setAttr = (key: "str" | "int" | "con" | "dex", delta: number) => {
    setValues((v) => {
      const next = Math.max(MIN, Math.min(MAX, v[key] + delta));
      return { ...v, [key]: next };
    });
  };

  const hint = useMemo(() => {
    if (sum === BUDGET) return "属性总和刚好 80，可以确认。";
    return remaining > 0 ? `还需分配 ${remaining} 点` : `超出 ${-remaining} 点`;
  }, [sum, remaining]);

  return (
    <div className="overlay open" onClick={onClose}>
      <div className="sheet" onClick={(e) => e.stopPropagation()}>
        <div className="sheet-top">
          <h3>重新设置属性</h3>
          <button type="button" className="close" onClick={onClose}>
            ×
          </button>
        </div>
        <div className="sheet-scroll">
          <p className="skill-hint">
            柳秀山庄所学皆为引路之法。离开此地前，你可依心中所向，重定先天属性一次（福缘、容貌保持不变）。此后不可更改。
          </p>
          <div className="changegift-attrs">
            {ATTRS.map((a) => (
              <div key={a.key} className="changegift-attr">
                <div className="changegift-attr-head">
                  <span className="changegift-attr-label">{a.label}</span>
                  <span className="changegift-attr-value">{values[a.key]}</span>
                  <span className="changegift-attr-desc">{a.desc}</span>
                </div>
                <div className="changegift-attr-controls">
                  <button
                    type="button"
                    className="skill-act chip"
                    disabled={values[a.key] <= MIN}
                    onClick={() => setAttr(a.key, -1)}
                    aria-label={`降低${a.label}`}
                  >
                    −
                  </button>
                  <button
                    type="button"
                    className="skill-act chip"
                    disabled={values[a.key] >= MAX}
                    onClick={() => setAttr(a.key, 1)}
                    aria-label={`提高${a.label}`}
                  >
                    ＋
                  </button>
                </div>
              </div>
            ))}
          </div>
          <p className={`changegift-sum${valid ? " ok" : ""}`}>
            总和 {sum}/80 · {hint}
          </p>
        </div>
        <div className="sheet-acts">
          <button
            type="button"
            className="go"
            data-testid="changegift-confirm"
            disabled={!valid}
            onClick={() =>
              onConfirm(values.str, values.int, values.con, values.dex)
            }
          >
            确认重设
          </button>
          <button type="button" onClick={onClose}>
            取消
          </button>
        </div>
      </div>
    </div>
  );
}
