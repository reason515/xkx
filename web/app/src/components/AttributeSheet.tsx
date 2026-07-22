import { useCallback, useMemo, useState } from "react";

interface Props {
  budget: number;
  min: number;
  max: number;
  initial: { str: number; int: number; con: number; dex: number };
  onConfirm: (
    str: number,
    int: number,
    con: number,
    dex: number
  ) => void;
}

interface AttrDef {
  key: "str" | "int" | "con" | "dex";
  label: string;
  desc: string;
  style: string;
  presets: string[];
}

const ATTRS: AttrDef[] = [
  {
    key: "str",
    label: "膂力",
    desc: "影响近身攻击的威力与负重能力，适合偏好正面交锋、使用重兵器的侠士。",
    style: "attr-str",
    presets: [],
  },
  {
    key: "int",
    label: "悟性",
    desc: "影响学习、领悟与研读武学的效率，适合希望更快掌握复杂武功的侠士。",
    style: "attr-int",
    presets: [],
  },
  {
    key: "con",
    label: "根骨",
    desc: "影响体魄、恢复与内功成长基础，适合重视生存、续航和持久作战的侠士。",
    style: "attr-con",
    presets: [],
  },
  {
    key: "dex",
    label: "身法",
    desc: "影响闪避与行动中的灵活性，适合轻功、剑法与规避伤害的侠士。",
    style: "attr-dex",
    presets: [],
  },
];

const PRESETS: { label: string; vals: { str: number; int: number; con: number; dex: number } }[] = [
  { label: "均衡", vals: { str: 20, int: 20, con: 20, dex: 20 } },
  { label: "剑客", vals: { str: 18, int: 20, con: 18, dex: 24 } },
  { label: "苦修", vals: { str: 18, int: 18, con: 26, dex: 18 } },
  { label: "求道", vals: { str: 16, int: 28, con: 18, dex: 18 } },
];

function attrColor(style: string): string {
  switch (style) {
    case "attr-str": return "#e8846b";
    case "attr-int": return "#6ba8e8";
    case "attr-con": return "#6be8a0";
    case "attr-dex": return "#e8d06b";
    default: return "#ccc";
  }
}

export function AttributeSheet({
  budget,
  min,
  max: maxVal,
  initial,
  onConfirm,
}: Props) {
  const [vals, setVals] = useState({ ...initial });
  const [showConfirm, setShowConfirm] = useState(false);

  const remaining = useMemo(
    () => budget - (vals.str + vals.int + vals.con + vals.dex),
    [budget, vals]
  );
  const valid = remaining === 0;

  const adj = useCallback(
    (key: "str" | "int" | "con" | "dex", delta: number) => {
      setVals((prev) => {
        const cur = prev[key];
        const next = cur + delta;
        if (next < min || next > maxVal) return prev;
        const nextSum =
          next +
          (key === "str" ? 0 : prev.str) +
          (key === "int" ? 0 : prev.int) +
          (key === "con" ? 0 : prev.con) +
          (key === "dex" ? 0 : prev.dex);
        // 减操作直接允许（剩余增加）；加操作须有剩余点数
        if (delta > 0 && nextSum > budget) return prev;
        return { ...prev, [key]: next };
      });
    },
    [budget, min, maxVal]
  );

  const applyPreset = useCallback(
    (preset: { str: number; int: number; con: number; dex: number }) => {
      setVals(preset);
    },
    []
  );

  const handleConfirm = useCallback(() => {
    setShowConfirm(true);
  }, []);

  const handleFinalConfirm = useCallback(() => {
    onConfirm(vals.str, vals.int, vals.con, vals.dex);
  }, [vals, onConfirm]);

  if (showConfirm) {
    return (
      <div className="overlay open" onClick={() => setShowConfirm(false)}>
        <div className="sheet" onClick={(e) => e.stopPropagation()}>
          <div className="sheet-top">
            <h3>确认天赋</h3>
            <button
              type="button"
              className="close"
              onClick={() => setShowConfirm(false)}
            >
              ×
            </button>
          </div>
          <div className="sheet-scroll">
            <p className="confirm-text">
              以下天赋一旦确认便不可更改。踏入江湖后，须凭此根骨闯荡。
            </p>
            <div className="attr-summary">
              {ATTRS.map((a) => (
                <span key={a.key} className="attr-summary-item">
                  <span
                    className="attr-label"
                    style={{ color: attrColor(a.style) }}
                  >
                    {a.label}
                  </span>
                  <span className="attr-value">
                    {vals[a.key]}
                  </span>
                </span>
              ))}
              <span className="attr-summary-total">
                合计 {budget}
              </span>
            </div>
            <div className="confirm-actions">
              <button
                type="button"
                className="chip"
                onClick={() => setShowConfirm(false)}
              >
                重新分配
              </button>
              <button
                type="button"
                className="chip action"
                onClick={handleFinalConfirm}
              >
                确认，踏入江湖
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="overlay open">
      <div className="sheet">
        <div className="sheet-top">
          <h3>踏入江湖前，定下你的根骨</h3>
        </div>
        <div className="sheet-scroll">
          <p className="attr-intro">
            柳秀山庄所学皆为引路之法。离开此地前，你可依心中所向，重定天赋一次。此后不可更改。
          </p>

          <div className="attr-remaining">
            <span>可分配点数：</span>
            <span className={remaining === 0 ? "remain-ok" : "remain-pending"}>
              {remaining} / {budget}
            </span>
          </div>

          <div className="attr-cards">
            {ATTRS.map((a) => (
              <div key={a.key} className="attr-card" data-attr={a.key}>
                <div className="attr-card-top">
                  <span
                    className="attr-label"
                    style={{ color: attrColor(a.style) }}
                  >
                    {a.label}
                  </span>
                  <span className="attr-numbers">
                    <span className="attr-init">{initial[a.key]}</span>
                    <span className="attr-arrow"> → </span>
                    <span
                      className="attr-final"
                      style={{ color: attrColor(a.style) }}
                    >
                      {vals[a.key]}
                    </span>
                  </span>
                </div>
                <div className="attr-controls">
                  <button
                    type="button"
                    className="attr-btn"
                    disabled={(vals)[a.key] <= min}
                    onClick={() => adj(a.key, -1)}
                  >
                    －
                  </button>
                  <button
                    type="button"
                    className="attr-btn"
                    disabled={
                      (vals)[a.key] >= maxVal ||
                      remaining <= 0
                    }
                    onClick={() => adj(a.key, +1)}
                  >
                    +
                  </button>
                </div>
                <p className="attr-desc">{a.desc}</p>
              </div>
            ))}
          </div>

          <div className="attr-presets">
            <p className="preset-label">快捷预设：</p>
            <div className="chips">
              {PRESETS.map((p) => (
                <button
                  key={p.label}
                  type="button"
                  className={
                    "chip" +
                    (p.vals.str === vals.str &&
                    p.vals.int === vals.int &&
                    p.vals.con === vals.con &&
                    p.vals.dex === vals.dex
                      ? " active"
                      : "")
                  }
                  onClick={() => applyPreset(p.vals)}
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>

          <div className="attr-confirm-row">
            <button
              type="button"
              className="chip action"
              disabled={!valid}
              onClick={handleConfirm}
            >
              {valid ? "确认天赋" : `还差 ${remaining} 点`}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
