const WebSocket = require("/opt/xkx/gateway/node_modules/ws");

const WS = process.env.XKX_E2E_WS || "ws://127.0.0.1:3001/ws";
const id = "bug" + Math.random().toString(36).slice(2, 6);
const t0 = Date.now();
const log = (m) => console.log(String(Date.now() - t0).padStart(5) + "ms " + m);

const ws = new WebSocket(WS);
let ready = false;
let cmds = 0;
let replies = 0;
let lastRoom = "";
let lastText = "";

function sendCmd(c) {
  cmds++;
  log(">> " + c);
  ws.send(JSON.stringify({ type: "cmd", command: c }));
}

ws.on("open", () => {
  log("open " + id);
  ws.send(
    JSON.stringify({
      type: "login",
      id,
      password: "Test1234",
      name: "卡测",
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
    log("bad json " + String(raw).slice(0, 80));
    return;
  }
  if (msg.type === "ping") return;
  if (msg.type === "text") {
    replies++;
    const t = String(msg.text || "");
    lastText = t;
    if (/精疲|忙|不能移动|什么？|无法/.test(t) || t.length < 80) {
      log("text " + JSON.stringify(t).slice(0, 160));
    } else {
      log("text len=" + t.length);
    }
  } else if (msg.type === "event") {
    replies++;
    const ev = msg.event || {};
    if (ev.type === "room.update") {
      lastRoom = String(ev.title || "");
      log(
        "room " +
          lastRoom +
          " exits=" +
          (Array.isArray(ev.exits) ? ev.exits.length : 0)
      );
    } else if (ev.type === "assist.status") {
      log("assist " + ev.active + " " + (ev.message || ""));
    } else if (ev.type === "player.vitals") {
      const v = ev.vitals || {};
      log("vitals qi=" + v.qi + " jingli=" + v.jingli + "/" + v.max_jingli);
    } else {
      log("event " + ev.type);
    }
  } else if (msg.type === "ready") {
    ready = true;
    log("ready");
  } else if (msg.type === "error") {
    log("ERROR " + msg.message);
  } else if (msg.type === "disconnected") {
    log("DISCONNECTED");
  } else {
    log("msg " + msg.type);
  }
});

ws.on("error", (e) => {
  log("ws error " + e.message);
  process.exit(1);
});
ws.on("close", () => log("ws close"));

const steps = [
  [1500, "look"],
  [2800, "hp"],
  [4000, "go north"],
  [5500, "look"],
  [7000, "go south"],
  [8500, "go east"],
  [10000, "look"],
  [11500, "score"],
  [13000, "inventory"],
  [14500, "go west"],
  [16000, "go north"],
  [17500, "go north"],
  [19000, "look"],
];

for (const [ms, c] of steps) {
  setTimeout(() => {
    if (!ready) log("SKIP not ready for " + c);
    else sendCmd(c);
  }, ms);
}

setTimeout(() => {
  log(
    "SUMMARY ready=" +
      ready +
      " cmds=" +
      cmds +
      " replies=" +
      replies +
      " room=" +
      lastRoom
  );
  if (!ready || replies < cmds) {
    log("FAIL suspected stuck");
    process.exit(2);
  }
  ws.close();
  process.exit(0);
}, 22000);
