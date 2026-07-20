import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  beachGreeterActions,
  weaponRoomActions,
  buildScoreHtml,
  carriageTravelActions,
  chunkLooksLikeSelfLook,
  coconutTreeActions,
  fishingSpotActions,
  inferredShutDoorActions,
  extractLookBlock,
  extractSelfLookPanel,
  isCombatLine,
  isEntitySheetAction,
  isLoginNoise,
  isMorePromptLine,
  isProtocolNoise,
  isSelfLookLine,
  isSelfLookStopLine,
  isRoomLookLine,
  isStaticPassageLine,
  isSheetDumpLine,
  isTrainLine,
  labelSuggestedAction,
  mergeSuggestedActions,
  mountainFruitActions,
  suggestedActionsFromRoomText,
  parseEnableMap,
  parseHp,
  parseInventory,
  parsePrepareMap,
  parseRoom,
  parseScore,
  parseSkills,
  parseSuggestedActions,
  parseWimpyPct,
  reconcileEnableMap,
  reflowSoftWrappedEntries,
  roomUtilityActions,
  stripScoreBanner,
  suggestsRoomLayoutChange,
  waterfallPassageActions,
  parseLearnOfferActions,
  applyEquipOptimistic,
  applySkillEnableSlots,
} from "../lib/parser";
import { createToastScheduler } from "../lib/toastScheduler";
import {
  buildGuideContext,
  matchGuideTip,
  readDismissed,
  readGuideFinished,
  readSeenXiakedao,
  writeDismissed,
  writeGuideFinished,
  writeSeenXiakedao,
  type GuideTip as GuideTipMatch,
} from "../lib/guideTips";
import { applyEvent } from "../lib/protocol";
import type {
  AssistConfig,
  DocTarget,
  Entity,
  GameState,
  LogEntry,
  MudEvent,
  SheetKind,
} from "../lib/types";
import { GameSocket } from "../lib/ws";

/** 进游戏后静默拉场景的间隔（毫秒）。 */
const SCENE_POLL_MS = 4000;

const initialState = (): GameState => ({
  connected: false,
  inGame: false,
  playerName: "侠客",
  vitals: {},
  room: { exits: [], npcs: [], items: [] },
  suggestedActions: [],
  logs: [],
  lookText: "",
  lookHtml: "",
  scoreText: "",
  scoreHtml: "",
  score: undefined,
  skills: [],
  inventory: [],
  enabled: {},
  skillEnableSlots: {},
  prepared: {},
  wimpyPct: 0,
  combatLog: [],
  trainLog: [],
  assistActive: false,
  assistStatus: "",
  sheet: null,
  docText: "",
  docLoading: false,
  docTarget: null,
});

const DOC_IDLE_MS = 1400;
const DOC_MAX_MS = 20_000;

let logId = 0;

export type UseGameOptions = {
  /** Desktop terminal: ANSI raw stream (JSON frames already stripped). */
  onRawText?: (raw: string) => void;
};

