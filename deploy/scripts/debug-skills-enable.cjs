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
const ws = new WebSocket("ws://127.0.0.1:3001/ws");
const events = [];
let buf = "";
let enablePayload = null;

const send = (c) => ws.send(JSON.stringify({ type: "cmd", command: c }));

ws.on("open", () =>
  ws.send(
    JSON.stringify({
      type: "login",
      id,
      password: "Test1234",
      name: "测功",
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
  if (msg.type === "error") {
    console.log("ERR", msg);
    process.exit(1);
  }
  if (msg.type === "text" && msg.text) buf += msg.text;
  if (msg.type === "event" && msg.event) {
    events.push(msg.event.type);
    if (msg.event.type === "skills.enable") enablePayload = msg.event;
    if (msg.event.type === "player.vitals") {
      console.log("vitals", msg.event.vitals?.qi);
    }
  }
  if (msg.type === "ready") {
    setTimeout(() => send("follow zhang san"), 800);
    setTimeout(() => send("follow li si"), 1600);
    setTimeout(() => {
      send("xkxe2e grantskills");
      setTimeout(() => send("webclient skills"), 1000);
      setTimeout(() => {
        send("xkxe2e hurt");
        setTimeout(() => {
          console.log(
            JSON.stringify(
              {
                events,
                enable: enablePayload,
                hasVitals: events.includes("player.vitals"),
                tail: buf.slice(-300),
              },
              null,
              2
            )
          );
          process.exit(0);
        }, 3000);
      }, 2500);
    }, 6500);
  }
});

setTimeout(() => {
  console.log("timeout", events);
  process.exit(1);
}, 35000);
