import net from "net";
import { EventEmitter } from "events";
import { stripAnsi, ansiToHtml } from "./ansi.js";
import { LoginFsm } from "./loginFsm.js";
import { stripTelnet } from "./telnet.js";

export class MudSession extends EventEmitter {
  constructor(id, config, credentials) {
    super();
    this.id = id;
    this.config = config;
    this.credentials = credentials;
    this.socket = null;
    this.buffer = "";
    this.rawBuffer = "";
    this.closed = false;
    this.loginFsm = new LoginFsm(credentials);
    this.lastActivity = Date.now();
    this.jsonBuffer = "";
  }

  connect() {
    return new Promise((resolve, reject) => {
      this.socket = net.createConnection(
        { host: this.config.mudHost, port: this.config.mudPort },
        () => {
          this.emit("connected");
          resolve();
        }
      );

      // Keep binary until telnet IAC is stripped
      this.socket.on("data", (chunk) => this.handleData(chunk));
      this.socket.on("error", (err) => {
        // EPIPE/ECONNRESET：对端已关，避免刷屏；登录阶段仍通知前端
        if (err.code === "EPIPE" || err.code === "ECONNRESET") {
          this.closed = true;
          this.emit("close");
          return;
        }
        this.emit("error", err);
        reject(err);
      });
      this.socket.on("close", () => {
        this.closed = true;
        this.emit("close");
      });
    });
  }

  writeSafe(data, encoding) {
    if (this.closed || !this.socket || this.socket.destroyed) return false;
    try {
      return this.socket.write(data, encoding);
    } catch {
      return false;
    }
  }

  handleData(chunk) {
    this.lastActivity = Date.now();
    const buf = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk, "binary");
    const { text: cleanBuf, replies } = stripTelnet(buf);
    for (const r of replies) {
      this.writeSafe(r);
    }
    if (cleanBuf.length === 0) return;

    const chunkText = cleanBuf.toString("utf8");
    this.rawBuffer += chunkText;
    this.buffer += stripAnsi(chunkText);

    const html = ansiToHtml(chunkText);
    this.emit("text", { text: stripAnsi(chunkText), html, raw: chunkText });

    this.extractJsonEvents(chunkText);

    if (!this.loginFsm.isInGame()) {
      const auto = this.loginFsm.onOutput(stripAnsi(chunkText));
      if (auto) this.sendRaw(auto);
    }
  }

  extractJsonEvents(chunk) {
    this.jsonBuffer += chunk;
    const plain = stripAnsi(this.jsonBuffer);
    let start;
    while ((start = plain.indexOf("@@JSON@@")) !== -1) {
      const end = plain.indexOf("@@ENDJSON@@", start);
      if (end === -1) break;
      const payload = plain.slice(start + 8, end).trim();
      try {
        const event = JSON.parse(payload);
        this.emit("event", event);
      } catch {
        /* ignore malformed */
      }
      this.jsonBuffer = plain.slice(end + 11);
    }
  }

  send(command) {
    const line = command.endsWith("\n") ? command : `${command}\n`;
    if (!this.writeSafe(line, "utf8")) return false;
    this.lastActivity = Date.now();
    return true;
  }

  sendRaw(data) {
    if (!this.writeSafe(data, "utf8")) return false;
    this.lastActivity = Date.now();
    return true;
  }

  close() {
    if (this.socket && !this.closed) {
      this.socket.end();
      this.closed = true;
    }
  }
}
