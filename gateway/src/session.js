import net from "net";
import { EventEmitter } from "events";
import { stripAnsi, ansiToHtml } from "./ansi.js";
import { LoginFsm } from "./loginFsm.js";
import { stripTelnet } from "./telnet.js";

const LOGIN_ERROR_RE =
  /密码错误|英文名字必须是|英文名字只能用|使用者已经太多|不受欢迎|有人也在创造这个人物|不欢迎你创造|储存挡出了一些问题|已经自杀了|找不到这个|请从登记的地址|限制巫师等级|无法进行复制|两次输入的密码并不一样|密码的长度至少/;

function extractLoginError(text) {
  if (!LOGIN_ERROR_RE.test(text)) return null;
  const lines = text.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  for (const line of lines) {
    if (LOGIN_ERROR_RE.test(line)) return line;
  }
  return "登录失败";
}

/** Strip @@JSON@@...@@ENDJSON@@ frames from text shown in 见闻. Incomplete frame: cut from marker. */
export function stripJsonFrames(text) {
  if (!text || !text.includes("@@JSON@@")) return text || "";
  let out = "";
  let rest = text;
  while (true) {
    const start = rest.indexOf("@@JSON@@");
    if (start === -1) {
      out += rest;
      break;
    }
    out += rest.slice(0, start);
    const end = rest.indexOf("@@ENDJSON@@", start);
    if (end === -1) break;
    rest = rest.slice(end + "@@ENDJSON@@".length);
  }
  return out;
}

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
    this.markedWeb = false;
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
    // Cap retained buffers — unbounded growth OOMs the gateway under load
    this.rawBuffer = (this.rawBuffer + chunkText).slice(-65536);
    const plain = stripAnsi(chunkText);
    this.buffer = (this.buffer + plain).slice(-65536);

    const wasInGame = this.loginFsm.isInGame();
    if (!wasInGame) {
      const auto = this.loginFsm.onOutput(plain);
      if (auto) this.sendRaw(auto);
    }
    const nowInGame = this.loginFsm.isInGame();

    if (!wasInGame && nowInGame) {
      this.emit("ready");
      // Mark web_client ASAP so the client's follow-up look gets room.update
      if (!this.markedWeb) {
        this.markedWeb = true;
        this.send("webassist stop");
        // Re-look after mark so starter rooms emit room.update (first look may race)
        setTimeout(() => {
          if (!this.closed) this.send("look");
        }, 500);
      }
    }

    if (nowInGame) {
      this.extractJsonEvents(chunkText);
      const forLog = stripJsonFrames(plain);
      if (forLog.trim()) {
        const rawForLog = stripJsonFrames(chunkText);
        const htmlLines = rawForLog
          .split("\n")
          .map((line) => ansiToHtml(line));
        this.emit("text", { text: forLog, htmlLines, raw: chunkText });
      }
    } else {
      // Suppress welcome/BIG5 banners; surface login failures to the UI
      const err = extractLoginError(plain);
      if (err) this.emit("login_error", err);
    }
  }

  extractJsonEvents(chunk) {
    this.jsonBuffer += chunk;
    if (this.jsonBuffer.length > 200000) {
      this.jsonBuffer = this.jsonBuffer.slice(-100000);
    }
    let plain = stripAnsi(this.jsonBuffer);
    let start;
    while ((start = plain.indexOf("@@JSON@@")) !== -1) {
      const end = plain.indexOf("@@ENDJSON@@", start);
      if (end === -1) {
        // Keep a tail so a marker split across chunks can still complete
        this.jsonBuffer = this.jsonBuffer.slice(-8000);
        return;
      }
      const payload = plain.slice(start + 8, end).trim();
      try {
        const event = JSON.parse(payload);
        this.emit("event", event);
      } catch {
        /* ignore malformed */
      }
      // Advance past this frame — must update plain or we loop forever on one JSON
      plain = plain.slice(end + 11);
    }
    this.jsonBuffer = plain.includes("@@JSON@@")
      ? plain
      : plain.slice(-2000);
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
