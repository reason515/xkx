#!/usr/bin/env node
/**
 * 排查新手村武师（wushi）canApprentice：拜师按钮的数据源。
 * 注册新号 → newbietest skip 到尚武堂各阶段 → 打印 room.update npcs。
 */
const path = require("path");
const WebSocket = require(path.join(__dirname, "../../gateway/node_modules/ws"));

const WS = process.env.XKX_E2E_WS || "ws://127.0.0.1:3001/ws";
const SKIP = Number(process.env.XKX_E2E_SKIP || 13); // 13 = 尚武堂（武师房）
const letters = "abcdefghijklmnopqrstuvwxyz";
let id = "";
for (let i = 0; i < 6; i++) id += letters[Math.floor(Math.random() * 26)];

const t0 = Date.now();
const log = (m) => console.log(String(Date.now() - t0).padStart(5) + "ms " + m);
let finished = false;
const seen = new Set();

const ws = new WebSocket(WS);
ws.on("open", () => {
  log("open " + id);
  ws.send(JSON.stringify({
    type: "login", id, password: "Test1234", name: "武师测", gender: "男", register: true,
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
      const key = ev.title + "|" + JSON.stringify(ev.npcs || []);
      if (!seen.has(key)) {
        seen.add(key);
        log("ROOM.UPDATE title=" + ev.title);
        for (const n of ev.npcs || []) {
          log(`  NPC id=${n.id} name=${n.name} canApprentice=${n.canApprentice}`);
        }
      }
    } else if (ev.type === "newbie.attribute_select") {
      sendCmd("newbieattr str 20 int 20 con 20 dex 20", 300);
    }
  }
  if (msg.type === "ready" || (msg.type === "event" && msg.event?.type === "ready")) {
    if (finished) return;
    log("ready");
    sendCmd(`newbietest skip ${SKIP}`, 500);
    setTimeout(() => {
      if (!finished) {
        log("DONE");
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
setTimeout(() => { if (!finished) { log("TIMEOUT"); finish(4); } }, 25000);
