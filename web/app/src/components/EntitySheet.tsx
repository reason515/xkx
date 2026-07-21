import { useState } from "react";
import {
  buildAskTopicActions,
  buildLearnTopicActions,
  groundItemActions,
  invCommandTarget,
  mudCommandTarget,
  parseBoardReadActions,
  parseDealerCategories,
  parseVendorGoods,
} from "../lib/parser";
import type { AssistConfig, InvItem, SuggestedAction } from "../lib/types";
import { ChoiceRow } from "./ChoiceRow";

interface Props {
  id: string;
  name: string;
  kind: "npc" | "item";
  /** Unique single-token id from room.update; preferred over last id word. */
  commandId?: string;
  scenery?: boolean;
  canApprentice?: boolean | number;
  canTrade?: boolean | number;
  canSell?: boolean | number;
  canSteal?: boolean | number;
  isCorpse?: boolean | number;
  canLoot?: boolean | number;
  canLead?: boolean | number;
  canBeg?: boolean | number;
  canPersuade?: boolean | number;
  isContainer?: boolean | number;
  isBook?: boolean | number;
  canSit?: boolean | number;
  canRide?: boolean | number;
  inventory?: InvItem[];
  docText?: string;
  docLoading?: boolean;
  /** Scene ask/learn chips already known for this NPC (e.g. beach / teacher hints). */
  askHints?: SuggestedAction[];
  /** Recent 见闻 text to recover teach offers if scene chips were cleared. */
  recentLog?: string;
  onClose: () => void;
  /** Ordinary entity actions (look / get / …); sheet may close after. */
  onAction: (cmd: string) => void;
  /** Board list/read — keep sheet open and show captured text. */
  onDocAction?: (cmd: string) => void;
  /** Bare `ask <who>` to list inquiry topics into docText. */
  onAskList?: (cmd: string) => void;
  /**
   * `skills <who>` to list teachable skills (师父/配偶可查；
   * 公开教头仍靠见闻 hints)。
   */
  onLearnList?: (cmd: string) => void;
  /** Start repeated learning after choosing a teacher and skill. */
  onStartLearn?: (config: AssistConfig) => void;
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
  commandId,
  scenery,
  canApprentice = false,
  canTrade = false,
  canSell = false,
  canSteal = false,
  isCorpse = false,
  canLoot = false,
  canLead = false,
  canBeg = false,
  canPersuade = false,
  isContainer = false,
  isBook = false,
  canSit = false,
  canRide = false,
  inventory = [],
  docText = "",
  docLoading = false,
  askHints = [],
  recentLog = "",
  onClose,
  onAction,
  onDocAction,
  onAskList,
  onLearnList,
  onStartLearn,
  onClearDoc,
}: Props) {
  const [asking, setAsking] = useState(false);
  const [learning, setLearning] = useState(false);
  const [giving, setGiving] = useState(false);
  const [selling, setSelling] = useState(false);
  const [trading, setTrading] = useState(false);
  const [learnAction, setLearnAction] = useState<SuggestedAction | null>(null);
  const [learnStop, setLearnStop] = useState<"count" | "potential">("count");
  const [learnCount, setLearnCount] = useState(1);

  // Prefer english id for mud commands when available
  const target =
    id && /^[a-z][\w\s]*$/i.test(id) && id !== name ? id : name;
  const askTarget = mudCommandTarget(id, name, commandId);

  const board = kind === "item" && isBulletinBoard(id, name);
  const reading = board && (!!docText || docLoading);
  const readActions = reading ? parseBoardReadActions(docText) : [];
  const askTopics = asking
    ? buildAskTopicActions(id, name, askHints, docText, [], commandId)
    : [];
  const vendorGoods = trading ? parseVendorGoods(docText) : [];
  const dealerCategories = trading ? parseDealerCategories(docText) : [];
  const learnTopics = learning
    ? buildLearnTopicActions(
        id,
        name,
        askHints,
        docText,
        commandId,
        recentLog
      )
    : [];
  // skills 对 recognize_apprentice 教头也会拒绝；有见闻传授提示时不算「不可请教」
  const learnRefused =
    learning &&
    !docLoading &&
    learnTopics.length === 0 &&
    /你要察看谁的技能/.test(docText);
  const learnEmpty =
    learning &&
    !docLoading &&
    learnTopics.length === 0 &&
    !learnRefused &&
    !!docText.trim();

  const boardActions: [string, string][] = [
    ["查看", `look ${target}`],
    ["浏览留言", "list"],
    ["读新留言", "read new"],
  ];
  const itemActions: [string, string][] = groundItemActions(
    id,
    name,
    scenery,
    commandId
  ).map((a) => [a.label, a.command]);

  // Extra item interactions from webd.c flags
  const extraItemActions: [string, string][] = [];
  if (!!isContainer && !scenery) extraItemActions.push(["打开", `open ${target}`]);
  if (!!isBook) extraItemActions.push(["阅读", `read ${target}`]);
  if (!!canSit) extraItemActions.push(["坐下", `sit ${target}`]);
  if (!!canRide) extraItemActions.push(["骑乘", `ride ${target}`]);

  const actions = board ? boardActions : [...itemActions, ...extraItemActions];
  const giveItems = inventory.filter((item) => !item.equipped && !item.embedded);

  const runNpcAction = (command: string) => {
    onAction(command);
    onClose();
  };

  const leaveAskMode = () => {
    setAsking(false);
    onClearDoc?.();
  };

  const leaveLearnMode = () => {
    if (learnAction) {
      setLearnAction(null);
      return;
    }
    setLearning(false);
    onClearDoc?.();
  };

  const leaveGivingMode = () => setGiving(false);

  const leaveSellingMode = () => setSelling(false);

  const leaveTradingMode = () => {
    setTrading(false);
    onClearDoc?.();
  };

  return (
    <div className="overlay open" onClick={onClose}>
      <div className="sheet" onClick={(e) => e.stopPropagation()}>
        <div className="sheet-top">
          <h3>
            {asking
              ? `打听「${name}」`
              : learning
                ? `向「${name}」请教`
                : giving
                  ? `给予「${name}」`
                  : selling
                    ? `向「${name}」卖出`
                    : trading
                    ? `查看「${name}」的货品`
                    : reading
                      ? "留言"
                      : name}
          </h3>
          <button type="button" className="close" onClick={onClose}>
            ×
          </button>
        </div>
        <div className="sheet-scroll">
          {asking ? (
            <>
              <button type="button" className="doc-back" onClick={leaveAskMode}>
                ← 返回
              </button>
              <p
                style={{
                  color: "var(--paper-dim)",
                  fontSize: 13,
                  marginBottom: 12,
                }}
              >
                想打听什么？
              </p>
              {docLoading && askTopics.length <= 3 ? (
                <p className="doc-status">正在列出可问之事…</p>
              ) : null}
              <div className="help-topics">
                {askTopics.map((a) => (
                  <button
                    key={a.command}
                    type="button"
                    className="help-topic"
                    onClick={() => {
                      onAction(a.command);
                      onClose();
                    }}
                  >
                    {a.label}
                  </button>
                ))}
              </div>
            </>
          ) : learning ? (
            <>
              <button
                type="button"
                className="doc-back"
                onClick={leaveLearnMode}
              >
                ← 返回
              </button>
              <p className="entity-mode-hint">
                {learnAction ? `学习「${learnAction.label}」` : "想学哪门功夫？"}
              </p>
              {docLoading && learnTopics.length === 0 ? (
                <p className="doc-status">正在列出可学功夫…</p>
              ) : null}
              {learnRefused && learnTopics.length === 0 ? (
                <p className="doc-status">
                  对方与你没有师徒之谊，也未主动传授功夫。
                </p>
              ) : null}
              {learnEmpty ? (
                <p className="doc-status">对方目前没有可传授的功夫。</p>
              ) : null}
              {learnAction ? (
                <div className="learn-assist-form">
                  <ChoiceRow
                    label="学习方式"
                    value={learnStop}
                    options={[
                      { id: "count", label: "按次数" },
                      { id: "potential", label: "学到潜能耗尽" },
                    ]}
                    onChange={setLearnStop}
                  />
                  {learnStop === "count" && (
                    <label className="learn-count-field">
                      <span>学习次数</span>
                      <input
                        type="number"
                        min={1}
                        max={999}
                        value={learnCount}
                        onChange={(e) =>
                          setLearnCount(
                            Math.min(999, Math.max(1, Number(e.target.value) || 1))
                          )
                        }
                      />
                    </label>
                  )}
                  <p className="learn-assist-hint">
                    按次数时一次学完设定次数；精不足或授业者疲劳时会原地等候，恢复后继续。
                  </p>
                  <button
                    type="button"
                    className="learn-start"
                    onClick={() => {
                      const [, teacher, skill] =
                        learnAction.command.trim().split(/\s+/);
                      if (!teacher || !skill) return;
                      onStartLearn?.({
                        mode: "learn",
                        teacher,
                        skill,
                        stopWhen: learnStop,
                        stopCount: learnStop === "count" ? learnCount : 1,
                        stopOnCombat: true,
                      });
                      onClose();
                    }}
                  >
                    开始学习
                  </button>
                </div>
              ) : (
                <div className="help-topics">
                  {learnTopics.map((a) => (
                    <button
                      key={a.command}
                      type="button"
                      className="help-topic"
                      onClick={() => setLearnAction(a)}
                    >
                      {a.label}
                    </button>
                  ))}
                </div>
              )}
            </>
          ) : giving ? (
            <>
              <button type="button" className="doc-back" onClick={leaveGivingMode}>
                ← 返回
              </button>
              <p className="entity-mode-hint">要把哪件物品交给对方？</p>
              {giveItems.length ? (
                <div className="help-topics entity-item-list">
                  {giveItems.map((item) => (
                    <button
                      key={`${item.id}-${item.name}`}
                      type="button"
                      className="help-topic"
                      onClick={() =>
                        runNpcAction(
                          `give ${askTarget} ${invCommandTarget(item.id, item.name)}`
                        )
                      }
                    >
                      {item.name}
                    </button>
                  ))}
                </div>
              ) : (
                <p className="doc-status">行囊里没有可给予的物品。</p>
              )}
            </>
          ) : selling ? (
            <>
              <button type="button" className="doc-back" onClick={leaveSellingMode}>
                ← 返回
              </button>
              <p className="entity-mode-hint">选择要卖出的物品：</p>
              {giveItems.length ? (
                <div className="help-topics entity-item-list">
                  {giveItems.map((item) => (
                    <button
                      key={`${item.id}-${item.name}`}
                      type="button"
                      className="help-topic"
                      onClick={() =>
                        runNpcAction(
                          `sell ${invCommandTarget(item.id, item.name)}`
                        )
                      }
                    >
                      {item.name}
                    </button>
                  ))}
                </div>
              ) : (
                <p className="doc-status">行囊里没有可卖出的物品。</p>
              )}
            </>
          ) : trading ? (
            <>
              <button type="button" className="doc-back" onClick={leaveTradingMode}>
                ← 返回
              </button>
              {docLoading && !docText ? (
                <p className="doc-status">正在查看货品…</p>
              ) : vendorGoods.length ? (
                <>
                  <p className="entity-mode-hint">点选购买：</p>
                  <div className="help-topics entity-item-list">
                    {vendorGoods.map((g) => (
                      <button
                        key={g.id}
                        type="button"
                        className="help-topic"
                        data-testid={`buy-${g.id}`}
                        onClick={() => onAction(g.command)}
                      >
                        {g.name}
                        {g.price ? (
                          <span className="entity-good-price">
                            {" "}
                            · {g.price}
                          </span>
                        ) : null}
                      </button>
                    ))}
                  </div>
                </>
              ) : dealerCategories.length ? (
                <>
                  <p className="entity-mode-hint">选择要查看的货品类别：</p>
                  <div className="help-topics entity-item-list">
                    {dealerCategories.map((category) => (
                      <button
                        key={category.id}
                        type="button"
                        className="help-topic"
                        data-testid={`dealer-category-${category.id}`}
                        onClick={() => onDocAction?.(category.command)}
                      >
                        {category.label}
                      </button>
                    ))}
                  </div>
                </>
              ) : (
                <pre className="doc-body">
                  {docText || "对方目前没有列出货品。"}
                </pre>
              )}
            </>
          ) : reading ? (
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
          ) : kind === "npc" ? (
            <>
              {!!isCorpse && !!canLoot && (
                <button
                  type="button"
                  className="entity-action-jade"
                  onClick={() => runNpcAction(`get all from ${askTarget}`)}
                >
                  搜刮
                </button>
              )}

              {!isCorpse && (<>
              <section className="entity-action-group">
                <div className="entity-action-grid">
                  <button type="button" onClick={() => runNpcAction(`look ${target}`)}>查看</button>
                  <button type="button" onClick={() => { setAsking(true); onAskList?.(`ask ${askTarget}`); }}>打听</button>
                  <button type="button" onClick={() => { setLearning(true); onLearnList?.(`skills ${askTarget}`); }}>请教</button>
                  <button type="button" onClick={() => runNpcAction(`follow ${askTarget}`)}>跟随</button>
                  <button type="button" onClick={() => setGiving(true)}>给予</button>
                  {!!canApprentice && (<button type="button" className="entity-action-jade" onClick={() => runNpcAction(`apprentice ${askTarget}`)}>拜师</button>)}
                  {!!canTrade && (<button type="button" data-testid="entity-trade" onClick={() => { setTrading(true); onDocAction?.("list"); }}>购买</button>)}
                  {!!canSell && (<button type="button" data-testid="entity-sell" onClick={() => setSelling(true)}>卖出</button>)}
                  {!!canLead && (<button type="button" onClick={() => runNpcAction(`lead ${askTarget}`)}>带领</button>)}
                </div>
              </section>

              <details>
                <summary>江湖手段</summary>
                <div className="entity-action-grid">
                  {!!canBeg && (<button type="button" onClick={() => runNpcAction(`beg ${askTarget}`)}>讨要</button>)}
                  {!!canPersuade && (<button type="button" onClick={() => runNpcAction(`persuade ${askTarget}`)}>说服</button>)}
                  {!!canSteal && (<button type="button" className="entity-action-danger" onClick={() => runNpcAction(`steal ${askTarget}`)}>偷窃</button>)}
                  <button type="button" onClick={() => runNpcAction(`fight ${askTarget}`)}>切磋</button>
                  <button type="button" className="entity-action-danger" onClick={() => runNpcAction(`kill ${askTarget}`)}>攻击</button>
                  <button type="button" onClick={() => runNpcAction("halt")}>停手</button>
                </div>
              </details>
              </>)}
            </>
          ) : (
            <p
              style={{
                color: "var(--paper-dim)",
                fontSize: 13,
                marginBottom: 16,
              }}
            >
              {board ? "你要如何查看此牌？" : "你要如何处置此物？"}
            </p>
          )}
        </div>
        {kind !== "npc" && !reading && !asking && !learning && (
          <div className="sheet-acts">
            {actions.map(([label, command]) => (
              <button
                key={label}
                type="button"
                onClick={() => {
                  if (command === "__ask__") {
                    setAsking(true);
                    onAskList?.(`ask ${askTarget}`);
                    return;
                  }
                  if (command === "__learn__") {
                    setLearning(true);
                    // 师徒/配偶可查 skills；公开教头仍靠见闻 hints 合并进列表
                    onLearnList?.(`skills ${askTarget}`);
                    return;
                  }
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
