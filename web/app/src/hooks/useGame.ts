import { useCallback, useEffect, useRef, useState } from "react";
import { GUIDE_STEPS } from "../data/maps";
import {
  extractLookBlock,
  isCombatLine,
  isLoginNoise,
  isTrainLine,
  mergeSuggestedActions,
  parseHp,
  parseInventory,
  parseRoom,
  parseSkills,
  parseSuggestedActions,
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
  scoreText: "",
  skills: [],
  inventory: [],
  enabled: {},
  combatLog: [],
  trainLog: [],
  assistActive: false,
  assistStatus: "",
  sheet: null,
  guideStep: 0,
});

let logId = 0;

export function useGame() {
  const socket = useRef(new GameSocket());
  const textBuf = useRef("");
  const roomFromEvent = useRef(false);
  const enteredGame = useRef(false);
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

  const addLog = useCallback((text: string, kind?: LogEntry["kind"]) => {
    if (!text.trim()) return;
    if (isLoginNoise(text)) return;
    setState((s) => ({
      ...s,
      logs: [...s.logs.slice(-80), { id: ++logId, text, kind: kind || "normal" }],
    }));
  }, []);

  const cmd = useCallback(
    (command: string) => {
      socket.current.cmd(command);
      addLog(`> ${command}`, "sys");
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
          return {
            ...s,
            ...applied,
            inGame: true,
            suggestedActions: roomChanged
              ? []
              : mergeSuggestedActions(
                  s.suggestedActions,
                  [],
                  applied.room.npcs
                ),
          };
        });
        if (!enteredGame.current) enterGame(false);
        return;
      }
      if (msg.type === "text" && msg.text) {
        const chunk = msg.text;
        textBuf.current += chunk;

        // Fallback if gateway did not emit ready (older build)
        if (!enteredGame.current && /目前权限|重新连线回到这个世界/.test(textBuf.current)) {
          enterGame(false);
        }

        if (!enteredGame.current) return;

        const lines = chunk.split("\n").filter((l) => l.trim());
        for (const line of lines) {
          if (line.length < 2) continue;
          if (/^>{0,1}\s*$/.test(line)) continue;
          if (isLoginNoise(line)) continue;
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
          addLog(line);
        }

        const hinted = parseSuggestedActions(chunk);
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
              return {
                ...s,
                room: {
                  ...s.room,
                  ...room,
                  exits: room.exits?.length ? room.exits : s.room.exits,
                },
                suggestedActions: roomChanged
                  ? parseSuggestedActions(chunk, room.npcs || s.room.npcs)
                  : mergeSuggestedActions(
                      s.suggestedActions,
                      hinted,
                      room.npcs || s.room.npcs
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
          setState((s) => ({ ...s, scoreText: chunk }));
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
    cmd("look me");
    cmd("hp");
    cmd("score");
    cmd("skills");
    cmd("inventory");
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
      if (state.guideStep === 2) {
        setState((s) => ({ ...s, guideStep: 3 }));
      }
    },
    [cmd, closeSheet, state.guideStep]
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

  const advanceGuide = useCallback(() => {
    setState((s) => ({
      ...s,
      guideStep: Math.min(s.guideStep + 1, GUIDE_STEPS.length - 1),
    }));
  }, []);

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
    advanceGuide,
    refreshCharacter,
  };
}

const EXIT_HINT = /明显的出口|唯一的出口|没有任何明显的出路/;
const ROOM_TITLE_HINT = /^.+?\s*-\s*$/m;