export function useGame(opts?: UseGameOptions) {
  const socket = useRef(new GameSocket());
  const onRawTextRef = useRef(opts?.onRawText);
  onRawTextRef.current = opts?.onRawText;
  const textBuf = useRef("");
  const roomFromEvent = useRef(false);
  const enteredGame = useRef(false);
  /** Suppress look-me narrative from 见闻 while capturing 仪容. */
  const expectLookMe = useRef(false);
  /** After silent `wimpy N`，吞掉回显 Ok. */
  const expectWimpySet = useRef(false);
  /** Capture help / board list·read into doc panel instead of 见闻. */
  const expectDoc = useRef<{
    target: DocTarget;
    started: number;
    idleTimer: ReturnType<typeof setTimeout> | null;
  } | null>(null);
  /** Intentional quit → softer disconnect toast. */
  const quittingRef = useRef(false);
  const roomRefreshTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  /** 战斗文案时节流补 hp，兜底尚未推送的 player.vitals。 */
  const combatHpTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  /** 场景定时刷新：兜住 LPC 改出口/物品却未 notify_room 的情况。 */
  const scenePollTimer = useRef<ReturnType<typeof setInterval> | null>(null);
  const [state, setState] = useState<GameState>(initialState);
  const [toast, setToast] = useState("");
  // setToast 身份稳定，scheduler 只建一次即可
  const toastScheduler = useRef(createToastScheduler(setToast));
  const [loginError, setLoginError] = useState("");
  const [selectedExit, setSelectedExit] = useState<{
    dir: string;
    name?: string;
  } | null>(null);
  const [selectedEntity, setSelectedEntity] = useState<Entity | null>(null);
  const [charTab, setCharTab] = useState(0);
  const [guideDismissed, setGuideDismissed] = useState<Set<string>>(
    () => readDismissed()
  );
  const [guideFinished, setGuideFinished] = useState(() => readGuideFinished());
  const [seenXiakedao, setSeenXiakedao] = useState(() => readSeenXiakedao());

  const showToast = useCallback((msg: string) => {
    toastScheduler.current.show(msg);
  }, []);

  useEffect(() => {
    if ((state.room.area || "").toLowerCase() !== "xiakedao") return;
    if (seenXiakedao) return;
    writeSeenXiakedao();
    setSeenXiakedao(true);
  }, [state.room.area, seenXiakedao]);

  const guideTip: GuideTipMatch | null = useMemo(() => {
    if (!state.inGame) return null;
    return matchGuideTip(
      buildGuideContext({
        area: state.room.area,
        title: state.room.title,
        exits: state.room.exits,
        doors: state.room.doors,
        npcs: state.room.npcs,
        items: state.room.items,
        exp: state.vitals.exp,
        skills: state.skills,
        dismissed: guideDismissed,
        seenXiakedao,
        finished: guideFinished,
      })
    );
  }, [
    state.inGame,
    state.room.area,
    state.room.title,
    state.room.exits,
    state.room.doors,
    state.room.npcs,
    state.room.items,
    state.vitals.exp,
    state.skills,
    guideDismissed,
    seenXiakedao,
    guideFinished,
  ]);

  const dismissGuideTip = useCallback(() => {
    if (!guideTip) return;
    const next = new Set(guideDismissed);
    next.add(guideTip.id);
    setGuideDismissed(next);
    writeDismissed(next);
    if (guideTip.id === "mainland-welcome") {
      setGuideFinished(true);
      writeGuideFinished(true);
    }
  }, [guideTip, guideDismissed]);

  const addLog = useCallback((
    text: string,
    kind?: LogEntry["kind"],
    html?: string
  ) => {
    if (!text.trim()) return;
    if (isMorePromptLine(text)) return;
    if (
      isLoginNoise(text) ||
      isProtocolNoise(text) ||
      isSheetDumpLine(text, text) ||
      isRoomLookLine(text, text) ||
      isStaticPassageLine(text)
    )
      return;
    setState((s) => ({
      ...s,
      logs: [
        ...s.logs.slice(-80),
        { id: ++logId, text, html, kind: kind || "normal" },
      ],
    }));
  }, []);

  const finishDocCapture = useCallback(() => {
    const cap = expectDoc.current;
    if (cap?.idleTimer) clearTimeout(cap.idleTimer);
    expectDoc.current = null;
    setState((s) => ({ ...s, docLoading: false }));
  }, []);

  const clearDoc = useCallback(() => {
    finishDocCapture();
    setState((s) => ({
      ...s,
      docText: "",
      docLoading: false,
      docTarget: null,
    }));
  }, [finishDocCapture]);

  const beginDocCapture = useCallback(
    (target: DocTarget) => {
      const prev = expectDoc.current;
      if (prev?.idleTimer) clearTimeout(prev.idleTimer);
      expectDoc.current = {
        target,
        started: Date.now(),
        idleTimer: null,
      };
      setState((s) => ({
        ...s,
        sheet: target === "help" ? "help" : s.sheet === "entity" ? "entity" : s.sheet,
        docText: "",
        docLoading: true,
        docTarget: target,
      }));
    },
    []
  );

  const appendDocText = useCallback(
    (chunk: string) => {
      const cap = expectDoc.current;
      if (!cap) return false;
      if (Date.now() - cap.started > DOC_MAX_MS) {
        finishDocCapture();
        return false;
      }
      const lines = chunk
        .split(/\r?\n/)
        .filter((line) => {
          const t = line.trim();
          if (!t) return true;
          if (isMorePromptLine(t)) return false;
          if (isLoginNoise(t) || isProtocolNoise(t)) return false;
          return true;
        });
      const text = lines.join("\n").replace(/^\n+/, "");
      if (text.trim()) {
        setState((s) => ({
          ...s,
          docText: s.docText ? `${s.docText}\n${text}` : text,
          docLoading: true,
          docTarget: cap.target,
        }));
      }
      if (cap.idleTimer) clearTimeout(cap.idleTimer);
      cap.idleTimer = setTimeout(() => finishDocCapture(), DOC_IDLE_MS);
      return true;
    },
    [finishDocCapture]
  );

  const scheduleEquipRefresh = useCallback(() => {
    window.setTimeout(() => {
      socket.current.cmd("inventory");
      socket.current.cmd("score");
    }, 280);
  }, []);

  const scheduleInvRefresh = useCallback((alsoHp = false) => {
    window.setTimeout(() => {
      socket.current.cmd("inventory");
      if (alsoHp) socket.current.cmd("hp");
    }, 280);
  }, []);

  const scheduleCombatHpRefresh = useCallback(() => {
    if (combatHpTimer.current) return;
    combatHpTimer.current = setTimeout(() => {
      combatHpTimer.current = null;
      socket.current.cmd("hp");
    }, 450);
  }, []);

  /**
   * 出口/门/甬道等就地变化后，静默拉结构化场景（webclient→room.update）。
   * 不用 look：避免描写刷进见闻，也避免 long 关键词再次触发刷新。
   */
  const roomRefreshCooldownUntil = useRef(0);
  const scheduleRoomRefresh = useCallback(() => {
    const now = Date.now();
    if (now < roomRefreshCooldownUntil.current) return;
    if (roomRefreshTimer.current) clearTimeout(roomRefreshTimer.current);
    roomRefreshTimer.current = setTimeout(() => {
      roomRefreshTimer.current = null;
      roomRefreshCooldownUntil.current = Date.now() + 4000;
      // 刚收到 room.update 则跳过，减少重复推送
      if (roomFromEvent.current) return;
      socket.current.cmd("webclient");
    }, 380);
  }, []);

  const cmd = useCallback(
    (command: string, opts?: { silent?: boolean }) => {
      const parts = command.trim().split(/\s+/);
      const verb = parts[0]?.toLowerCase();
      const target = parts.slice(1).join(" ").trim().toLowerCase();
      // follow/enter 会换房：清掉旧建议动作，并允许文本 look 回退更新标题
      if (verb === "follow" || verb === "enter" || verb === "register") {
        roomFromEvent.current = false;
        setState((s) => ({ ...s, suggestedActions: [] }));
      }
      // 穿/脱/装备/收起：乐观更新（含同槽卸旧再装新），再拉 inventory+score
      if (
        target &&
        (verb === "wear" ||
          verb === "remove" ||
          verb === "wield" ||
          verb === "unwield")
      ) {
        setState((s) => ({
          ...s,
          inventory: applyEquipOptimistic(s.inventory, verb, target),
        }));
        scheduleEquipRefresh();
      }
      socket.current.cmd(command);
      // go 由点出口触发，见闻不必回显；其它显式指令仍可 echo（如 say）
      const quiet =
        !!opts?.silent || verb === "go";
      if (!quiet) addLog(`> ${command}`, "sys");
      // 张三传送约 5s；补一次 look，避免 room.update 迟到时标题仍停在沙滩
      if (verb === "follow") {
        window.setTimeout(() => {
          roomFromEvent.current = false;
          socket.current.cmd("look");
        }, 5500);
      }
      if (verb === "eat" || verb === "drink") {
        scheduleInvRefresh(true);
        // 地上吃喝后物品可能消失；LPC move/destruct 可能不通知时 look 兜底
        roomFromEvent.current = false;
        scheduleRoomRefresh();
      } else if (verb === "drop" || verb === "get" || verb === "buy" || verb === "sell") {
        // 货品面板 list 捕获中点购买：先结束捕获，让回显进见闻
        if ((verb === "buy" || verb === "sell") && expectDoc.current) {
          finishDocCapture();
        }
        scheduleInvRefresh(false);
        // 地上物进出由 feature/move.c notify_room 推送；此处不再强制 look，
        // 避免与结构化 room.update 竞态把已捡起物品刷回来。
      }
      // 要粥/打听/开门等就地改场景：补 look（LPC notify_room 优先，look 兜底）
      if (
        verb === "serve" ||
        (verb === "ask" && /\babout\b/i.test(command)) ||
        verb === "open" ||
        verb === "unlock" ||
        verb === "push" ||
        verb === "pull" ||
        verb === "knock"
      ) {
        // serve 等不会先有 room.update：允许 look 兜底刷新
        if (verb === "serve") roomFromEvent.current = false;
        scheduleRoomRefresh();
      }
    },
    [addLog, finishDocCapture, scheduleEquipRefresh, scheduleInvRefresh, scheduleRoomRefresh]
  );

  const docCmd = useCallback(
    (command: string, target: DocTarget) => {
      beginDocCapture(target);
      cmd(command, { silent: true });
    },
    [beginDocCapture, cmd]
  );

  const enterGame = useCallback((clearBuf = true) => {
    if (enteredGame.current) return;
    enteredGame.current = true;
    // ready 先于首包 text：可清空。text 回退路径已 append，勿清以免丢掉 look。
    if (clearBuf) textBuf.current = "";
    roomFromEvent.current = false;
    setState((s) => ({ ...s, inGame: true }));
    // Gateway marks web_client on ready; refresh look after mark takes effect
    setTimeout(() => {
      socket.current.cmd("look");
      socket.current.cmd("hp");
      socket.current.cmd("score");
    }, 350);
    // 可激发门类稍后拉取，勿挤在进游戏首包指令里拖慢走动
    setTimeout(() => {
      socket.current.cmd("webclient skills");
    }, 1200);
  }, []);

  useEffect(() => {
    const offMsg = socket.current.on((msg) => {
      if (msg.type === "connected") {
        setLoginError("");
        setState((s) => ({ ...s, connected: true }));
        return;
      }
      if (msg.type === "error") {
        setLoginError(msg.message || "连接错误");
        return;
      }
      if (msg.type === "disconnected") {
        enteredGame.current = false;
        roomFromEvent.current = false;
        textBuf.current = "";
        const intentional = quittingRef.current;
        quittingRef.current = false;
        setState((s) => ({ ...s, connected: false, inGame: false }));
        showToast(intentional ? "已退出" : "与服务器断开");
        return;
      }
      if (msg.type === "ready") {
        enterGame(true);
        return;
      }
      if (msg.type === "event" && msg.event) {
        const ev = msg.event as MudEvent;
        // look 方向预览邻房时勿把邻房当成当前场景（旧 LPC 仍可能误发）
        if (
          ev.type === "room.update" &&
          expectDoc.current?.target === "exit"
        ) {
          return;
        }
        if (ev.type === "room.update") roomFromEvent.current = true;
        if (ev.type === "assist.status") {
          const message = String(ev.message || "").trim();
          if (ev.active) {
            // 重要提示弹 toast；例行心跳（交手中/等候刷新）只走挂机条，避免刷屏冲掉可读时间
            if (
              /助手进行中|战斗辅助|前往石室|石壁领悟|精力不足|无法赶路|无法前往|撤回受阻|请先跟随|落点沙滩|动作受阻|改道前往|忙碌中|正在调息|力尽昏迷/.test(
                message
              )
            ) {
              toastScheduler.current.showUnlessSame(message);
            }
          } else if (
            message &&
            message !== "已停止" &&
            message !== "手动停止"
          ) {
            toastScheduler.current.show(message);
          }
        }
        setState((s) => {
          const applied = applyEvent(ev, s);
          const roomChanged =
            ev.type === "room.update" &&
            !!applied.room.title &&
            applied.room.title !== s.room.title;
          const roomEntities = [
            ...(applied.room.npcs || []),
            ...(applied.room.items || []),
          ];
          const fromDesc = suggestedActionsFromRoomText(
            `${applied.room.desc || ""}\n${applied.room.sceneryText || ""}`,
            applied.room.npcs,
            applied.room.title || ""
          ).map((action) => ({
            ...action,
            label: labelSuggestedAction(action.command, roomEntities),
          }));
          const roomHints = [
            ...fromDesc,
            ...beachGreeterActions(applied.room.title, applied.room.npcs),
            ...waterfallPassageActions(applied.room.title),
            ...weaponRoomActions(applied.room),
            ...coconutTreeActions(applied.room),
            ...mountainFruitActions(applied.room.title),
            ...fishingSpotActions(applied.room, s.inventory),
            ...roomUtilityActions(applied.room),
            ...inferredShutDoorActions(applied.room),
            ...carriageTravelActions(applied.room),
          ];
          // Keep ask/learn narrative chips; regenerate door/car/room chips
          const prevKeep = roomChanged
            ? []
            : s.suggestedActions.filter((a) => isEntitySheetAction(a.command));
          return {
            ...s,
            ...applied,
            inGame: true,
            suggestedActions: mergeSuggestedActions(
              prevKeep,
              roomHints,
              roomEntities
            ),
          };
        });
        if (!enteredGame.current) enterGame(false);
        return;
      }
      if (msg.type === "text" && msg.text) {
        if (msg.raw) onRawTextRef.current?.(msg.raw);
        const chunk = msg.text.replace(/\0/g, "");
        textBuf.current += chunk;

        // Fallback if gateway did not emit ready (older build)
        if (!enteredGame.current && /目前权限|重新连线回到这个世界/.test(textBuf.current)) {
          enterGame(false);
        }

        if (!enteredGame.current) return;

        const lines = chunk.split("\n");
        // Only bind 仪容 when the chunk itself looks like look-me output.
        // Never swallow unrelated NPC speech (e.g. 打听侠客岛) into lookText /
        // out of 见闻 — that was breaking beach ask replies after opening 角色卡.
        let suppressSelfLook = false;
        if (expectLookMe.current) {
          const lookFailed = /你要看什么？/.test(chunk);
          // 勿把 inventory「身上带著下列」误当成 look-me；look+hp 同包时截断气血行
          if (lookFailed) {
            // keep waiting for a real look-me reply
          } else if (chunkLooksLikeSelfLook(chunk)) {
            expectLookMe.current = false;
            suppressSelfLook = true;
            const { text: lookPlain, html: lookHtml } = extractSelfLookPanel(
              chunk,
              msg.htmlLines
            );
            if (lookPlain.trim()) {
              setState((s) => ({
                ...s,
                lookText: lookPlain,
                // 显式写入（可为空），避免沿用旧 lookHtml 把 hp 残留在仪容
                lookHtml,
              }));
            }
          }
        }

        const capturingDoc = !!expectDoc.current;
        if (capturingDoc) {
          appendDocText(chunk);
        }

        const pendingLog: { text: string; html?: string }[] = [];
        for (const [index, line] of lines.entries()) {
          const html = msg.htmlLines?.[index];
          if (!line.trim()) continue;
          if (line.length < 2) continue;
          if (/^>{0,1}\s*$/.test(line)) continue;
          if (isLoginNoise(line) || isProtocolNoise(line)) continue;
          if (isMorePromptLine(line)) continue;
          if (isSheetDumpLine(line, chunk)) continue;
          if (
            expectWimpySet.current &&
            /^>?Ok\.?\s*$/i.test(line.trim())
          ) {
            expectWimpySet.current = false;
            continue;
          }
          if (isRoomLookLine(line, chunk)) continue;
          if (isStaticPassageLine(line)) continue;
          // 仪容分片到达时也挡掉；NPC 打听等不会命中 isSelfLookLine
          if (suppressSelfLook || expectLookMe.current) {
            if (isSelfLookLine(line) || isSelfLookStopLine(line)) continue;
          }
          if (isCombatLine(line)) {
            setState((s) => ({
              ...s,
              combatLog: [...s.combatLog.slice(-40), line],
            }));
            // 涉及「你」的战斗行：立刻节流拉一次气血（服务端 notify_vitals 为主）
            if (/你/.test(line)) scheduleCombatHpRefresh();
          } else if (isTrainLine(line)) {
            setState((s) => ({
              ...s,
              trainLog: [...s.trainLog.slice(-40), line],
            }));
          }
          // 长文进帮助/告示牌面板，不灌见闻
          if (capturingDoc) continue;
          pendingLog.push({ text: line, html });
        }
        // Join author/driver soft-wraps so 见闻 does not break mid-sentence
        // (also keeps colored HTML spans continuous after gateway color-carry).
        for (const entry of reflowSoftWrappedEntries(pendingLog)) {
          addLog(entry.text, undefined, entry.html);
        }

        if (
          !capturingDoc &&
          suggestsRoomLayoutChange(chunk) &&
          // notify_room / ask 已会刷新；有结构化房间事件时勿再 look 防刷屏
          !roomFromEvent.current
        ) {
          scheduleRoomRefresh();
        }

        if (!capturingDoc) {
          setState((s) => {
            const fromText = [
              ...parseSuggestedActions(chunk, s.room.npcs),
              ...parseLearnOfferActions(chunk, s.room.npcs),
            ];
            if (!fromText.length) return s;
            return {
              ...s,
              suggestedActions: mergeSuggestedActions(
                s.suggestedActions,
                fromText,
                s.room.npcs
              ),
            };
          });
        }

        if (
          !capturingDoc &&
          (EXIT_HINT.test(chunk) ||
            /这里(?:有|摆着)/.test(chunk) ||
            ROOM_TITLE_HINT.test(chunk))
        ) {
          // Structured room.update wins over text fallback
          if (!roomFromEvent.current) {
            const room = parseRoom(extractLookBlock(textBuf.current));
            setState((s) => {
              const roomChanged =
                !!room.title && room.title !== s.room.title;
              const parsedLook = EXIT_HINT.test(chunk) || roomChanged;
              const npcs = room.npcs || s.room.npcs;
              const nextRoom = {
                ...s.room,
                ...room,
                exits: parsedLook
                  ? room.exits ?? []
                  : room.exits?.length
                    ? room.exits
                    : s.room.exits,
              };
              const roomHints = [
                ...beachGreeterActions(nextRoom.title, npcs),
                ...waterfallPassageActions(nextRoom.title),
                ...weaponRoomActions(nextRoom),
                ...coconutTreeActions(nextRoom),
                ...mountainFruitActions(nextRoom.title),
                ...fishingSpotActions(nextRoom, s.inventory),
                ...roomUtilityActions(nextRoom),
                ...inferredShutDoorActions(nextRoom),
                ...carriageTravelActions({
                  items: nextRoom.items,
                  exits: nextRoom.exits,
                }),
              ];
              const fromText = [
                ...parseSuggestedActions(chunk, npcs),
                ...parseLearnOfferActions(chunk, npcs),
              ];
              const prevKeep = roomChanged
                ? []
                : s.suggestedActions.filter((a) =>
                    isEntitySheetAction(a.command)
                  );
              return {
                ...s,
                room: nextRoom,
                suggestedActions: mergeSuggestedActions(
                  prevKeep,
                  [...fromText, ...roomHints],
                  npcs
                ),
              };
            });
          }
        }

        if (/精[：:]/.test(chunk) && /气[：:]/.test(chunk)) {
          const v = parseHp(chunk);
          if (v.qi) setState((s) => ({ ...s, vitals: { ...s.vitals, ...v } }));
        }

        {
          const wimpy =
            parseWimpyPct(chunk) ??
            chunk
              .split("\n")
              .map((ln) => parseWimpyPct(ln))
              .find((n) => n != null);
          if (wimpy != null) {
            setState((s) =>
              s.wimpyPct === wimpy ? s : { ...s, wimpyPct: wimpy }
            );
          }
        }

        if (/个人档案|膂力|悟性|根骨|身法|攻击力|防御力/.test(chunk)) {
          const scoreText = stripScoreBanner(chunk);
          const scoreHtml = buildScoreHtml(chunk, msg.htmlLines);
          const score = parseScore(chunk);
          setState((s) => ({
            ...s,
            scoreText: scoreText.trim() ? scoreText : s.scoreText,
            scoreHtml: scoreHtml.trim() ? scoreHtml : s.scoreHtml,
            score:
              score.bio ||
              score.attrs ||
              score.exp != null ||
              score.headline ||
              score.attack != null ||
              score.defense != null
                ? score
                : s.score,
          }));
        }
        // 仅同步「自己的」skills 面板；师父/帮助文案勿写入角色卡
        // TCP 可能分片：头在上一包、行在下一包，故从近期缓冲截取最后一次自己的面板
        if (!expectDoc.current) {
          const recent = textBuf.current.slice(-8000);
          const selfSkillsEmpty =
            /你目前并没有学会任何技能|你不会任何技能/.test(chunk);
          const selfSkillsHeader = /你目前所学过的技能/.test(recent);
          const looksLikeSkillRows =
            /\d+\s*\/\s*\d+/.test(chunk) &&
            (/初学乍练|粗通皮毛|半生不熟|马马虎虎|驾轻就熟|出类拔萃|神乎其技|出神入化|登峰造极|一代宗师|深不可测|新学乍用|初窥门径|略知一二|已有小成|心领神会|了然[於于]胸|豁然贯通|举世无双|震古铄今/.test(
              chunk
            ) ||
              /[│┃]/.test(chunk));
          if (selfSkillsEmpty) {
            setState((s) => ({ ...s, skills: [] }));
          } else if (selfSkillsHeader && ( /你目前所学过的技能/.test(chunk) || looksLikeSkillRows)) {
            const idx = recent.lastIndexOf("你目前所学过的技能");
            const panel = idx >= 0 ? recent.slice(idx) : chunk;
            const skills = parseSkills(panel);
            if (skills.length) {
              setState((s) => ({
                ...s,
                skills: applySkillEnableSlots(skills, s.skillEnableSlots),
                enabled: reconcileEnableMap(s.enabled, skills),
              }));
            }
          }

          // 真实 inventory 头：身上带著下列…；勿用「目前身上/物品」以免命中 help
          const invEmpty =
            /目前你身上没有任何东西|身上没有携带任何东西/.test(chunk);
          const invHeader = /身上带[着著]下列/.test(recent);
          const looksLikeInvRows =
            /^[□√]/.test(chunk.trim()) ||
            /^\s{2,}.+\([A-Za-z]/.test(chunk);
          if (invEmpty) {
            setState((s) => ({
              ...s,
              inventory: [],
              suggestedActions: mergeSuggestedActions(
                s.suggestedActions.filter((a) => a.command !== "fishing"),
                fishingSpotActions(s.room, []),
                s.room.npcs
              ),
            }));
          } else if (invHeader && (/身上带[着著]下列/.test(chunk) || looksLikeInvRows)) {
            const idx = Math.max(
              recent.lastIndexOf("身上带著下列"),
              recent.lastIndexOf("身上带着下列")
            );
            const panel = idx >= 0 ? recent.slice(idx) : chunk;
            const inventory = parseInventory(panel);
            if (inventory.length) {
              setState((s) => ({
                ...s,
                inventory,
                suggestedActions: mergeSuggestedActions(
                  s.suggestedActions.filter((a) => a.command !== "fishing"),
                  fishingSpotActions(s.room, inventory),
                  s.room.npcs
                ),
              }));
            }
          }

          // enable / jifa 槽位
          if (
            /以下是你目前使用中的特殊技能|你现在没有使用任何特殊技能/.test(chunk)
          ) {
            setState((s) => ({
              ...s,
              enabled: reconcileEnableMap(parseEnableMap(chunk), s.skills),
            }));
          } else if (/有效等级/.test(chunk) && /\([a-z]+\)/.test(chunk)) {
            const idx = recent.lastIndexOf("以下是你目前使用中的特殊技能");
            if (idx >= 0) {
              const panel = recent.slice(idx);
              setState((s) => ({
                ...s,
                enabled: reconcileEnableMap(parseEnableMap(panel), s.skills),
              }));
            }
          }

          if (
            /以下是你目前组合中的特殊拳术技能|你现在没有组合任何特殊拳术技能/.test(
              chunk
            )
          ) {
            setState((s) => ({ ...s, prepared: parsePrepareMap(chunk) }));
          }

          // 激发 / 准备反馈 → 提示并刷新武功面板
          if (/你从现在起用.+作为.+的特殊技能/.test(chunk)) {
            const m = chunk.match(/你从现在起用(.+?)作为(.+?)的特殊技能/);
            showToast(
              m ? `已激发「${m[1]}」为${m[2]}` : "已激发特殊武功"
            );
            window.setTimeout(() => {
              cmd("skills", { silent: true });
              cmd("webclient skills", { silent: true });
              cmd("enable", { silent: true });
            }, 200);
          } else if (/好吧，只用基本功夫/.test(chunk)) {
            showToast("已卸下特殊武功");
            window.setTimeout(() => {
              cmd("skills", { silent: true });
              cmd("webclient skills", { silent: true });
              cmd("enable", { silent: true });
            }, 200);
          } else if (/完成技能准备/.test(chunk)) {
            showToast("已准备拳术组合");
            window.setTimeout(() => {
              cmd("prepare", { silent: true });
              cmd("skills", { silent: true });
            }, 200);
          } else if (/取消全部技能准备/.test(chunk)) {
            showToast("已取消准备");
            window.setTimeout(() => cmd("prepare", { silent: true }), 200);
          } else if (/这个技能不能当成这种用途/.test(chunk)) {
            showToast("该武功不能用于此门类");
          } else if (/不需要 enable|是所有.+的基础/.test(chunk)) {
            showToast("基本功夫无需激发");
          } else if (/你不会这种技能/.test(chunk) && /enable|jifa|准备|激发/.test(recent.slice(-500))) {
            showToast("你还不会这种武功");
          } else if (/尚未激发或目前不能准备/.test(chunk)) {
            showToast("请先激发该武功再准备");
          } else if (/还不能自由走动|请先跟随张三或李四/.test(chunk)) {
            showToast("请先跟随张三或李四离开落点");
          } else if (/精疲力尽，动弹不得/.test(chunk)) {
            showToast("精力不足，稍作调息后再走");
          } else if (/上一个动作还没有完成|你正忙着/.test(chunk)) {
            showToast("还在忙，稍后再试");
          }

          // 穿戴 / 装备武器反馈 → 刷新行囊与攻防（cmd 侧已乐观更新并预约刷新）
          // 同槽换装已由 LPC 自动卸旧再装；以下两条仅作极旧服务端回退提示
          if (/已经穿戴了同类型的护具/.test(chunk)) {
            showToast("同类型护具更换失败");
            scheduleEquipRefresh();
          } else if (/必须先放下你目前装备的武器/.test(chunk)) {
            showToast("更换武器失败");
            scheduleEquipRefresh();
          } else if (
            /穿上|戴上|绑在腰间|装备.+作武器|装备著|装备着|你装备/.test(chunk) &&
            /你/.test(chunk)
          ) {
            if (/已经装备/.test(chunk)) {
              showToast("已经装备着了");
              scheduleEquipRefresh();
            } else if (/作武器/.test(chunk)) {
              showToast("已装备武器");
              scheduleEquipRefresh();
            } else if (/穿上|戴上|绑在腰间|装备/.test(chunk)) {
              showToast("已穿戴");
              scheduleEquipRefresh();
            }
          } else if (/将.+脱了下来|卸除.+的装备|放下手中的|从伤口处拆了下来/.test(chunk)) {
            showToast(/放下手中的/.test(chunk) ? "已收起武器" : "已脱下");
            scheduleEquipRefresh();
          } else if (/并没有装备这样东西作为武器/.test(chunk)) {
            showToast("这不是手中的武器");
            scheduleEquipRefresh();
          } else if (/并没有装备这样东西/.test(chunk)) {
            showToast("目前没有穿戴此物");
            scheduleEquipRefresh();
          } else if (/身上没有这样东西/.test(chunk)) {
            showToast("行囊里没有此物");
            scheduleEquipRefresh();
          } else if (/这里不是你能睡的地方/.test(chunk)) {
            showToast("这里不能睡觉");
          } else if (/战斗中不能睡觉|正忙着/.test(chunk) && /睡/.test(recent.slice(-200))) {
            showToast("现在还不能睡觉");
          } else if (/你往床上一躺|进入了梦乡|倒在床上/.test(chunk)) {
            showToast("已入睡");
          } else if (/档案储存完毕/.test(chunk)) {
            showToast("已存档");
          } else if (/储存失败|不能储存/.test(chunk)) {
            showToast("存档失败");
          } else if (/不能退出游戏/.test(chunk)) {
            quittingRef.current = false;
            showToast("现在不能退出");
          } else if (/开始退出游戏|游戏退出进程已经启动/.test(chunk)) {
            showToast("正在退出…");
          }
        }
      }
    });
    const offStatus = socket.current.onStatus((status, detail) => {
      if (status === "error") {
        setLoginError(detail || "无法连接网关");
      }
    });
    return () => {
      offMsg();
      offStatus();
    };
  }, [
    addLog,
    appendDocText,
    showToast,
    enterGame,
    cmd,
    scheduleEquipRefresh,
    scheduleRoomRefresh,
    scheduleCombatHpRefresh,
  ]);

  const login = useCallback(
    (opts: {
      id: string;
      password: string;
      name?: string;
      gender?: string;
      register?: boolean;
    }) => {
      setLoginError("");
      enteredGame.current = false;
      roomFromEvent.current = false;
      textBuf.current = "";
      finishDocCapture();
      socket.current.login(opts);
      setState((s) => ({
        ...s,
        playerName: opts.name || opts.id,
        inGame: false,
        docText: "",
        docLoading: false,
        docTarget: null,
      }));
    },
    [finishDocCapture]
  );

  const openSheet = useCallback((sheet: SheetKind) => {
    setState((s) => ({ ...s, sheet }));
  }, []);

  const closeSheet = useCallback(() => {
    finishDocCapture();
    setState((s) => ({
      ...s,
      sheet: null,
      docText: "",
      docLoading: false,
      docTarget: null,
    }));
    setSelectedExit(null);
    setSelectedEntity(null);
  }, [finishDocCapture]);

  const refreshCharacter = useCallback(() => {
    expectLookMe.current = true;
    window.setTimeout(() => {
      expectLookMe.current = false;
    }, 4000);
    cmd("look me", { silent: true });
    cmd("hp", { silent: true });
    cmd("score", { silent: true });
    cmd("skills", { silent: true });
    cmd("webclient skills", { silent: true });
    cmd("enable", { silent: true });
    cmd("prepare", { silent: true });
    cmd("inventory", { silent: true });
    cmd("wimpy", { silent: true });
  }, [cmd]);

  const setWimpy = useCallback(
    (pct: number) => {
      const n = Math.min(80, Math.max(0, Math.round(pct)));
      setState((s) => ({ ...s, wimpyPct: n }));
      showToast(
        n > 0
          ? `遇险撤退：气血低于 ${n}% 时逃离`
          : "已关闭遇险撤退"
      );
      expectWimpySet.current = true;
      window.setTimeout(() => {
        expectWimpySet.current = false;
      }, 3000);
      cmd(`wimpy ${n}`, { silent: true });
    },
    [cmd, showToast]
  );

  const onOpenCharacter = useCallback(() => {
    clearDoc();
    openSheet("character");
    refreshCharacter();
  }, [clearDoc, openSheet, refreshCharacter]);

  const onOpenHelp = useCallback(() => {
    finishDocCapture();
    setState((s) => ({
      ...s,
      sheet: "help",
      docText: "",
      docLoading: false,
      docTarget: null,
    }));
  }, [finishDocCapture]);

  const onHelpTopic = useCallback(
    (topicId: string) => {
      docCmd(topicId ? `help ${topicId}` : "help", "help");
    },
    [docCmd]
  );

  const onBackToHelpTopics = useCallback(() => {
    clearDoc();
    openSheet("help");
  }, [clearDoc, openSheet]);

  useEffect(() => {
    return () => {
      /* placeholder for future message bridge */
    };
  }, []);

  // e2e / 调试：允许 page.evaluate 发静默指令（如 xkxe2e grantleave）
  useEffect(() => {
    const w = window as unknown as { __xkxCmd?: (c: string) => void };
    w.__xkxCmd = (c: string) => cmd(c, { silent: true });
    return () => {
      delete w.__xkxCmd;
    };
  }, [cmd]);

  /*
   * 进游戏后定时静默刷新场景：LPC 里动态改 exits/物品却漏掉 notify_room 时，
   * Web 出口/人物/物品仍能在数秒内跟上（如召船、开门、刷怪）。
   * 用 webclient 而非 look，避免见闻刷屏与指令洪水。
   */
  useEffect(() => {
    if (!state.inGame || !state.connected) {
      if (scenePollTimer.current) {
        clearInterval(scenePollTimer.current);
        scenePollTimer.current = null;
      }
      return;
    }
    const poll = () => {
      if (typeof document !== "undefined" && document.visibilityState === "hidden")
        return;
      socket.current.cmd("webclient");
    };
    scenePollTimer.current = setInterval(poll, SCENE_POLL_MS);
    return () => {
      if (scenePollTimer.current) {
        clearInterval(scenePollTimer.current);
        scenePollTimer.current = null;
      }
    };
  }, [state.inGame, state.connected]);

  const confirmGo = useCallback(
    (dir: string) => {
      roomFromEvent.current = false;
      setState((s) => ({ ...s, suggestedActions: [] }));
      // 走动不在见闻回显「> go north」——场景标题/描写已能感知换房
      cmd(`go ${dir}`, { silent: true });
      closeSheet();
    },
    [cmd, closeSheet]
  );

  const startAssist = useCallback((config: AssistConfig) => {
    socket.current.assist(config);
    // 等服务端 assist.status 确认再标「进行中」，避免失败时卡在「挂机中…」。
    setState((s) => ({
      ...s,
      assistActive: false,
      assistStatus:
        config.mode === "study"
          ? "正在启动石壁领悟…"
          : config.mode === "grind"
            ? "正在启动挂机…"
            : "启动中…",
    }));
  }, []);

  const quit = useCallback(() => {
    quittingRef.current = true;
    cmd("quit", { silent: true });
    showToast("正在退出…");
  }, [cmd, showToast]);

  const stopAssist = useCallback(() => {
    socket.current.assist({ action: "stop" });
    cmd("halt");
    setState((s) => ({ ...s, assistActive: false, assistStatus: "已停止" }));
  }, [cmd]);

  const halt = useCallback(() => {
    cmd("halt");
  }, [cmd]);

  return {
    state,
    toast,
    loginError,
    charTab,
    setCharTab,
    selectedExit,
    setSelectedExit,
    selectedEntity,
    setSelectedEntity,
    guideTip,
    dismissGuideTip,
    login,
    cmd,
    quit,
    docCmd,
    clearDoc,
    openSheet,
    closeSheet,
    onOpenCharacter,
    onOpenHelp,
    onHelpTopic,
    onBackToHelpTopics,
    confirmGo,
    startAssist,
    stopAssist,
    halt,
    showToast,
    refreshCharacter,
    setWimpy,
  };
}

const EXIT_HINT = /明显的出口|唯一的出口|没有任何明显的出路/;
const ROOM_TITLE_HINT = /^.+?\s*-\s*$/m;
