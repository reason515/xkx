interface Props {
  name: string;
  kind: "npc" | "item";
  onClose: () => void;
  onAction: (cmd: string) => void;
}

export function EntitySheet({ name, kind, onClose, onAction }: Props) {
  const npcActions = [
    ["看", `look ${name}`],
    ["问", `ask ${name}`],
    ["打", `kill ${name}`],
    ["拿", `get ${name}`],
  ];
  const itemActions = [
    ["看", `look ${name}`],
    ["拿", `get ${name}`],
    ["用", `use ${name}`],
    ["丢", `drop ${name}`],
  ];
  const actions = kind === "npc" ? npcActions : itemActions;

  return (
    <div className="overlay open" onClick={onClose}>
      <div className="sheet" onClick={(e) => e.stopPropagation()}>
        <div className="sheet-top">
          <h3>{name}</h3>
          <button type="button" className="close" onClick={onClose}>
            ×
          </button>
        </div>
        <div className="sheet-scroll">
          <p style={{ color: "var(--paper-dim)", fontSize: 13, marginBottom: 16 }}>
            {kind === "npc" ? "你要对此人做什么？" : "你要如何处置此物？"}
          </p>
        </div>
        <div className="sheet-acts">
          {actions.map(([label, command]) => (
            <button
              key={label}
              type="button"
              onClick={() => {
                onAction(command);
                onClose();
              }}
            >
              {label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
