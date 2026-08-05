import { useEffect, useRef } from "react";
import { useDesktop } from "../../context/DesktopContext";
import { CommandInput } from "./CommandInput";

type XtermTerminal = {
  write: (data: string, callback?: () => void) => void;
  clear: () => void;
  dispose: () => void;
};

/**
 * 桌面终端。xterm（约 400KB min）通过动态 import 懒加载：
 * 移动端与 e2e 首屏不再下载终端代码，主包变小、页面加载显著提速。
 * 终端就绪前的写入先缓冲，就绪后一次性 flush，避免首屏输出丢失。
 */
export function TerminalPane() {
  const hostRef = useRef<HTMLDivElement>(null);
  const { registerTermWriter, registerClear } = useDesktop();

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;
    let disposed = false;
    const pending: string[] = [];
    let term: XtermTerminal | null = null;

    // 终端就绪前先缓冲；就绪后直接写
    registerTermWriter((raw) => {
      if (term) term.write(raw.replace(/\n/g, "\r\n"));
      else pending.push(raw);
    });
    registerClear(() => {
      if (term) term.clear();
      else pending.length = 0;
    });

    Promise.all([
      import("@xterm/xterm"),
      import("@xterm/addon-fit"),
      import("@xterm/xterm/css/xterm.css"),
    ])
      .then(([{ Terminal }, { FitAddon }]) => {
        if (disposed || !host.isConnected) return;
        const t = new Terminal({
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
        t.loadAddon(fit);
        t.open(host);
        try {
          fit.fit();
        } catch {
          /* ignore */
        }

        const write = (raw: string) => {
          const buf = t.buffer.active;
          const wasAtBottom = buf.viewportY >= buf.baseY;
          t.write(raw.replace(/\n/g, "\r\n"), () => {
            if (wasAtBottom) t.scrollToBottom();
          });
        };
        for (const raw of pending) write(raw);
        pending.length = 0;
        term = {
          write,
          clear: () => t.clear(),
          dispose: () => t.dispose(),
        };

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
              t.loadAddon(new WebglAddon());
            } catch {
              /* canvas fallback */
            }
          })
          .catch(() => undefined);
      })
      .catch(() => undefined);

    return () => {
      disposed = true;
      registerTermWriter(null);
      registerClear(null);
      term?.dispose();
      term = null;
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
