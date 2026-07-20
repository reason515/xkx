/**
 * Repro: study assist from beach — before & after follow.
 * Run on server: node /opt/xkx/deploy/scripts/debug-study-from-beach.cjs
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
const log = [];
let phase = "boot";
let title = "";
let path = "";

function send(cmd) {
  ws.send(JSON.stringify({ type: "cmd", command: cmd }));
  console.log(">>", cmd);
}

function assist(config) {
  ws.send(JSON.stringify({ type: "assist", config }));
  console.log(">> assist", JSON.stringify(config));
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

ws.on("message", (data) => {
  const msg = JSON.parse(data.toString());
  if (msg.type === "event" && msg.event) {
    const ev = msg.event;
    if (ev.type === "assist.status") {
      const line = `[${phase}] ASSIST active=${ev.active} msg=${ev.message}`;
      console.log(line);
      log.push(line);
    }
    if (ev.type === "room.update") {
      title = ev.title || "";
      path = ev.path || "";
      const line = `[${phase}] ROOM ${title} path=${path}`;
      console.log(line);
      log.push(line);
    }
  }
  if (msg.type === "text" && msg.text) {
    const t = String(msg.text);
    if (/张三|李四|跟随|follow/.test(t) && phase === "follow") {
      console.log("TEXT", t.replace(/\s+/g, " ").trim().slice(0, 160));
    }
  }
  if (msg.type === "ready") {
    (async () => {
      await sleep(1000);
      phase = "pre_follow";
      assist({ mode: "study", skill: "taixuan-gong" });
      await sleep(4000);

      phase = "follow";
      send("look");
      await sleep(800);
      // try both greeters
      send("follow zhang san");
      await sleep(1500);
      send("follow li si");
      await sleep(6000);

      phase = "post_follow";
      console.log("now at", title, path);
      assist({ mode: "study", skill: "taixuan-gong" });
      await sleep(35000);

      const left = log.some(
        (l) =>
          l.includes("[post_follow] ROOM") &&
          !/沙滩/.test(l) &&
          !/path=shatan1/.test(l)
      );
      const arrived = log.some((l) => /石室|xkx1/.test(l));
      console.log("--- DONE ---");
      console.log(log.join("\n"));
      console.log({ leftBeachAfterFollow: left, arrivedStone: arrived });
      ws.close();
      process.exit(left || arrived ? 0 : 3);
    })().catch((e) => {
      console.error(e);
      process.exit(1);
    });
  }
  if (msg.type === "error") console.log("ERROR", msg.message);
});

ws.on("open", () => {
  ws.send(
    JSON.stringify({
      type: "login",
      id,
      password: "Test1234",
      name: "悟沙",
      gender: "男性",
      register: true,
    })
  );
});

ws.on("error", (e) => {
  console.error(e);
  process.exit(1);
});

setTimeout(() => {
  console.log("TIMEOUT");
  console.log(log.join("\n"));
  process.exit(2);
}, 70000);
