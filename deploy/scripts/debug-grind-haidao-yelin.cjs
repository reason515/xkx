#!/usr/bin/env node
/**
 * Repro: dadong + 腊八粥 → grind haidao_s → detect stuck at 野林.
 */
const path = require("path");
const WebSocket = require(
  path.join(__dirname, "../../gateway/node_modules/ws")
);

const WS_URL = process.env.XKX_E2E_WS || "ws://127.0.0.1:3001/ws";

function rid() {
  const letters = "abcdefghijklmnopqrstuvwxyz";
  let id = "";
  for (let i = 0; i < 6; i++) id += letters[Math.floor(Math.random() * 26)];
  return id;
}

function main() {
  const id = rid();
  const password = "Test1234";
  const ws = new WebSocket(WS_URL);
  let buf = "";
  let phase = "login";
  let roomTitle = "";
  let assist = "";
  let sentFollow = false;
  let yelinSince = 0;
  const rooms = [];
  const started = Date.now();

  const log = (m) => console.log(`[${phase}] ${m}`);
  const send = (cmd) => {
    log(">> " + cmd);
    ws.send(JSON.stringify({ type: "cmd", command: cmd }));
  };

  const finish = (result, extra = {}) => {
    console.log(
      JSON.stringify({
        result,
        id,
        ms: Date.now() - started,
        roomTitle,
        assist,
        rooms,
        tail: buf.slice(-1000),
        ...extra,
      })
    );
    try {
      ws.close();
    } catch {
      /* ignore */
    }
    process.exit(result === "pass" || result === "pass_left_yelin" ? 0 : 1);
  };

  setTimeout(() => finish("timeout", { phase }), 110000);

  ws.on("error", (e) => finish("ws_error", { error: e.message }));
  ws.on("open", () => {
    log("open " + id);
    ws.send(
      JSON.stringify({
        type: "login",
        id,
        password,
        name: "测鸦",
        gender: "男",
        register: true,
      })
    );
  });

  ws.on("message", (raw) => {
    let msg;
    try {
      msg = JSON.parse(String(raw));
    } catch {
      return;
    }
    if (msg.type === "error") {
      finish("login_error", { error: msg.message });
      return;
    }
    if (msg.type === "text" && msg.text) buf += msg.text;
    if (msg.type === "ready" && phase === "login") {
      phase = "beach";
      log("ready");
    }
    if (msg.type === "event" && msg.event?.type === "room.update") {
      roomTitle = String(msg.event.title || roomTitle);
      const exits = Array.isArray(msg.event.exits)
        ? msg.event.exits.map((e) => e.dir || e.name || e).join(",")
        : "";
      const line = `${roomTitle}|${exits}`;
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
      let target = "";
      const hinted = buf.match(/follow\s+(zhang san|li si)/i);
      if (hinted) target = hinted[1].toLowerCase();
      if (!target) {
        if (/Zhang san/i.test(buf)) target = "zhang san";
        else if (/Li si/i.test(buf)) target = "li si";
      }
      if (
        !target &&
        msg.type === "event" &&
        msg.event?.type === "room.update"
      ) {
        for (const n of msg.event.npcs || []) {
          const nid = String(n.id || "").toLowerCase();
          if (nid === "zhang san" || nid === "li si") {
            target = nid;
            break;
          }
        }
      }
      if (target) {
        sentFollow = true;
        send(`follow ${target}`);
        setTimeout(() => {
          phase = "prep";
          send("xkxe2e dadong");
          setTimeout(() => {
            send("ask si pu about 腊八粥");
            setTimeout(() => {
              send("eat laba zhou");
              setTimeout(() => {
                phase = "grind";
                send("webassist grind haidao_s 30");
              }, 1200);
            }, 1800);
          }, 2500);
        }, 5500);
      }
    }

    if (phase !== "grind") return;

    if (/野林/.test(roomTitle)) {
      if (!yelinSince) {
        yelinSince = Date.now();
        log("ENTERED 野林 — watch 28s");
        // probe: if grind stuck, try manual go south after 8s
        setTimeout(() => {
          if (/野林/.test(roomTitle)) {
            log("probe look / go south");
            send("look");
            setTimeout(() => send("go south"), 400);
          }
        }, 8000);
      } else if (Date.now() - yelinSince > 28000) {
        finish("stuck_yelin");
      }
    } else if (yelinSince && /海盗/.test(roomTitle)) {
      send("webassist stop");
      setTimeout(() => finish("pass_left_yelin"), 400);
    }
  });
}

main();
