import { useCallback, useEffect, useRef, useState } from "react";
import { GUIDE_STEPS } from "../data/maps";
import {
  isCombatLine,
  isTrainLine,
  parseHp,
  parseInventory,
  parseRoom,
  parseSkills,
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
  const [state, setState] = useState<GameState>(initialState);
  const [toast, setToast] = useState("");
  const [loginError, setLoginError] = useState("");
  const [selectedExit, setSelectedExit] = useState<{
    dir: string;
    name?: string;
  } | null>(null);
  const [selectedEntity, setSelectedEntity] = useState<{
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
        setState((s) => ({ ...s, connected: false, inGame: false }));
        showToast("与服务器断开");
        return;
      }
      if (msg.type === "event" && msg.event) {
        setState((s) => {
          const applied = applyEvent(msg.event as MudEvent, s);
          return { ...s, ...applied };
        });
        return;
      }
      if (msg.type === "text" && msg.text) {
        const chunk = msg.text;
        textBuf.current += chunk;

        if (/欢迎|重新连线|> $/m.test(textBuf.current)) {
          setState((s) => {
            if (!s.inGame) {
              setTimeout(() => {
                socket.current.cmd("look");
                socket.current.cmd("hp");
                socket.current.cmd("webassist stop");
              }, 300);
            }
            return { ...s, inGame: true };
          });
        }

        const lines = chunk.split("\n").filter((l) => l.trim());
        for (const line of lines) {
          if (line.length < 2) continue;
          if (/^>{0,1}\s*$/.test(line)) continue;
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

        if (/这里是| obvious|明显的出口/.test(chunk) || /这里(?:有|摆着)/.test(chunk)) {
          const room = parseRoom(textBuf.current.slice(-2000));
          setState((s) => ({
            ...s,
            room: {
              ...s.room,
              ...room,
              exits: room.exits?.length ? room.exits : s.room.exits,
            },
          }));
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
          if (skills.length)
            setState((s) => ({ ...s, skills }));
        }
        if (/目前身上|携带|物品/.test(chunk)) {
          const inventory = parseInventory(textBuf.current.slice(-4000));
          if (inventory.length)
            setState((s) => ({ ...s, inventory }));
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
  }, [addLog, showToast]);

  const login = useCallback(
    (opts: {
      id: string;
      password: string;
      name?: string;
      gender?: string;
      register?: boolean;
    }) => {
      setLoginError("");
      socket.current.login(opts);
      setState((s) => ({ ...s, playerName: opts.name || opts.id }));
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
