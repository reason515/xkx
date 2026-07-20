#!/usr/bin/env node
const WebSocket = require("/opt/xkx/gateway/node_modules/ws");
const letters = "abcdefghijklmnopqrstuvwxyz";
let id = "";
for (let i = 0; i < 6; i++) id += letters[Math.floor(Math.random() * 26)];
const ws = new WebSocket("ws://127.0.0.1:3001/ws");
let text = "";
let items = null;
const timer = setTimeout(() => {
  console.log(JSON.stringify({ id, timeout: true, textTail: text.slice(-500), items }, null, 2));
  process.exit(1);
}, 30000);
ws.on("open", () =>
  ws.send(
    JSON.stringify({
      type: "login",
      id,
      password: "Test1234",
      name: "测物",
      gender: "男",
      register: true,
    })
  )
);
ws.on("message", (raw) => {
  let msg;
  try {
    msg = JSON.parse(raw.toString());
  } catch {
    return;
  }
  if (msg.type === "text" && msg.text) text += msg.text;
  if (msg.type === "event" && msg.event?.type === "room.update") {
    items = msg.event.items;
    console.log(
      JSON.stringify(
        {
          id,
          title: msg.event.title,
          items: msg.event.items,
          npcs: msg.event.npcs,
          hasQmarks: /\?{3,}/.test(text),
          sampleQ: (text.match(/\?{3,}/g) || []).slice(0, 3),
        },
        null,
        2
      )
    );
    clearTimeout(timer);
    ws.close();
    process.exit(0);
  }
  if (msg.type === "ready") {
    setTimeout(
      () => ws.send(JSON.stringify({ type: "cmd", command: "look" })),
      1000
    );
  }
  if (msg.type === "error") {
    console.log(JSON.stringify(msg));
    clearTimeout(timer);
    process.exit(1);
  }
});
