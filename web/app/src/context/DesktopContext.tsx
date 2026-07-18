import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type MutableRefObject,
  type ReactNode,
} from "react";
import { CommandHistory } from "../lib/commandHistory";
import { RuleEngine } from "../lib/ruleEngine";
import {
  loadRulesFromStorage,
  saveRulesToStorage,
} from "../lib/ruleStorage";
import type { Rule } from "../lib/ruleTypes";
import type { useGame } from "../hooks/useGame";

export type GameApi = ReturnType<typeof useGame>;
export type RightTab = "rules" | "status";

type DesktopContextValue = {
  game: GameApi;
  engine: RuleEngine;
  rules: Rule[];
  setRules: (rules: Rule[] | ((prev: Rule[]) => Rule[])) => void;
  refreshRules: () => void;
  rightTab: RightTab;
  setRightTab: (t: RightTab) => void;
  leftWidth: number;
  rightWidth: number;
  setLeftWidth: (n: number) => void;
  setRightWidth: (n: number) => void;
  history: CommandHistory;
  writeRaw: (raw: string) => void;
  registerTermWriter: (fn: ((raw: string) => void) | null) => void;
  clearTerminal: () => void;
  registerClear: (fn: (() => void) | null) => void;
  sendCommand: (command: string, opts?: { silent?: boolean }) => void;
  emergencyStopped: boolean;
  doEmergencyStop: () => void;
  engineWarnLine: string | null;
};

const DesktopContext = createContext<DesktopContextValue | null>(null);

const LEFT_W_KEY = "xkx-desktop-left-w";
const RIGHT_W_KEY = "xkx-desktop-right-w";

function readWidth(key: string, fallback: number): number {
  try {
    const n = Number(localStorage.getItem(key));
    if (Number.isFinite(n) && n >= 180) return n;
  } catch {
    /* ignore */
  }
  return fallback;
}

