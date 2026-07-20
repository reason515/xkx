/**
 * Probe room.update doors/exits at 石门 (gate).
 * Run on server: node /tmp/debug-gate-doors.cjs
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
const rooms = [];

function send(cmd) {
  ws.send(JSON.stringify({ type: "cmd", command: cmd }));
  console.log(">>", cmd);
}

ws.on("message", (data) => {
  const msg = JSON.parse(data.toString());
  if (msg.type === "event" && msg.event?.type === "room.update") {
    const e = msg.event;
    rooms.push({
      title: e.title,
      path: e.path,
      exits: e.exits,
      doors: e.doors,
    });
    console.log(
      "ROOM",
      JSON.stringify({
        title: e.title,
        path: e.path,
        exits: e.exits,
        doors: e.doors,
        exitCount: Array.isArray(e.exits) ? e.exits.length : -1,
        doorCount: Array.isArray(e.doors) ? e.doors.length : -1,
      })
    );
  }
  if (msg.type === "text" && msg.text) {
    const t = String(msg.text);
    if (/明显的出口|这里明显/.test(t)) {
      console.log("TEXT_EXIT", JSON.stringify(t).slice(0, 280));
    }
  }
  if (msg.type === "ready") {
    setTimeout(() => send("look"), 600);
    // Walk beach -> waterfall path is long; teleport via update if wizardless:
    // use follow + ask path abbreviated: dump after look first.
    setTimeout(() => {
      console.log("AFTER_LOOK", JSON.stringify(rooms.slice(-1)));
      ws.close();
      process.exit(0);
    }, 2500);
  }
});

ws.on("open", () => {
  console.log("OPEN", id);
  ws.send(
    JSON.stringify({
      type: "login",
      id,
      password: "Test1234",
      name: "门测",
      gender: "男性",
      register: true,
    })
  );
});

setTimeout(() => {
  console.log("TIMEOUT rooms=", JSON.stringify(rooms));
  process.exit(2);
}, 10000);
