import { FitAddon } from "@xterm/addon-fit";
import { Terminal } from "@xterm/xterm";
import "@xterm/xterm/css/xterm.css";
import { useEffect, useRef } from "react";
import { useDesktop } from "../../context/DesktopContext";
import { CommandInput } from "./CommandInput";

export function TerminalPane() {
  const hostRef = useRef<HTMLDivElement>(null);
  const termRef = useRef<Terminal | null>(null);
  const { registerTermWriter, registerClear } = useDesktop();

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;

    const term = new Terminal({
      cols: 80,
      rows: 40,
      fontSize: 14,
      fontFamily:
        "'Sarasa Mono SC', 'Cascadia Code', 'Fira Code', ui-monospace, monospace",
      theme: {
        background: "#0c0b0a",
        foreground: "#e8dfd0",
        cursor: "#5f8f78",
        black: "#1a1a1a",
        red: "#c94b3b",
        green: "#5f8f78",
        yellow: "#c9a24b",
        blue: "#4b7fc9",
        magenta: "#a04bc9",
        cyan: "#4b9fc9",
        white: "#e8dfd0",
        brightBlack: "#3a3a3a",
        brightRed: "#e06b5b",
        brightGreen: "#8fbfa0",
        brightYellow: "#e0c070",
        brightBlue: "#6b9fe0",
        brightMagenta: "#c06be0",
        brightCyan: "#6bbfe0",
        brightWhite: "#f5efe0",
      },
      cursorBlink: true,
      disableStdin: true,
      scrollback: 5000,
      convertEol: true,
    });
    const fit = new FitAddon();
    term.loadAddon(fit);
    term.open(host);
    try {
      fit.fit();
    } catch {
      /* ignore */
    }
    termRef.current = term;

    registerTermWriter((raw) => {
      term.write(raw.replace(/\n/g, "\r\n"));
    });
    registerClear(() => term.clear());

    const onResize = () => {
      try {
        fit.fit();
      } catch {
        /* ignore */
      }
    };
    window.addEventListener("resize", onResize);
    const ro = new ResizeObserver(onResize);
    ro.observe(host);

    // Optional WebGL — fall back silently
    import("@xterm/addon-webgl")
      .then(({ WebglAddon }) => {
        try {
          term.loadAddon(new WebglAddon());
        } catch {
          /* canvas fallback */
        }
      })
      .catch(() => undefined);

    return () => {
      window.removeEventListener("resize", onResize);
      ro.disconnect();
      registerTermWriter(null);
      registerClear(null);
      term.dispose();
      termRef.current = null;
    };
  }, [registerClear, registerTermWriter]);

  return (
    <div className="desktop-center" data-testid="desktop-terminal-wrap">
      <div
        ref={hostRef}
        className="desktop-xterm"
        data-testid="desktop-terminal"
        aria-label="终端"
      />
      <CommandInput />
    </div>
  );
}
