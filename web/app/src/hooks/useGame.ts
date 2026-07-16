import { useCallback, useEffect, useRef, useState } from "react";
import {
  beachGreeterActions,
  buildScoreHtml,
  extractLookBlock,
  isCombatLine,
  isLoginNoise,
  isProtocolNoise,
  isSelfLookLine,
  isSheetDumpLine,
  isTrainLine,
  mergeSuggestedActions,
  parseHp,
  parseInventory,
  parseRoom,
  parseScore,
  parseSkills,
  parseSuggestedActions,
  parseBoardReadActions,
  reflowSoftWrappedEntries,
  stripScoreBanner,
  waterfallPassageActions,
} from "../lib/parser";
import { applyEvent } from "../lib/protocol";
import type {
  AssistConfig,
  GameState,
  LogEntry,
  MudEvent,
  SheetKind,
} from "../lib/types";
import { GameSocket } from "../lib/ws";

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
  combatLog: [],
  trainLog: [],
  assistActive: false,
  assistStatus: "",
  sheet: null,
});

let logId = 0;

export function useGame() {
  const socket = useRef(new GameSocket());
  const textBuf = useRef("");
  const roomFromEvent = useRef(false);
  const enteredGame = useRef(false);
  /** Suppress look-me narrative from 见闻 while capturing 仪容. */
  const expectLookMe = useRef(false);
  const [state, setState] = useState<GameState>(initialState);
  const [toast, setToast] = useState("");
  const [loginError, setLoginError] = useState("");
  const [selectedExit, setSelectedExit] = useState<{
    dir: string;
    name?: string;
  } | null>(null);
  const [selectedEntity, setSelectedEntity] = useState<{
    id: string;
    name: string;
    kind: "npc" | "item";
  } | null>(null);
  const [charTab, setCharTab] = useState(0);

  const showToast = useCallback((msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(""), 2200);
  }, []);

  const addLog = useCallback((
    text: string,
    kind?: LogEntry["kind"],
    html?: string
  ) => {
    if (!text.trim()) return;
    if (isLoginNoise(text) || isProtocolNoise(text) || isSheetDumpLine(text, text))
      return;
    setState((s) => ({
      ...s,
      logs: [
        ...s.logs.slice(-80),
        { id: ++logId, text, html, kind: kind || "normal" },
      ],
    }));
  }, []);

  const cmd = useCallback(
    (command: string, opts?: { silent?: boolean }) => {
      const verb = command.trim().split(/\s+/)[0]?.toLowerCase();
      // follow/enter 会换房：清掉旧建议动作，并允许文本 look 回退更新标题
      if (verb === "follow" || verb === "enter" || verb === "register") {
        roomFromEvent.current = false;
        setState((s) => ({ ...s, suggestedActions: [] }));
      }
      socket.current.cmd(command);
      if (!opts?.silent) addLog(`> ${command}`, "sys");
      // 张三传送约 5s；补一次 look，避免 room.update 迟到时标题仍停在沙滩
      if (verb === "follow") {
        window.setTimeout(() => {
          roomFromEvent.current = false;
          socket.current.cmd("look");
        }, 5500);
      }
    },
    [addLog]
  );

  const enterGame = useCallback((clearBuf = true) => {
    if (enteredGame.current) return;
    enteredGame.current = true;
    // ready 先于首包 text：可清空。text 回退路径已 append，勿清以免丢掉 look。
    if (clearBuf) textBuf.current = "";
    roomFromEvent.current = false;
    setState((s) => ({ ...s, inGame: true }));
    // Gateway already marks web on ready; refresh look after mark takes effect
    setTimeout(() => {
      socket.current.cmd("look");
      socket.current.cmd("hp");
    }, 350);
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
        setState((s) => ({ ...s, connected: false, inGame: false }));
        showToast("与服务器断开");
        return;
      }
      if (msg.type === "ready") {
        enterGame(true);
        return;
      }
      if (msg.type === "event" && msg.event) {
        const ev = msg.event as MudEvent;
        if (ev.type === "room.update") roomFromEvent.current = true;
        setState((s) => {
          const applied = applyEvent(ev, s);
          const roomChanged =
            ev.type === "room.update" &&
            !!applied.room.title &&
            applied.room.title !== s.room.title;
          const greeter = [
            ...beachGreeterActions(applied.room.title, applied.room.npcs),
            ...waterfallPassageActions(applied.room.title),
          ];
          return {
            ...s,
            ...applied,
            inGame: true,
            suggestedActions: roomChanged
              ? greeter
              : mergeSuggestedActions(
                  s.suggestedActions,
                  greeter,
                  applied.room.npcs
                ),
          };
        });
        if (!enteredGame.current) enterGame(false);
        return;
      }
      if (msg.type === "text" && msg.text) {
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
          const looksLikeSelfLook =
            /你看起来|你身上带[着著]|看起来约.+[岁歲]/.test(chunk) &&
            !/打听有关|向.+打听/.test(chunk);
          if (lookFailed) {
            // keep waiting for a real look-me reply
          } else if (looksLikeSelfLook) {
            expectLookMe.current = false;
            suppressSelfLook = true;
            const lookPlain = lines
              .filter((l) => {
                const t = l.trim();
                if (!t) return false;
                if (isSheetDumpLine(t, chunk)) return false;
                return true;
              })
              .join("\n");
            const lookHtml = (msg.htmlLines || [])
              .filter((h, i) => {
                const plain =
                  (lines[i] ?? "").trim() || h.replace(/<[^>]+>/g, "").trim();
                if (!plain) return false;
                if (isSheetDumpLine(plain, chunk)) return false;
                return true;
              })
              .join("\n");
            if (lookPlain.trim()) {
              setState((s) => ({
                ...s,
                lookText: lookPlain,
                lookHtml: lookHtml || s.lookHtml,
              }));
            }
          }
        }

        const pendingLog: { text: string; html?: string }[] = [];
        for (const [index, line] of lines.entries()) {
          const html = msg.htmlLines?.[index];
          if (!line.trim()) continue;
          if (line.length < 2) continue;
          if (/^>{0,1}\s*$/.test(line)) continue;
          if (isLoginNoise(line) || isProtocolNoise(line)) continue;
          if (isSheetDumpLine(line, chunk)) continue;
          // 仪容分片到达时也挡掉；NPC 打听等不会命中 isSelfLookLine
          if ((suppressSelfLook || expectLookMe.current) && isSelfLookLine(line))
            continue;
          if (isCombatLine(line)) {
            setState((s) => ({
              ...s,
              combatLog: [...s.combatLog.slice(-40), line],
            }));
          } else if (isTrainLine(line)) {
            setState((s) => ({
              ...s,
              trainLog: [...s.trainLog.slice(-40), line],
            }));
          }
          pendingLog.push({ text: line, html });
        }
        // Join author/driver soft-wraps so 见闻 does not break mid-sentence
        // (also keeps colored HTML spans continuous after gateway color-carry).
        for (const entry of reflowSoftWrappedEntries(pendingLog)) {
          addLog(entry.text, undefined, entry.html);
        }

        const hinted = [
          ...parseSuggestedActions(chunk),
          ...parseBoardReadActions(chunk),
        ];
        if (hinted.length) {
          setState((s) => ({
            ...s,
            suggestedActions: mergeSuggestedActions(
              s.suggestedActions,
              hinted,
              s.room.npcs
            ),
          }));
        }

        if (
          EXIT_HINT.test(chunk) ||
          /这里(?:有|摆着)/.test(chunk) ||
          ROOM_TITLE_HINT.test(chunk)
        ) {
          // Structured room.update wins over text fallback
          if (!roomFromEvent.current) {
            const room = parseRoom(extractLookBlock(textBuf.current));
            setState((s) => {
              const roomChanged =
                !!room.title && room.title !== s.room.title;
              const parsedLook = EXIT_HINT.test(chunk) || roomChanged;
              const npcs = room.npcs || s.room.npcs;
              const greeter = [
                ...beachGreeterActions(room.title, npcs),
                ...waterfallPassageActions(room.title),
              ];
              const fromText = roomChanged
                ? parseSuggestedActions(chunk, npcs)
                : hinted;
              return {
                ...s,
                room: {
                  ...s.room,
                  ...room,
                  exits: parsedLook
                    ? room.exits ?? []
                    : room.exits?.length
                      ? room.exits
                      : s.room.exits,
                },
                suggestedActions: roomChanged
                  ? mergeSuggestedActions(fromText, greeter, npcs)
                  : mergeSuggestedActions(
                      s.suggestedActions,
                      [...fromText, ...greeter],
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

        if (/个人档案|膂力|悟性|根骨|身法/.test(chunk)) {
          const scoreText = stripScoreBanner(chunk);
          const scoreHtml = buildScoreHtml(chunk, msg.htmlLines);
          const score = parseScore(chunk);
          setState((s) => ({
            ...s,
            scoreText: scoreText.trim() ? scoreText : s.scoreText,
            scoreHtml: scoreHtml.trim() ? scoreHtml : s.scoreHtml,
            score:
              score.bio || score.attrs || score.exp != null || score.headline
                ? score
                : s.score,
          }));
        }
        if (/所学过的|武功|技能/.test(chunk) || /初学乍练|粗通皮毛/.test(chunk)) {
          const skills = parseSkills(textBuf.current.slice(-4000));
          if (skills.length) setState((s) => ({ ...s, skills }));
        }
        if (/目前身上|携带|物品/.test(chunk)) {
          const inventory = parseInventory(textBuf.current.slice(-4000));
          if (inventory.length) setState((s) => ({ ...s, inventory }));
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
  }, [addLog, showToast, enterGame]);

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
      socket.current.login(opts);
      setState((s) => ({ ...s, playerName: opts.name || opts.id, inGame: false }));
    },
    []
  );

  const openSheet = useCallback((sheet: SheetKind) => {
    setState((s) => ({ ...s, sheet }));
  }, []);

  const closeSheet = useCallback(() => {
    setState((s) => ({ ...s, sheet: null }));
    setSelectedExit(null);
    setSelectedEntity(null);
  }, []);

  const refreshCharacter = useCallback(() => {
    expectLookMe.current = true;
    window.setTimeout(() => {
      expectLookMe.current = false;
    }, 4000);
    cmd("look me", { silent: true });
    cmd("hp", { silent: true });
    cmd("score", { silent: true });
    cmd("skills", { silent: true });
    cmd("inventory", { silent: true });
  }, [cmd]);

  const onOpenCharacter = useCallback(() => {
    openSheet("character");
    refreshCharacter();
  }, [openSheet, refreshCharacter]);

  useEffect(() => {
    return () => {
      /* placeholder for future message bridge */
    };
  }, []);

  const confirmGo = useCallback(
    (dir: string) => {
      roomFromEvent.current = false;
      setState((s) => ({ ...s, suggestedActions: [] }));
      cmd(`go ${dir}`);
      closeSheet();
    },
    [cmd, closeSheet]
  );

  const startAssist = useCallback(
    (config: AssistConfig) => {
      socket.current.assist(config);
      setState((s) => ({ ...s, assistActive: true, assistStatus: "进行中…" }));
      showToast("挂机助手已启动");
    },
    [showToast]
  );

  const stopAssist = useCallback(() => {
    socket.current.assist({ action: "stop" });
    cmd("halt");
    setState((s) => ({ ...s, assistActive: false, assistStatus: "已停止" }));
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
    login,
    cmd,
    openSheet,
    closeSheet,
    onOpenCharacter,
    confirmGo,
    startAssist,
    stopAssist,
    showToast,
    refreshCharacter,
  };
}

const EXIT_HINT = /明显的出口|唯一的出口|没有任何明显的出路/;
const ROOM_TITLE_HINT = /^.+?\s*-\s*$/m;
