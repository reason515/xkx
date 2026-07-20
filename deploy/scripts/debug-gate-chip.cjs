/**
 * Reproduce mobile path: gate closed → what does room.update contain,
 * and would inferredShutDoorActions produce open chip.
 * Run: node /tmp/debug-gate-chip.cjs
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

function send(cmd) {
  ws.send(JSON.stringify({ type: "cmd", command: cmd }));
  console.log(">>", cmd);
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

let last = null;
ws.on("message", (data) => {
  const msg = JSON.parse(data.toString());
  if (msg.type === "event" && msg.event?.type === "room.update") {
    last = msg.event;
    const doors = msg.event.doors || [];
    const exits = msg.event.exits || [];
    const hasEnter = exits.some((e) => e.dir === "enter");
    console.log(
      "ROOM",
      msg.event.title,
      "doors=",
      JSON.stringify(doors),
      "exits=",
      exits.map((e) => e.dir).join(","),
      "hasEnter=",
      hasEnter,
      "expectOpenChip=",
      doors.some((d) => d.status === "closed" || d.status === "locked") ||
        (!hasEnter && /石门/.test(msg.event.title || ""))
    );
  }
});

async function main() {
  await new Promise((resolve, reject) => {
    ws.on("open", resolve);
    ws.on("error", reject);
  });
  ws.send(
    JSON.stringify({
      type: "login",
      id,
      password: "Test1234",
      name: "芯片测",
      gender: "男性",
      register: true,
    })
  );
  await new Promise((resolve) => {
    const h = (data) => {
      const msg = JSON.parse(data.toString());
      if (msg.type === "ready") {
        ws.off("message", h);
        resolve();
      }
    };
    ws.on("message", h);
  });
  await sleep(600);
  send("xkxe2e gate");
  await sleep(800);
  send("xkxe2e closedoor");
  await sleep(600);
  send("look");
  await sleep(800);
  console.log("FINAL", JSON.stringify(last, null, 2));
  ws.close();
  process.exit(0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
setTimeout(() => process.exit(2), 15000);
