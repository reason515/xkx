import { parseBoardReadActions } from "../lib/parser";

interface Props {
  id: string;
  name: string;
  kind: "npc" | "item";
  docText?: string;
  docLoading?: boolean;
  onClose: () => void;
  /** Ordinary entity actions (look / get / …); sheet may close after. */
  onAction: (cmd: string) => void;
  /** Board list/read — keep sheet open and show captured text. */
  onDocAction?: (cmd: string) => void;
  onClearDoc?: () => void;
}

function isBulletinBoard(id: string, name: string): boolean {
  if (/board/i.test(id)) return true;
  return /告示牌|留言板|留言版/.test(name);
}

export function EntitySheet({
  id,
  name,
  kind,
  docText = "",
  docLoading = false,
  onClose,
  onAction,
  onDocAction,
  onClearDoc,
}: Props) {
  // Prefer english id for mud commands when available
  const target =
    id && /^[a-z][\w\s]*$/i.test(id) && id !== name ? id : name;

  const board = kind === "item" && isBulletinBoard(id, name);
  const reading = board && (!!docText || docLoading);
  const readActions = reading ? parseBoardReadActions(docText) : [];

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
  const actions = kind === "npc" ? npcActions : board ? boardActions : itemActions;

  return (
    <div className="overlay open" onClick={onClose}>
      <div className="sheet" onClick={(e) => e.stopPropagation()}>
        <div className="sheet-top">
          <h3>{reading ? "留言" : name}</h3>
          <button type="button" className="close" onClick={onClose}>
            ×
          </button>
        </div>
        <div className="sheet-scroll">
          {reading ? (
            <>
              <button
                type="button"
                className="doc-back"
                onClick={() => onClearDoc?.()}
              >
                ← 返回
              </button>
              {docLoading && !docText ? (
                <p className="doc-status">正在查阅…</p>
              ) : (
                <pre className="doc-body">{docText || "暂无内容。"}</pre>
              )}
              {docLoading && docText ? (
                <p className="doc-status">继续载入…</p>
              ) : null}
              {readActions.length > 0 && (
                <div className="doc-reads">
                  {readActions.map((a) => (
                    <button
                      key={a.command}
                      type="button"
                      className="help-topic"
                      onClick={() => onDocAction?.(a.command)}
                    >
                      {a.label}
                    </button>
                  ))}
                </div>
              )}
            </>
          ) : (
            <p
              style={{
                color: "var(--paper-dim)",
                fontSize: 13,
                marginBottom: 16,
              }}
            >
              {kind === "npc"
                ? "你要对此人做什么？"
                : board
                  ? "你要如何查看此牌？"
                  : "你要如何处置此物？"}
            </p>
          )}
        </div>
        {!reading && (
          <div className="sheet-acts">
            {actions.map(([label, command]) => (
              <button
                key={label}
                type="button"
                onClick={() => {
                  if (
                    board &&
                    onDocAction &&
                    (command === "list" || command.startsWith("read "))
                  ) {
                    onDocAction(command);
                    return;
                  }
                  onAction(command);
                  onClose();
                }}
              >
                {label}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
