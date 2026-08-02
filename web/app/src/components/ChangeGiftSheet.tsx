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
  css: string;
}[] = [
  { key: "str", label: "膂力", desc: "近身攻击威力与负重", css: "var(--attr-str)" },
  { key: "int", label: "悟性", desc: "领悟武功与学习速度", css: "var(--attr-int)" },
  { key: "con", label: "根骨", desc: "气血上限与体格", css: "var(--attr-con)" },
  { key: "dex", label: "身法", desc: "闪避与出手速度", css: "var(--attr-dex)" },
];

/**
 * 杏子林游鲲翼「重新设置属性」（changegift，一生一次）。
 * 前四项（膂力/悟性/根骨/身法）总和 80，单项 10–30；福缘/容貌保持当前。
 * 视觉与毕业属性选择（AttributeSheet）一致：属性色卡片 + 分配条。
 */
export function ChangeGiftSheet({ initial, onConfirm, onClose }: Props) {
  const [vals, setVals] = useState<Record<"str" | "int" | "con" | "dex", number>>({
    str: Math.max(MIN, Math.min(MAX, initial?.str ?? 20)),
    int: Math.max(MIN, Math.min(MAX, initial?.int ?? 20)),
    con: Math.max(MIN, Math.min(MAX, initial?.con ?? 20)),
    dex: Math.max(MIN, Math.min(MAX, initial?.dex ?? 20)),
  });

  const sum = vals.str + vals.int + vals.con + vals.dex;
  const remaining = BUDGET - sum;
  const valid = remaining === 0 && ATTRS.every((a) => vals[a.key] >= MIN && vals[a.key] <= MAX);

  const adj = (key: "str" | "int" | "con" | "dex", delta: number) => {
    setVals((prev) => {
      const next = prev[key] + delta;
      if (next < MIN || next > MAX) return prev;
      const nextSum =
        next +
        (key === "str" ? 0 : prev.str) +
        (key === "int" ? 0 : prev.int) +
        (key === "con" ? 0 : prev.con) +
        (key === "dex" ? 0 : prev.dex);
      if (delta > 0 && nextSum > BUDGET) return prev;
      return { ...prev, [key]: next };
    });
  };

  const hint = useMemo(() => {
    if (valid) return "刚好分满，可以确认。";
    return remaining > 0 ? `还差 ${remaining} 点` : `超出 ${-remaining} 点`;
  }, [valid, remaining]);

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
          <p className="attr-intro">
            柳秀山庄所学皆为引路之法。离开此地前，你可依心中所向，重定先天属性一次（福缘、容貌保持不变）。此后不可更改。
          </p>

          <div className="attr-remaining">
            <span>已分配：</span>
            <span className={valid ? "remain-ok" : "remain-pending"}>
              {sum} / {BUDGET}
            </span>
            <span className={valid ? "remain-ok" : "remain-pending"}>{hint}</span>
          </div>

          <div className="attr-cards">
            {ATTRS.map((a) => (
              <div key={a.key} className="attr-card" data-attr={a.key}>
                <div className="attr-card-top">
                  <span className="attr-label" style={{ color: a.css }}>
                    {a.label}
                  </span>
                  <span className="attr-numbers">
                    <span className="attr-init">{initial?.[a.key] ?? 20}</span>
                    <span className="attr-arrow"> → </span>
                    <span className="attr-final" style={{ color: a.css }}>
                      {vals[a.key]}
                    </span>
                  </span>
                </div>
                <p className="attr-desc">{a.desc}</p>
                <div className="attr-controls">
                  <button
                    type="button"
                    className="attr-btn"
                    disabled={vals[a.key] <= MIN}
                    onClick={() => adj(a.key, -1)}
                    aria-label={`降低${a.label}`}
                  >
                    －
                  </button>
                  <button
                    type="button"
                    className="attr-btn"
                    disabled={vals[a.key] >= MAX}
                    onClick={() => adj(a.key, 1)}
                    aria-label={`提高${a.label}`}
                  >
                    ＋
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
        <div className="sheet-acts">
          <button
            type="button"
            className="go"
            data-testid="changegift-confirm"
            disabled={!valid}
            onClick={() => onConfirm(vals.str, vals.int, vals.con, vals.dex)}
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
