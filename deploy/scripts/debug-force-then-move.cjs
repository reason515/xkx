const path = require("path");
const WebSocket = require(path.join(__dirname, "../../gateway/node_modules/ws"));

const letters = "abcdefghijklmnopqrstuvwxyz";
let id = "";
for (let i = 0; i < 6; i++) id += letters[Math.floor(Math.random() * 26)];

const ws = new WebSocket(process.env.XKX_E2E_WS || "ws://127.0.0.1:3001/ws");
let buf = "";
let ready = false;
let room = "";
let exits = 0;
const t0 = Date.now();
const log = (m) => console.log(String(Date.now() - t0).padStart(5) + "ms " + m);

ws.on("open", () => {
  log("open " + id);
  ws.send(
    JSON.stringify({
      type: "login",
      id,
      password: "Test1234",
      name: "力测",
      gender: "男",
      register: true,
    })
  );
});

ws.on("message", (raw) => {
  const msg = JSON.parse(raw.toString());
  if (msg.type === "text") {
    buf += msg.text || "";
    if (/精疲|动弹|Error|错误|什么？|不能自由|忙|脸色/.test(msg.text || "")) {
      log("T " + JSON.stringify(msg.text).slice(0, 140));
    }
  }
  if (msg.type === "event" && msg.event) {
    if (msg.event.type === "room.update") {
      room = msg.event.title || "";
      exits = Array.isArray(msg.event.exits) ? msg.event.exits.length : 0;
      log("room " + room + " exits=" + exits);
    }
    if (msg.event.type === "skills.enable") {
      log("enable " + JSON.stringify(msg.event.slots).slice(0, 220));
    }
    if (msg.event.type === "assist.status") {
      log("assist " + msg.event.active + " " + msg.event.message);
    }
  }
  if (msg.type === "ready" && !ready) {
    ready = true;
    log("ready");
    const steps = [
      [300, "follow zhang san"],
      [600, "follow li si"],
      [2500, "xkxe2e grantforce"],
      [3200, "enable"],
      [3800, "webclient"],
      [4500, "webclient skills"],
      [5200, "look"],
      [5800, "go north"],
      [7000, "look"],
      [8000, "yun recover"],
      [9000, "look"],
      [10000, "go south"],
      [11000, "go north"],
    ];
    for (const [ms, c] of steps) {
      setTimeout(() => ws.send(JSON.stringify({ type: "cmd", command: c })), ms);
    }
    setTimeout(() => {
      log("FINAL room=" + room + " exits=" + exits);
      log("tail=" + JSON.stringify(buf.slice(-350)));
      const ok = exits > 0 || /小路|沙滩|甬道|迎宾/.test(room);
      process.exit(ok ? 0 : 2);
    }, 13000);
  }
});

setTimeout(() => {
  log("TIMEOUT");
  process.exit(3);
}, 20000);
