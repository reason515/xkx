interface Props {
  id: string;
  name: string;
  kind: "npc" | "item";
  onClose: () => void;
  onAction: (cmd: string) => void;
}

function isBulletinBoard(id: string, name: string): boolean {
  if (/board/i.test(id)) return true;
  return /告示牌|留言板|留言版/.test(name);
}

export function EntitySheet({ id, name, kind, onClose, onAction }: Props) {
  // Prefer english id for mud commands when available
  const target =
    id && /^[a-z][\w\s]*$/i.test(id) && id !== name ? id : name;

  const npcActions: [string, string][] = [
    ["看", `look ${target}`],
    ["跟随", `follow ${target}`],
    ["问", `ask ${target}`],
    ["打", `kill ${target}`],
  ];
  const boardActions: [string, string][] = [
    ["看", `look ${target}`],
    ["浏览留言", "list"],
    ["读新留言", "read new"],
  ];
  const itemActions: [string, string][] = [
    ["看", `look ${target}`],
    ["拿", `get ${target}`],
    ["用", `use ${target}`],
    ["丢", `drop ${target}`],
  ];
  const actions =
    kind === "npc"
      ? npcActions
      : isBulletinBoard(id, name)
        ? boardActions
        : itemActions;

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
            {kind === "npc"
              ? "你要对此人做什么？"
              : isBulletinBoard(id, name)
                ? "你要如何查看此牌？"
                : "你要如何处置此物？"}
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
