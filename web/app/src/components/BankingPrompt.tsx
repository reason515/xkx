import { useCallback, useState } from "react";

interface Props {
  /** "cun" or "qu" */
  command: "cun" | "qu";
  onConfirm: (fullCommand: string) => void;
  onClose: () => void;
}

const CURRENCIES = [
  { id: "silver", label: "白银" },
  { id: "gold", label: "黄金" },
  { id: "coin", label: "铜钱" },
] as const;

export function BankingPrompt({ command, onConfirm, onClose }: Props) {
  const [amount, setAmount] = useState(100);
  const [currency, setCurrency] = useState<string>("silver");
  const isDeposit = command === "cun";

  const handleConfirm = useCallback(() => {
    onConfirm(`${command} ${amount} ${currency}`);
  }, [command, amount, currency, onConfirm]);

  return (
    <div className="overlay open" onClick={onClose}>
      <div className="sheet" onClick={(e) => e.stopPropagation()}>
        <div className="sheet-top">
          <h3>{isDeposit ? "存款" : "取款"}</h3>
          <button type="button" className="close" onClick={onClose}>
            ×
          </button>
        </div>
        <div className="sheet-scroll">
          <p className="entity-mode-hint">
            {isDeposit ? "存款" : "取款"}金额与货币：
          </p>
          <div className="learn-assist-form">
            <label className="learn-count-field">
              <span>金额</span>
              <input
                type="number"
                min={1}
                max={9999}
                value={amount}
                onChange={(e) =>
                  setAmount(
                    Math.min(9999, Math.max(1, Number(e.target.value) || 1))
                  )
                }
              />
            </label>
            <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
              {CURRENCIES.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  className={`skill-act chip ${currency === c.id ? "on" : ""}`}
                  onClick={() => setCurrency(c.id)}
                >
                  {c.label}
                </button>
              ))}
            </div>
            <button
              type="button"
              className="learn-start"
              style={{ marginTop: 12 }}
              onClick={handleConfirm}
            >
              {isDeposit ? "确认存款" : "确认取款"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
