export interface HelpTopic {
  /** MUD help topic id; empty = bare `help`（主题目录）. */
  id: string;
  label: string;
}

export const HELP_TOPICS: HelpTopic[] = [
  { id: "", label: "主题目录" },
  { id: "newbie", label: "新手指南" },
  { id: "rules", label: "游戏规则" },
  { id: "board", label: "留言板" },
  { id: "commands", label: "常用指令" },
  { id: "channels", label: "频道说明" },
  { id: "settings", label: "个人设定" },
  { id: "xiakedao", label: "侠客岛" },
  { id: "about", label: "关于本游戏" },
];

interface Props {
  docText: string;
  docLoading: boolean;
  onClose: () => void;
  onPickTopic: (topicId: string) => void;
  onBackToTopics: () => void;
}

export function HelpSheet({
  docText,
  docLoading,
  onClose,
  onPickTopic,
  onBackToTopics,
}: Props) {
  const reading = !!docText || docLoading;

  return (
    <div className="overlay open" onClick={onClose}>
      <div className="sheet" onClick={(e) => e.stopPropagation()}>
        <div className="sheet-top">
          <h3>{reading ? "说明" : "帮助"}</h3>
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
                onClick={onBackToTopics}
              >
                ← 返回主题
              </button>
              {docLoading && !docText ? (
                <p className="doc-status">正在查阅…</p>
              ) : (
                <pre className="doc-body">{docText || "暂无内容。"}</pre>
              )}
              {docLoading && docText ? (
                <p className="doc-status">继续载入…</p>
              ) : null}
            </>
          ) : (
            <div className="help-topics">
              {HELP_TOPICS.map((t) => (
                <button
                  key={t.id || "topics"}
                  type="button"
                  className="help-topic"
                  onClick={() => onPickTopic(t.id)}
                >
                  {t.label}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
