import { useCallback, useRef, useState } from "react";
import { DesktopApp } from "./components/desktop/DesktopApp";
import { LoginPage } from "./components/LoginPage";
import { MobileApp } from "./components/MobileApp";
import { useGame } from "./hooks/useGame";
import { resolveUiMode, writeUiMode, type UiMode } from "./lib/uiMode";

export default function App() {
  const rawSinkRef = useRef<((raw: string) => void) | null>(null);
  const onRawText = useCallback((raw: string) => {
    rawSinkRef.current?.(raw);
  }, []);
  const g = useGame({ onRawText });
  const [mode, setMode] = useState<UiMode>(() => resolveUiMode());

  const onModeChange = useCallback((m: UiMode) => {
    writeUiMode(m);
    setMode(m);
  }, []);

  if (!g.state.inGame) {
    return (
      <LoginPage onLogin={g.login} error={g.loginError || undefined} />
    );
  }

  if (mode === "desktop") {
    return (
      <DesktopApp
        game={g}
        rawSinkRef={rawSinkRef}
        mode={mode}
        onModeChange={onModeChange}
      />
    );
  }

  return (
    <MobileApp game={g} mode={mode} onModeChange={onModeChange} />
  );
}
