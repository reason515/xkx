import http from "http";
import { readFileSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";
import { WebSocketServer } from "ws";
import { MudSession } from "./session.js";
import { Metrics } from "./metrics.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const configPath = join(__dirname, "..", "config.json");
const config = JSON.parse(readFileSync(configPath, "utf8"));

const metrics = new Metrics();
const sessions = new Map();
const ipCounts = new Map();
let sessionSeq = 0;

function log(level, ...args) {
  if (level === "debug" && config.logLevel !== "debug") return;
  console.log(`[${new Date().toISOString()}] [${level}]`, ...args);
}

function getIp(req) {
  return (
    req.headers["x-forwarded-for"]?.split(",")[0]?.trim() ||
    req.socket.remoteAddress ||
    "unknown"
  );
}

function validateId(id) {
  // 与 mudlib logind.c check_legal_id 一致：3–8 位纯小写字母
  return typeof id === "string" && /^[a-z]{3,8}$/.test(id);
}

function validatePassword(pw) {
  return typeof pw === "string" && pw.length >= 4 && pw.length <= 20;
}

const server = http.createServer((req, res) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  if (req.url === "/health") {
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ ok: true, ...metrics.snapshot() }));
    return;
  }
  if (req.url === "/metrics") {
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify(metrics.snapshot()));
    return;
  }
  res.writeHead(404);
  res.end("Not found");
});

server.on("error", (err) => {
  if (err.code === "EADDRINUSE") {
    log(
      "error",
      `端口 ${config.listenPort} 已被占用。请先结束旧进程: netstat -ano | findstr :${config.listenPort}`
    );
    process.exit(1);
  }
  throw err;
});

const wss = new WebSocketServer({ server, path: "/ws" });

wss.on("connection", (ws, req) => {
  const ip = getIp(req);
  const ipCount = ipCounts.get(ip) || 0;
  if (ipCount >= config.maxConnectionsPerIp) {
    ws.close(4008, "too many connections from ip");
    return;
  }
  if (sessions.size >= config.maxConnections) {
    ws.close(4008, "server full");
    return;
  }

  ipCounts.set(ip, ipCount + 1);
  metrics.incConnections();

  const sessionId = `s${++sessionSeq}`;
  let mud = null;
  let heartbeat;

  const cleanup = () => {
    clearInterval(heartbeat);
    if (mud) {
      mud.close();
      mud = null;
    }
    sessions.delete(sessionId);
    metrics.decConnections();
    const c = (ipCounts.get(ip) || 1) - 1;
    if (c <= 0) ipCounts.delete(ip);
    else ipCounts.set(ip, c);
  };

  ws.on("message", async (data) => {
    try {
      const msg = JSON.parse(data.toString());
      if (msg.type === "ping") {
        ws.send(JSON.stringify({ type: "pong", t: Date.now() }));
        return;
      }

      if (msg.type === "login") {
        const { id, password, name, gender, register } = msg;
        if (!validateId(id) || !validatePassword(password)) {
          ws.send(
            JSON.stringify({
              type: "error",
              message: "账号或密码格式不正确",
            })
          );
          return;
        }
        if (register && !metrics.canRegister(ip, config.maxRegisterPerHour)) {
          ws.send(
            JSON.stringify({
              type: "error",
              message: "注册过于频繁，请稍后再试",
            })
          );
          return;
        }
        if (register) metrics.recordRegister(ip);

        mud = new MudSession(sessionId, config, {
          id,
          password,
          name: name || id,
          gender: gender || "男",
        });
        sessions.set(sessionId, mud);

        mud.on("text", (payload) => {
          if (ws.readyState === ws.OPEN) {
            ws.send(JSON.stringify({ type: "text", ...payload }));
          }
        });
        mud.on("event", (event) => {
          if (ws.readyState === ws.OPEN) {
            ws.send(JSON.stringify({ type: "event", event }));
          }
        });
        mud.on("error", (err) => {
          metrics.incError();
          log("error", sessionId, err.message);
          if (ws.readyState === ws.OPEN) {
            const message = /ECONNREFUSED/.test(err.message)
              ? "无法连接游戏服务器（请确认 MUD 已启动 :8888）"
              : err.message;
            ws.send(JSON.stringify({ type: "error", message }));
          }
        });
        mud.on("close", () => {
          if (ws.readyState === ws.OPEN) {
            ws.send(JSON.stringify({ type: "disconnected" }));
          }
        });

        try {
          await mud.connect();
          ws.send(JSON.stringify({ type: "connected", sessionId }));
        } catch (err) {
          metrics.incError();
          ws.send(JSON.stringify({ type: "error", message: "无法连接游戏服务器" }));
          cleanup();
        }
        return;
      }

      if (msg.type === "cmd") {
        if (!mud) {
          ws.send(JSON.stringify({ type: "error", message: "未登录" }));
          return;
        }
        metrics.incCommands();
        mud.send(msg.command);
        return;
      }

      if (msg.type === "assist") {
        if (!mud) return;
        const c = msg.config || {};
        if (c.action === "stop") {
          mud.send("webassist stop");
        } else if (c.mode === "combat") {
          mud.send(
            `webassist combat ${c.lowHpPct || 30} ${c.lowHpAction || "flee"}`
          );
        } else {
          mud.send(
            `webassist train ${c.mode || "dazuo"} ${c.stopWhen || "full"} ${c.stopCount || 0} ${c.stopOnCombat ? 1 : 0}`
          );
        }
        return;
      }
    } catch (err) {
      metrics.incError();
      log("error", "message parse", err);
    }
  });

  ws.on("close", cleanup);

  heartbeat = setInterval(() => {
    if (ws.readyState === ws.OPEN) {
      ws.send(JSON.stringify({ type: "ping", t: Date.now() }));
    }
    if (mud && Date.now() - mud.lastActivity > config.sessionTimeoutMs) {
      log("info", sessionId, "session timeout");
      ws.close(4000, "timeout");
    }
  }, config.heartbeatIntervalMs);
});

server.listen(config.listenPort, () => {
  log("info", `gateway listening on :${config.listenPort} -> mud ${config.mudHost}:${config.mudPort}`);
});
