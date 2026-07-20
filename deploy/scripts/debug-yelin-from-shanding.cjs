#!/usr/bin/env node
const path = require("path");
const WebSocket = require(
  path.join(__dirname, "../../gateway/node_modules/ws")
);

function rid() {
  const a = "abcdefghijklmnopqrstuvwxyz";
  let s = "";
  for (let i = 0; i < 6; i++) s += a[Math.floor(Math.random() * 26)];
  return s;
}

const id = rid();
const password = "Test1234";
const ws = new WebSocket("ws://127.0.0.1:3001/ws");
let buf = "";
let phase = "login";
let room = "";
let assist = "";
let sentFollow = false;
const rooms = [];
const log = (m) => console.log(`[${phase}] ${m}`);
const send = (c) => {
  log(">> " + c);
  ws.send(JSON.stringify({ type: "cmd", command: c }));
};
const done = (r, extra = {}) => {
  console.log(
    JSON.stringify({
      result: r,
      room,
      assist,
      rooms,
      tail: buf.slice(-800),
      ...extra,
    })
  );
  try {
    ws.close();
  } catch {
    /* ignore */
  }
  process.exit(String(r).startsWith("pass") ? 0 : 1);
};

setTimeout(() => done("timeout", { phase }), 90000);
ws.on("open", () =>
  ws.send(
    JSON.stringify({
      type: "login",
      id,
      password,
      name: "测林",
      gender: "男",
      register: true,
    })
  )
);
ws.on("message", (raw) => {
  let msg;
  try {
    msg = JSON.parse(String(raw));
  } catch {
    return;
  }
  if (msg.type === "error") return done("err", { error: msg.message });
  if (msg.type === "text" && msg.text) buf += msg.text;
  if (msg.type === "ready" && phase === "login") {
    phase = "beach";
    log("ready");
  }
  if (msg.type === "event" && msg.event?.type === "room.update") {
    room = String(msg.event.title || room);
    const ex = (msg.event.exits || []).map((e) => e.dir || e).join(",");
    const line = room + "|" + ex;
    if (!rooms.length || rooms[rooms.length - 1] !== line) {
      rooms.push(line);
      log("room " + line);
    }
  }
  if (msg.type === "event" && msg.event?.type === "assist.status") {
    assist = `${msg.event.active ? 1 : 0}|${msg.event.message || ""}`;
    log("assist " + assist);
  }
  if (phase === "beach" && !sentFollow) {
    let t = "";
    if (/zhang san/i.test(buf)) t = "zhang san";
    else if (/li si/i.test(buf)) t = "li si";
    if (msg.event?.npcs) {
      for (const n of msg.event.npcs) {
        const i = String(n.id || "").toLowerCase();
        if (i === "zhang san" || i === "li si") t = i;
      }
    }
    if (!t) return;
    sentFollow = true;
    send("follow " + t);
    setTimeout(() => {
      phase = "probe";
      send("xkxe2e shanding");
      setTimeout(() => send("go southdown"), 800);
      setTimeout(() => send("look"), 1800);
      setTimeout(() => send("go south"), 2800);
      setTimeout(() => send("look"), 3800);
      setTimeout(() => send("go enter"), 4800);
      setTimeout(() => send("look"), 5800);
      setTimeout(() => {
        phase = "grind";
        send("xkxe2e shanding");
        setTimeout(() => send("webassist grind haidao_s 30"), 1200);
      }, 7000);
    }, 5500);
  }
  if (phase === "grind" && /海盗窝/.test(room)) {
    send("webassist stop");
    setTimeout(() => done("pass"), 400);
  }
  if (
    phase === "grind" &&
    /野林/.test(room) &&
    Date.now() - (global.__y || (global.__y = Date.now())) > 25000
  ) {
    done("stuck_yelin");
  }
});