export function DesktopProvider({
  game,
  rawSinkRef,
  children,
}: {
  game: GameApi;
  rawSinkRef: MutableRefObject<((raw: string) => void) | null>;
  children: ReactNode;
}) {
  const engineRef = useRef(new RuleEngine());
  const termWriterRef = useRef<((raw: string) => void) | null>(null);
  const clearRef = useRef<(() => void) | null>(null);
  const historyRef = useRef(new CommandHistory());
  const [rules, setRulesState] = useState<Rule[]>(() => loadRulesFromStorage());
  const [rightTab, setRightTab] = useState<RightTab>("rules");
  const [leftWidth, setLeftWidthState] = useState(() =>
    readWidth(LEFT_W_KEY, 220)
  );
  const [rightWidth, setRightWidthState] = useState(() =>
    readWidth(RIGHT_W_KEY, 320)
  );
  const [emergencyStopped, setEmergencyStopped] = useState(false);
  const [engineWarnLine, setEngineWarnLine] = useState<string | null>(null);

  const setLeftWidth = useCallback((n: number) => {
    const w = Math.max(180, Math.min(n, window.innerWidth * 0.4));
    setLeftWidthState(w);
    try {
      localStorage.setItem(LEFT_W_KEY, String(w));
    } catch {
      /* ignore */
    }
  }, []);

  const setRightWidth = useCallback((n: number) => {
    const w = Math.max(180, Math.min(n, window.innerWidth * 0.4));
    setRightWidthState(w);
    try {
      localStorage.setItem(RIGHT_W_KEY, String(w));
    } catch {
      /* ignore */
    }
  }, []);

  const refreshRules = useCallback(() => {
    setRulesState(engineRef.current.getRules());
  }, []);

  const setRules = useCallback(
    (next: Rule[] | ((prev: Rule[]) => Rule[])) => {
      setRulesState((prev) => {
        const list = typeof next === "function" ? next(prev) : next;
        engineRef.current.load(list);
        saveRulesToStorage(list);
        return list;
      });
      setEmergencyStopped(engineRef.current.isEmergencyStopped());
    },
    []
  );

  const sendCommand = useCallback(
    (command: string, opts?: { silent?: boolean }) => {
      const expanded = engineRef.current.processInput(command);
      if (!opts?.silent) historyRef.current.push(command);
      game.cmd(expanded, opts);
    },
    [game]
  );

  useEffect(() => {
    const engine = engineRef.current;
    engine.bind({
      send: (c) => game.cmd(c, { silent: true }),
      toast: (m) => game.showToast(m),
      warn: (m) => {
        setEngineWarnLine(m);
        termWriterRef.current?.(`\x1b[33m${m}\x1b[0m\r\n`);
      },
    });
    setEmergencyStopped(engine.isEmergencyStopped());

    const w = window as unknown as {
      __xkxRuleEngine?: RuleEngine;
      __xkxDesktopCmd?: (c: string) => void;
      __xkxClearTerminal?: () => void;
    };
    w.__xkxRuleEngine = engine;
    w.__xkxDesktopCmd = (c: string) => sendCommand(c);
    w.__xkxClearTerminal = () => clearRef.current?.();
    return () => {
      delete w.__xkxRuleEngine;
      delete w.__xkxDesktopCmd;
      delete w.__xkxClearTerminal;
    };
    // bind only; rules loaded separately / via setRules
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [game.cmd, game.showToast, sendCommand]);

  useEffect(() => {
    engineRef.current.load(rules);
    setEmergencyStopped(engineRef.current.isEmergencyStopped());
  }, []);

  const writeRaw = useCallback((raw: string) => {
    const lines = raw.split(/\r?\n/);
    for (const line of lines) {
      if (line.trim()) engineRef.current.processOutput(line);
    }
    termWriterRef.current?.(raw.endsWith("\n") ? raw : `${raw}\n`);
  }, []);

  useEffect(() => {
    rawSinkRef.current = writeRaw;
    return () => {
      rawSinkRef.current = null;
    };
  }, [rawSinkRef, writeRaw]);

  const registerTermWriter = useCallback(
    (fn: ((raw: string) => void) | null) => {
      termWriterRef.current = fn;
    },
    []
  );

  const registerClear = useCallback((fn: (() => void) | null) => {
    clearRef.current = fn;
  }, []);

  const clearTerminal = useCallback(() => {
    clearRef.current?.();
  }, []);

  const doEmergencyStop = useCallback(() => {
    engineRef.current.emergencyStopAll();
    saveRulesToStorage(engineRef.current.getRules());
    setRulesState(engineRef.current.getRules());
    setEmergencyStopped(true);
    game.showToast("规则已急停");
  }, [game]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.shiftKey && (e.key === "X" || e.key === "x")) {
        e.preventDefault();
        doEmergencyStop();
      }
      if (e.ctrlKey && !e.shiftKey && !e.altKey && (e.key === "l" || e.key === "L")) {
        const t = e.target as HTMLElement | null;
        if (t && (t.tagName === "INPUT" || t.tagName === "TEXTAREA")) return;
        // Avoid stealing browser chrome focus; only when event targets our app
        const root = document.querySelector('[data-testid="desktop-app"]');
        if (!root || !t || !root.contains(t)) return;
        e.preventDefault();
        clearTerminal();
      }
      if (e.ctrlKey && (e.key === "k" || e.key === "K")) {
        e.preventDefault();
        setRightTab("rules");
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [clearTerminal, doEmergencyStop]);

  const value = useMemo<DesktopContextValue>(
    () => ({
      game,
      engine: engineRef.current,
      rules,
      setRules,
      refreshRules,
      rightTab,
      setRightTab,
      leftWidth,
      rightWidth,
      setLeftWidth,
      setRightWidth,
      history: historyRef.current,
      writeRaw,
      registerTermWriter,
      clearTerminal,
      registerClear,
      sendCommand,
      emergencyStopped,
      doEmergencyStop,
      engineWarnLine,
    }),
    [
      game,
      rules,
      setRules,
      refreshRules,
      rightTab,
      leftWidth,
      rightWidth,
      setLeftWidth,
      setRightWidth,
      writeRaw,
      registerTermWriter,
      clearTerminal,
      registerClear,
      sendCommand,
      emergencyStopped,
      doEmergencyStop,
      engineWarnLine,
    ]
  );

  return (
    <DesktopContext.Provider value={value}>{children}</DesktopContext.Provider>
  );
}

export function useDesktop(): DesktopContextValue {
  const ctx = useContext(DesktopContext);
  if (!ctx) throw new Error("useDesktop outside DesktopProvider");
  return ctx;
}
