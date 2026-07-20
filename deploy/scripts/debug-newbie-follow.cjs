#!/usr/bin/env node
const path = require("path");
const WebSocket = require(
  path.join(__dirname, "../../gateway/node_modules/ws")
);

const id = "dbg" + Math.random().toString(36).slice(2, 6);
const ws = new WebSocket("ws://127.0.0.1:3001/ws");
let buf = "";
const t0 = Date.now();
const log = (s) => console.log(`[${Date.now() - t0}] ${s}`);

ws.on("open", () => {
  log("open " + id);
  ws.send(
    JSON.stringify({
      type: "login",
      id,
      password: "Test1234",
      name: "测试",
      gender: "男",
      register: true,
    })
  );
});

ws.on("message", (raw) => {
  let m;
  try {
    m = JSON.parse(raw.toString());
  } catch {
    return;
  }
  if (m.type === "text" && m.text) {
    buf += m.text;
    for (const l of m.text.split(/\n/).filter(Boolean).slice(0, 12)) {
      log("T " + l.slice(0, 140));
    }
  } else {
    log(JSON.stringify(m).slice(0, 240));
  }
  if (m.type === "ready") {
    setTimeout(() => {
      log("CMD follow zhang san");
      ws.send(JSON.stringify({ type: "cmd", command: "follow zhang san" }));
    }, 2000);
    setTimeout(() => {
      log("CMD look");
      ws.send(JSON.stringify({ type: "cmd", command: "look" }));
    }, 3500);
    setTimeout(() => {
      log("CMD follow li si");
      ws.send(JSON.stringify({ type: "cmd", command: "follow li si" }));
    }, 5000);
  }
});

ws.on("error", (e) => log("ERR " + e.message));

setTimeout(() => {
  log("==== TAIL ====");
  console.log(buf.slice(-2000));
  log("has follow msg: " + /跟随|follow|挂名|大厅|决定开始/.test(buf));
  log("has room.update raw: " + /room\.update/.test(buf));
  ws.close();
  process.exit(0);
}, 28000);
