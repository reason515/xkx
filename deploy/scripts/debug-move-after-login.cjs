const path = require("path");
const WebSocket = require(path.join(__dirname, "../../gateway/node_modules/ws"));

const WS = process.env.XKX_E2E_WS || "ws://127.0.0.1:3001/ws";
const letters = "abcdefghijklmnopqrstuvwxyz";
let id = "";
for (let i = 0; i < 6; i++) id += letters[Math.floor(Math.random() * 26)];

const t0 = Date.now();
const log = (m) => console.log(String(Date.now() - t0).padStart(5) + "ms " + m);
let buf = "";
let ready = false;
let room = "";
let exits = 0;
let skillsEnable = 0;

const ws = new WebSocket(WS);
ws.on("open", () => {
  log("open " + id);
  ws.send(
    JSON.stringify({
      type: "login",
      id,
      password: "Test1234",
      name: "移动测",
      gender: "男",
      register: true,
    })
  );
});

ws.on("message", (raw) => {
  let msg;
  try {
    msg = JSON.parse(raw.toString());
  } catch {
    return;
  }
  if (msg.type === "ping") return;
  if (msg.type === "error") {
    log("ERROR " + msg.message);
    return;
  }
  if (msg.type === "text") {
    buf += msg.text || "";
    const t = String(msg.text || "");
    if (/精疲|动弹|忙|什么|卡住|不能自由|跟随/.test(t)) {
      log("text " + JSON.stringify(t).slice(0, 160));
    }
  }
  if (msg.type === "event" && msg.event) {
    const ev = msg.event;
    if (ev.type === "room.update") {
      room = ev.title || "";
      exits = Array.isArray(ev.exits) ? ev.exits.length : 0;
      log("room " + room + " exits=" + exits);
    } else if (ev.type === "skills.enable") {
      skillsEnable = Object.keys(ev.slots || {}).length;
      log("skills.enable n=" + skillsEnable);
    } else if (ev.type === "player.vitals") {
      const v = ev.vitals || {};
      log("vitals qi=" + v.qi + " jingli=" + v.jingli + "/" + v.max_jingli);
    } else if (ev.type === "assist.status") {
      log("assist " + ev.active + " " + (ev.message || ""));
    }
  }
  if (msg.type === "ready" || (msg.type === "event" && msg.event?.type === "ready")) {
    if (ready) return;
    ready = true;
    log("ready");
    setTimeout(() => ws.send(JSON.stringify({ type: "cmd", command: "look" })), 200);
    setTimeout(() => ws.send(JSON.stringify({ type: "cmd", command: "webclient" })), 400);
    setTimeout(() => ws.send(JSON.stringify({ type: "cmd", command: "go north" })), 900);
    setTimeout(() => ws.send(JSON.stringify({ type: "cmd", command: "follow zhang san" })), 1600);
    setTimeout(() => ws.send(JSON.stringify({ type: "cmd", command: "follow li si" })), 2000);
    setTimeout(() => ws.send(JSON.stringify({ type: "cmd", command: "look" })), 4500);
    setTimeout(() => ws.send(JSON.stringify({ type: "cmd", command: "go north" })), 5200);
    setTimeout(() => ws.send(JSON.stringify({ type: "cmd", command: "look" })), 6500);
    setTimeout(() => {
      log("FINAL ready=" + ready + " room=" + room + " exits=" + exits);
      log("tail=" + JSON.stringify(buf.slice(-500)));
      const blockedHint = /不能自由走动|请先跟随/.test(buf);
      const moved = exits > 0 || /沙滩/.test(room) === false;
      if (!ready) process.exit(2);
      if (blockedHint && exits === 0) {
        log("OK beach block with hint (expected before follow)");
      }
      if (exits > 0 || /迎宾|甬道|沙滩/.test(room)) {
        log("PASS can play room=" + room);
        process.exit(0);
      }
      log("FAIL stuck room=" + room + " exits=" + exits);
      process.exit(3);
    }, 9000);
  }
});

ws.on("error", (e) => {
  log("ws error " + e.message);
  process.exit(1);
});
setTimeout(() => {
  log("TIMEOUT");
  process.exit(4);
}, 25000);
