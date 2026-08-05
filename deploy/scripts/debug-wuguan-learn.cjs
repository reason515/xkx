#!/usr/bin/env node
/**
 * 验证修复：武馆大厅裸 skills（查自己）不再被教头劫持，
 * skills jiaotou（学艺面板）仍展示教头技能列表。
 */
const path = require("path");
const WebSocket = require(path.join(__dirname, "../../gateway/node_modules/ws"));

const WS = process.env.XKX_E2E_WS || "ws://127.0.0.1:3001/ws";
const letters = "abcdefghijklmnopqrstuvwxyz";
let id = "";
for (let i = 0; i < 6; i++) id += letters[Math.floor(Math.random() * 26)];

const t0 = Date.now();
const log = (m) => console.log(String(Date.now() - t0).padStart(5) + "ms " + m);
let room = "";
const textLog = [];
let finished = false;

const ws = new WebSocket(WS);
ws.on("open", () => {
  log("open " + id);
  ws.send(JSON.stringify({
    type: "login", id, password: "Test1234", name: "武学测", gender: "男", register: true,
  }));
});
const sendCmd = (cmd, delay) =>
  setTimeout(() => ws.send(JSON.stringify({ type: "cmd", command: cmd })), delay);

ws.on("message", (raw) => {
  let msg;
  try { msg = JSON.parse(raw.toString()); } catch { return; }
  if (msg.type === "ping") return;
  if (msg.type === "text") {
    const t = String(msg.text || "").replace(/\x1b\[[0-9;]*m/g, "");
    textLog.push(String(Date.now() - t0).padStart(5) + "ms TEXT: " + t);
  }
  if (msg.type === "event" && msg.event) {
    const ev = msg.event;
    if (ev.type === "room.update") {
      room = ev.title || "";
    } else if (ev.type === "newbie.attribute_select") {
      sendCmd("newbieattr str 20 int 20 con 20 dex 20", 300);
    }
  }
  if (msg.type === "ready" || (msg.type === "event" && msg.event?.type === "ready")) {
    if (finished) return;
    log("ready");
    sendCmd("newbietest prep wuguan", 400);
    sendCmd("go south", 2400);          // 武馆大厅（教头同房）
    sendCmd("skills", 3900);            // 裸 skills → 应显示自己的技能
    sendCmd("skills jiaotou", 5500);    // 学艺面板 → 仍显示教头技能
    setTimeout(() => {
      if (!finished) {
        log("DONE room=" + room);
        log("=====TEXT LOG START=====");
        for (const l of textLog) console.log(l);
        log("=====TEXT LOG END=====");
        finish(0);
      }
    }, 12000);
  }
});
function finish(code) {
  if (finished) return;
  finished = true;
  setTimeout(() => process.exit(code), 300);
}
ws.on("error", (e) => { log("ws error " + e.message); finish(1); });
setTimeout(() => { if (!finished) { log("TIMEOUT room=" + room); finish(4); } }, 25000);
