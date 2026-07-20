/**
 * Repro: start stone-wall study assist from shanding; log assist.status + rooms.
 * Run on server: node /opt/xkx/deploy/scripts/debug-study-from-shanding.cjs
 */
const WebSocket = require("/opt/xkx/gateway/node_modules/ws");

function rid() {
  let s = "";
  const a = "abcdefghijklmnopqrstuvwxyz";
  for (let i = 0; i < 8; i++) s += a[Math.floor(Math.random() * 26)];
  return s;
}

const id = rid();
const ws = new WebSocket("ws://127.0.0.1:3001/ws");
const log = [];

function send(cmd) {
  ws.send(JSON.stringify({ type: "cmd", command: cmd }));
  console.log(">>", cmd);
}

function assist(config) {
  ws.send(JSON.stringify({ type: "assist", config }));
  console.log(">> assist", JSON.stringify(config));
}

ws.on("message", (data) => {
  const msg = JSON.parse(data.toString());
  if (msg.type === "event" && msg.event) {
    const ev = msg.event;
    if (ev.type === "assist.status") {
      const line = `ASSIST active=${ev.active} msg=${ev.message}`;
      console.log(line);
      log.push(line);
    }
    if (ev.type === "room.update") {
      const line = `ROOM ${ev.title} path=${ev.path || ""}`;
      console.log(line);
      log.push(line);
    }
  }
  if (msg.type === "text" && msg.text) {
    const t = String(msg.text).replace(/\s+/g, " ").trim();
    if (/无法|挂机|领悟|雨衣|跳|石门|屏风|停止|前往/.test(t)) {
      console.log("TEXT", t.slice(0, 180));
    }
  }
  if (msg.type === "ready") {
    setTimeout(() => send("xkxe2e shanding"), 500);
    setTimeout(() => assist({ mode: "study", skill: "taixuan-gong" }), 2000);
    setTimeout(() => {
      console.log("--- DONE ---");
      console.log(log.join("\n"));
      ws.close();
      process.exit(0);
    }, 45000);
  }
  if (msg.type === "error") {
    console.log("ERROR", msg.message);
  }
});

ws.on("open", () => {
  ws.send(
    JSON.stringify({
      type: "login",
      id,
      password: "Test1234",
      name: "悟壁",
      gender: "男性",
      register: true,
    })
  );
});

ws.on("error", (e) => {
  console.error(e);
  process.exit(1);
});

setTimeout(() => {
  console.log("TIMEOUT");
  console.log(log.join("\n"));
  process.exit(2);
}, 50000);
