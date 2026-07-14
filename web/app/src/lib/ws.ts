type Handler = (msg: WsMessage) => void;
type StatusHandler = (status: "connecting" | "open" | "error" | "closed", detail?: string) => void;

export interface WsMessage {
  type: string;
  text?: string;
  html?: string;
  event?: Record<string, unknown>;
  message?: string;
  sessionId?: string;
}

export class GameSocket {
  private ws: WebSocket | null = null;
  private handlers = new Set<Handler>();
  private statusHandlers = new Set<StatusHandler>();
  private url: string;

  constructor(url?: string) {
    if (url) {
      this.url = url;
      return;
    }
    if (import.meta.env.DEV && location.port === "5180") {
      this.url = `ws://${location.hostname}:3001/ws`;
      return;
    }
    const proto = location.protocol === "https:" ? "wss:" : "ws:";
    this.url = `${proto}//${location.host}/ws`;
  }

  connect() {
    if (this.ws?.readyState === WebSocket.OPEN) return;
    if (this.ws?.readyState === WebSocket.CONNECTING) return;
    this.emitStatus("connecting");
    this.ws = new WebSocket(this.url);
    this.ws.onopen = () => this.emitStatus("open");
    this.ws.onerror = () => this.emitStatus("error", "无法连接网关（请确认 gateway 已启动 :3001）");
    this.ws.onclose = () => this.emitStatus("closed");
    this.ws.onmessage = (ev) => {
      try {
        const msg = JSON.parse(ev.data) as WsMessage;
        this.handlers.forEach((h) => h(msg));
      } catch {
        /* ignore */
      }
    };
  }

  on(handler: Handler) {
    this.handlers.add(handler);
    return () => {
      this.handlers.delete(handler);
    };
  }

  onStatus(handler: StatusHandler) {
    this.statusHandlers.add(handler);
    return () => {
      this.statusHandlers.delete(handler);
    };
  }

  private emitStatus(status: "connecting" | "open" | "error" | "closed", detail?: string) {
    this.statusHandlers.forEach((h) => h(status, detail));
  }

  send(data: unknown) {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(data));
    }
  }

  login(opts: {
    id: string;
    password: string;
    name?: string;
    gender?: string;
    register?: boolean;
  }) {
    this.connect();
    const trySend = () => {
      if (this.ws?.readyState === WebSocket.OPEN) {
        this.send({ type: "login", ...opts });
      } else {
        this.ws!.onopen = () => this.send({ type: "login", ...opts });
      }
    };
    trySend();
  }

  cmd(command: string) {
    this.send({ type: "cmd", command });
  }

  assist(config: unknown) {
    this.send({ type: "assist", config });
  }

  close() {
    this.ws?.close();
    this.ws = null;
  }
}
