#!/usr/bin/env node
/**
 * 排查：点击 NPC 是否带 canApprentice（拜师按钮依据）。
 * 走到目标房间后打印 room.update 的 npcs 数组。
 * Env: XKX_E2E_WS 默认 ws://127.0.0.1:3001/ws；XKX_E2E_SCENE 默认 qianzhuang
 */
const path = require("path");
const WebSocket = require(path.join(__dirname, "../../gateway/node_modules/ws"));

const WS = process.env.XKX_E2E_WS || "ws://127.0.0.1:3001/ws";
const SCENE = process.env.XKX_E2E_SCENE || "qianzhuang";
const letters = "abcdefghijklmnopqrstuvwxyz";
let id = "";
for (let i = 0; i < 6; i++) id += letters[Math.floor(Math.random() * 26)];

const t0 = Date.now();
const log = (m) => console.log(String(Date.now() - t0).padStart(5) + "ms " + m);
let room = "";
let finished = false;

const ws = new WebSocket(WS);
ws.on("open", () => {
  log("open " + id);
  ws.send(JSON.stringify({
    type: "login", id, password: "Test1234", name: "拜师测", gender: "男", register: true,
  }));
});
const sendCmd = (cmd, delay) =>
  setTimeout(() => ws.send(JSON.stringify({ type: "cmd", command: cmd })), delay);

ws.on("message", (raw) => {
  let msg;
  try { msg = JSON.parse(raw.toString()); } catch { return; }
  if (msg.type === "ping") return;
  if (msg.type === "event" && msg.event) {
    const ev = msg.event;
    if (ev.type === "room.update") {
      room = ev.title || "";
      log("ROOM.UPDATE title=" + room);
      const npcs = Array.isArray(ev.npcs) ? ev.npcs : [];
      for (const n of npcs) {
        log(`  NPC id=${n.id} name=${n.name} canApprentice=${n.canApprentice} canTrade=${n.canTrade} canLead=${n.canLead}`);
      }
    } else if (ev.type === "newbie.attribute_select") {
      sendCmd("newbieattr str 20 int 20 con 20 dex 20", 300);
    }
  }
  if (msg.type === "ready" || (msg.type === "event" && msg.event?.type === "ready")) {
    if (finished) return;
    log("ready");
    sendCmd(`newbietest prep ${SCENE}`, 400);
    setTimeout(() => {
      if (!finished) {
        log("DONE room=" + room);
        finish(0);
      }
    }, 9000);
  }
});
function finish(code) {
  if (finished) return;
  finished = true;
  setTimeout(() => process.exit(code), 300);
}
ws.on("error", (e) => { log("ws error " + e.message); finish(1); });
setTimeout(() => { if (!finished) { log("TIMEOUT room=" + room); finish(4); } }, 25000);
