import { useCallback, useMemo, useState } from "react";
import type { HelpArticle, HelpCategory, HelpStage } from "../data/help/helpTypes";
import {
  HELP_INDEX,
  getHelpByStage,
  getHelpByCategory,
  searchHelp,
} from "../data/help/helpArticles";

const CATEGORIES: { id: HelpCategory; label: string }[] = [
  { id: "newbie_village", label: "新手村" },
  { id: "attribute", label: "人物与属性" },
  { id: "basic", label: "基础玩法" },
  { id: "yangzhou", label: "扬州入门" },
  { id: "combat", label: "战斗" },
  { id: "skill", label: "武功" },
  { id: "economy", label: "经济" },
  { id: "rule", label: "规则" },
  { id: "map", label: "地图" },
  { id: "advanced", label: "高级" },
];

interface Props {
  /** 当前玩家阶段，用于推荐 */
  currentStage?: HelpStage;
  /** 回到主题列表 */
  onBackToTopics: () => void;
  /** 关闭面板 */
  onClose: () => void;
  /** 执行帮助中的可点动作 */
  onCmd?: (command: string) => void;
  /** 当前文章 ID（从外部打开指定帮助） */
  initialArticleId?: string;
}

type View = "home" | "category" | "article";

export function HelpSheet({
  currentStage,
  onBackToTopics,
  onClose,
  onCmd,
  initialArticleId,
}: Props) {
  const [view, setView] = useState<View>(
    initialArticleId ? "article" : "home"
  );
  const [articleId, setArticleId] = useState(initialArticleId || "");
  const [category, setCategory] = useState("");
  const [query, setQuery] = useState("");
  const [searchResults, setSearchResults] = useState<HelpArticle[]>([]);

  const article = useMemo(
    () => (articleId ? HELP_INDEX[articleId] : undefined),
    [articleId]
  );
  const relatedArticles = useMemo(
    () =>
      article?.related?.map((id) => HELP_INDEX[id]).filter(Boolean) || [],
    [article]
  );
  const stageArticles = useMemo(
    () => (currentStage ? getHelpByStage(currentStage) : []),
    [currentStage]
  );

  const openArticle = useCallback((id: string) => {
    setArticleId(id);
    setView("article");
    setQuery("");
  }, []);

  const openCategory = useCallback((cat: string) => {
    setCategory(cat);
    setView("category");
    setQuery("");
  }, []);

  const handleSearch = useCallback(
    (q: string) => {
      setQuery(q);
      if (q.trim().length < 2) {
        setSearchResults([]);
        return;
      }
      setSearchResults(searchHelp(q));
      setView("home");
    },
    []
  );

  const goHome = useCallback(() => {
    setView("home");
    setArticleId("");
    setCategory("");
    setQuery("");
    onBackToTopics();
  }, [onBackToTopics]);

  return (
    <div className="overlay open" onClick={onClose}>
      <div className="sheet" onClick={(e) => e.stopPropagation()}>
        <div className="sheet-top">
          <h3>
            {view === "article"
              ? article?.title || "帮助"
              : view === "category"
                ? CATEGORIES.find((c) => c.id === category)?.label || "分类"
                : "帮助"}
          </h3>
          <button type="button" className="close" onClick={onClose}>
            ×
          </button>
        </div>
        <div className="sheet-scroll">
          {/* 搜索栏 */}
          {view !== "article" && (
            <div className="help-search">
              <input
                type="text"
                className="help-search-input"
                placeholder="搜索帮助…例如「怎么拜师」「打不过怎么办」"
                value={query}
                onChange={(e) => handleSearch(e.target.value)}
                autoFocus={view === "home"}
              />
            </div>
          )}

          {/* 文章正文 */}
          {view === "article" && article ? (
            <div className="help-article-view">
              <button
                type="button"
                className="doc-back"
                onClick={() => {
                  if (category) openCategory(category);
                  else goHome();
                }}
              >
                ← 返回
              </button>
              <h4 className="help-article-title">{article.title}</h4>
              <p className="help-article-summary">{article.summary}</p>
              <div
                className="help-article-body"
                dangerouslySetInnerHTML={{ __html: article.body }}
              />

              {article.actions && article.actions.length > 0 && onCmd && (
                <div className="help-article-actions">
                  <p className="skill-hint">文中提到的操作：</p>
                  <div className="chips">
                    {article.actions.map((a) => (
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
              )}

              {relatedArticles.length > 0 && (
                <div className="help-related">
                  <p className="skill-hint">相关帮助：</p>
                  <div className="chips">
                    {relatedArticles.map((r) => (
                      <button
                        key={r.id}
                        type="button"
                        className="chip"
                        onClick={() => openArticle(r.id)}
                      >
                        {r.title}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : null}

          {/* 分类浏览 */}
          {view === "category" && category && !query && (
            <div className="help-category-view">
              <button
                type="button"
                className="doc-back"
                onClick={goHome}
              >
                ← 全部主题
              </button>
              <div className="help-article-list">
                {getHelpByCategory(category).map((a) => (
                  <button
                    key={a.id}
                    type="button"
                    className="help-topic"
                    onClick={() => openArticle(a.id)}
                  >
                    <span className="help-topic-title">{a.title}</span>
                    <span className="help-topic-summary">{a.summary}</span>
                  </button>
                ))}
                {getHelpByCategory(category).length === 0 && (
                  <p className="no-content">暂无内容。</p>
                )}
              </div>
            </div>
          )}

          {/* 首页 */}
          {view === "home" && (
            <div className="help-home">
              {query.trim().length >= 2 && searchResults.length > 0 && (
                <div className="help-section">
                  <h4 className="help-section-title">搜索结果</h4>
                  <div className="help-article-list">
                    {searchResults.map((a) => (
                      <button
                        key={a.id}
                        type="button"
                        className="help-topic"
                        onClick={() => openArticle(a.id)}
                      >
                        <span className="help-topic-title">{a.title}</span>
                        <span className="help-topic-summary">{a.summary}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {query.trim().length >= 2 && searchResults.length === 0 && (
                <p className="no-content">未找到相关帮助。</p>
              )}

              {!query && (
                <>
                  {stageArticles.length > 0 && (
                    <div className="help-section">
                      <h4 className="help-section-title">你现在需要知道</h4>
                      <div className="help-article-list">
                        {stageArticles.map((a) => (
                          <button
                            key={a.id}
                            type="button"
                            className="help-topic highlighted"
                            onClick={() => openArticle(a.id)}
                          >
                            <span className="help-topic-title">{a.title}</span>
                            <span className="help-topic-summary">
                              {a.summary}
                            </span>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="help-section">
                    <h4 className="help-section-title">分类</h4>
                    <div className="chips help-category-chips">
                      {CATEGORIES.map((c) => (
                        <button
                          key={c.id}
                          type="button"
                          className="chip"
                          onClick={() => openCategory(c.id)}
                        >
                          {c.label}
                        </button>
                      ))}
                    </div>
                  </div>
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
