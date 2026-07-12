type Handler = (msg: WsMessage) => void;

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
  private url: string;

  constructor(url?: string) {
    const proto = location.protocol === "https:" ? "wss:" : "ws:";
    this.url = url || `${proto}//${location.hostname}:3001/ws`;
    if (import.meta.env.DEV && location.port === "5180") {
      this.url = `ws://${location.hostname}:3001/ws`;
    }
  }

  connect() {
    if (this.ws?.readyState === WebSocket.OPEN) return;
    this.ws = new WebSocket(this.url);
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
