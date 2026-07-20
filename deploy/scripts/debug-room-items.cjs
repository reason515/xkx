#!/usr/bin/env node
/** Dump first-room items/npcs after register for encoding debug. */
const path = require("path");
const WebSocket = require(path.join(__dirname, "../../gateway/node_modules/ws"));

const WS_URL = process.env.XKX_E2E_WS || "ws://127.0.0.1:3001/ws";
const letters = "abcdefghijklmnopqrstuvwxyz";
let id = "";
for (let i = 0; i < 6; i++) id += letters[Math.floor(Math.random() * 26)];

const ws = new WebSocket(WS_URL);
const timer = setTimeout(() => {
  console.error("timeout");
  process.exit(1);
}, 60000);

ws.on("open", () => {
  ws.send(
    JSON.stringify({
      type: "login",
      id,
      password: "Test1234",
      name: "测物",
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
  if (msg.type === "event" && msg.event) {
    const e = msg.event;
    if (e.type === "room.update") {
      console.log(JSON.stringify({ id, title: e.title, npcs: e.npcs, items: e.items }, null, 2));
      // also dump codepoints for item names
      for (const it of e.items || []) {
        const name = it.name || "";
        console.log(
          "ITEM",
          JSON.stringify(name),
          [...name].map((c) => c.codePointAt(0).toString(16)).join(" ")
        );
      }
      clearTimeout(timer);
      ws.close();
      process.exit(0);
    }
  }
  if (msg.type === "error") {
    console.error("error", msg);
    clearTimeout(timer);
    process.exit(1);
  }
});

ws.on("error", (e) => {
  console.error(e);
  process.exit(1);
});
