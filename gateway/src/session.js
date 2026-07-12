import net from "net";
import { EventEmitter } from "events";
import { stripAnsi, ansiToHtml } from "./ansi.js";
import { LoginFsm } from "./loginFsm.js";

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

      this.socket.setEncoding("utf8");
      this.socket.on("data", (chunk) => this.handleData(chunk));
      this.socket.on("error", (err) => {
        this.emit("error", err);
        reject(err);
      });
      this.socket.on("close", () => {
        this.closed = true;
        this.emit("close");
      });
    });
  }

  handleData(chunk) {
    this.lastActivity = Date.now();
    this.rawBuffer += chunk;
    this.buffer += stripAnsi(chunk);

    const html = ansiToHtml(chunk);
    this.emit("text", { text: stripAnsi(chunk), html, raw: chunk });

    this.extractJsonEvents(chunk);

    if (!this.loginFsm.isInGame()) {
      const auto = this.loginFsm.onOutput(this.buffer);
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
    if (this.closed || !this.socket) return false;
    const line = command.endsWith("\n") ? command : `${command}\n`;
    this.socket.write(line);
    this.lastActivity = Date.now();
    return true;
  }

  sendRaw(data) {
    if (this.closed || !this.socket) return false;
    this.socket.write(data);
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
