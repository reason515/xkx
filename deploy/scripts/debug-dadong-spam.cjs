/**
 * Reproduce dadong ask-岛主 look spam on the live gateway.
 * Run on server: node /tmp/debug-dadong-spam.cjs
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
let phase = "login";
let staticHits = 0;
let lookSent = 0;
let textChunks = 0;
const samples = [];

function send(cmd) {
  ws.send(JSON.stringify({ type: "cmd", command: cmd }));
  if (cmd === "look") lookSent++;
  console.log(">>", cmd);
}

ws.on("message", (data) => {
  const msg = JSON.parse(data.toString());
  if (msg.type === "text" && msg.text) {
    textChunks++;
    const n = (String(msg.text).match(/屏风已被拉开/g) || []).length;
    if (n) {
      staticHits += n;
      samples.push(JSON.stringify(msg.text).slice(0, 240));
      console.log("STATIC+" + n, "total=" + staticHits, "chunk#", textChunks);
    }
  }
  if (msg.type === "event" && msg.event?.type === "room.update") {
    console.log(
      "ROOM",
      msg.event.title,
      "exits",
      JSON.stringify(msg.event.exits || []).slice(0, 120),
      "longHas",
      /屏风已被拉开/.test(msg.event.long || "")
    );
  }
  if (
    phase === "login" &&
    (msg.type === "ready" ||
      (msg.type === "text" && /目前权限|重新连线/.test(msg.text || "")))
  ) {
    phase = "goto";
    // wizard-less path: use xkxe2e if available, else walk later
    setTimeout(() => send("xkxe2e dadong"), 400);
    setTimeout(() => send("look"), 1200);
    setTimeout(() => {
      phase = "ask";
      send("ask si pu about 岛主");
      // Mimic web client: ask triggers a delayed look
      setTimeout(() => send("look"), 400);
      // And again if layout-change loop were active
      setTimeout(() => send("look"), 1200);
      setTimeout(() => send("look"), 2000);
    }, 2200);
  }
});

ws.on("open", () => {
  console.log("OPEN", id);
  ws.send(
    JSON.stringify({
      type: "login",
      id,
      password: "Test1234",
      name: "刷屏测",
      gender: "男性",
      register: true,
    })
  );
});

ws.on("error", (err) => console.log("ERR", String(err)));

setTimeout(() => {
  console.log("---RESULT---");
  console.log({ staticHits, lookSent, textChunks, samples: samples.slice(0, 5) });
  ws.close();
  process.exit(staticHits > 3 ? 2 : 0);
}, 12000);
