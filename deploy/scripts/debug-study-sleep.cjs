/**
 * Repro: exp>250 study assist must actually sleep in 休息室.
 * Run on server: node /opt/xkx/deploy/scripts/debug-study-sleep.cjs
 */
const WebSocket = require("/opt/xkx/gateway/node_modules/ws");

function rid() {
  let s = "";
  const a = "abcdefghijklmnopqrstuvwxyz";
  for (let i = 0; i < 8; i++) s += a[Math.floor(Math.random() * 26)];
  return s;
}

const id = rid();
const password = "Test1234";
const ws = new WebSocket("ws://127.0.0.1:3001/ws");
const events = [];
let title = "";
let ready = false;

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

ws.on("open", () => {
  ws.send(
    JSON.stringify({
      type: "login",
      id,
      password,
      name: `测${id.slice(0, 2)}`,
      gender: "男性",
      register: true,
    })
  );
  console.log("login", id);
});

ws.on("message", (data) => {
  const msg = JSON.parse(data.toString());
  if (msg.type === "event" && msg.event) {
    const ev = msg.event;
    if (ev.type === "assist.status") {
      const line = `ASSIST active=${ev.active} msg=${ev.message}`;
      console.log(line);
      events.push(line);
    }
    if (ev.type === "room.update") {
      title = ev.title || "";
      const line = `ROOM ${title} path=${ev.path || ""}`;
      console.log(line);
      events.push(line);
    }
    if (ev.type === "vitals.update" || ev.type === "vitals") {
      console.log(`VITALS jing=${ev.jing} qi=${ev.qi}`);
    }
  }
  if (msg.type === "text" && msg.text) {
    const t = String(msg.text).replace(/\s+/g, " ").trim();
    if (/睡|梦|休息|精神|领悟|挂机|不是你能睡/.test(t)) {
      console.log("TEXT", t.slice(0, 200));
      events.push("TEXT " + t.slice(0, 120));
    }
  }
  if (msg.type === "ready" && !ready) {
    ready = true;
    (async () => {
      try {
        await sleep(1500);
        send("follow zhang san");
        await sleep(6000);
        send("xkxe2e studyrecoverprep");
        await sleep(2500);
        console.log("prep room", title);
        assist({ mode: "study", skill: "taixuan-gong" });
        const deadline = Date.now() + 120000;
        while (Date.now() < deadline) {
          await sleep(2000);
          if (/休息室/.test(title)) console.log("at rest room", title);
          if (
            events.some((e) =>
              /睡觉恢复|睡觉中|睡醒|梦乡|一觉醒来|不是你能睡/.test(e)
            )
          ) {
            console.log("seen sleep-related event");
            break;
          }
          if (events.some((e) => /挂机停止|无法/.test(e))) break;
        }
        await sleep(25000);
        console.log("--- summary ---");
        console.log("final room", title);
        console.log(
          "recent",
          events.filter((e) => /睡|休息|石室|精神|前往|ASSIST/.test(e)).slice(-40)
        );
        const ok = events.some((e) =>
          /睡觉恢复|睡觉中|梦乡|一觉醒来|睡醒返回/.test(e)
        );
        console.log(ok ? "PASS: slept" : "FAIL: never slept");
        ws.close();
        process.exit(ok ? 0 : 1);
      } catch (e) {
        console.error(e);
        process.exit(1);
      }
    })();
  }
  if (msg.type === "error") {
    console.log("ERR", msg);
  }
});

ws.on("error", (e) => {
  console.error(e);
  process.exit(1);
});

setTimeout(() => {
  console.log("GLOBAL TIMEOUT");
  process.exit(2);
}, 180000);
