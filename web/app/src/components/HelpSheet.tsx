import { useMemo } from "react";
import { parseHelpDocActions, reflowSoftWrappedText } from "../lib/parser";

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
  { id: "map_xiakedao", label: "侠客岛地图" },
  { id: "learn", label: "学习" },
  { id: "practice", label: "练习" },
  { id: "wenxuan", label: "文选" },
  { id: "about", label: "关于本游戏" },
];

interface Props {
  docText: string;
  docLoading: boolean;
  onClose: () => void;
  onPickTopic: (topicId: string) => void;
  onBackToTopics: () => void;
  /** 执行帮助正文中的可点动作（如 study wall）。 */
  onCmd?: (command: string) => void;
}

export function HelpSheet({
  docText,
  docLoading,
  onClose,
  onPickTopic,
  onBackToTopics,
  onCmd,
}: Props) {
  const reading = !!docText || docLoading;
  const actions = useMemo(
    () => (docText ? parseHelpDocActions(docText) : []),
    [docText]
  );

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
                <pre className="doc-body help-doc">
                  {docText ? reflowSoftWrappedText(docText) : "暂无内容。"}
                </pre>
              )}
              {actions.length > 0 && onCmd ? (
                <div className="help-doc-actions">
                  <p className="skill-hint">文中提到的做法，可点选尝试：</p>
                  <div className="chips">
                    {actions.map((a) => (
                      <button
                        key={a.command}
                        type="button"
                        className="chip action"
                        onClick={() => onCmd(a.command)}
                      >
                        {a.label}
                      </button>
                    ))}
                  </div>
                </div>
              ) : null}
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
