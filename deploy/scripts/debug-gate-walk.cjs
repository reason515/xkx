/**
 * Walk newbie path to 石门 and dump room.update doors/exits.
 * Run on server: node /tmp/debug-gate-walk.cjs
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
let title = "";
let lastRoom = null;
const log = [];

function send(cmd) {
  ws.send(JSON.stringify({ type: "cmd", command: cmd }));
  console.log(">>", cmd);
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

ws.on("message", (data) => {
  const msg = JSON.parse(data.toString());
  if (msg.type === "event" && msg.event?.type === "room.update") {
    const e = msg.event;
    title = e.title || title;
    lastRoom = {
      title: e.title,
      path: e.path,
      exits: e.exits,
      doors: e.doors,
    };
    console.log("ROOM", JSON.stringify(lastRoom));
  }
  if (msg.type === "text" && msg.text) {
    const t = String(msg.text);
    if (/石门|大山洞|甬道|你必须先把|打开/.test(t)) {
      log.push(t.replace(/\s+/g, " ").slice(0, 160));
    }
  }
});

async function go(dir) {
  send(`go ${dir}`);
  await sleep(700);
}

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
      name: "石门测",
      gender: "男性",
      register: true,
    })
  );
  await new Promise((resolve) => {
    const onMsg = (data) => {
      const msg = JSON.parse(data.toString());
      if (msg.type === "ready") {
        ws.off("message", onMsg);
        resolve();
      }
    };
    ws.on("message", onMsg);
  });
  await sleep(800);
  send("follow zhang san");
  // wait for arrival near waterfall / 甬道
  for (let i = 0; i < 40; i++) {
    await sleep(500);
    if (/瀑布|甬道|山洞/.test(title)) break;
  }
  console.log("after follow title=", title);
  // Typical path after follow ends near waterfall entrance; walk like e2e
  // Try common sequence toward dadong then gate
  const tries = [
    "enter",
    "north",
    "north",
    "north",
    "north",
    "north",
    "east",
    "north",
    "south",
    "north",
    "enter",
    "north",
  ];
  // First ask 岛主 if at dadong
  for (let step = 0; step < 30; step++) {
    await sleep(400);
    if (title === "大山洞") {
      send("ask si pu about 岛主");
      await sleep(1200);
      await go("enter");
      await go("north");
      break;
    }
    if (title === "石门") break;
    // nudge toward dadong: from waterfall area
    if (/瀑布/.test(title)) {
      await go("enter");
      continue;
    }
    if (/甬道/.test(title)) {
      // Prefer north/east toward dadong board path used in e2e
      const dirs = (lastRoom?.exits || []).map((e) => e.dir);
      if (dirs.includes("north")) await go("north");
      else if (dirs.includes("east")) await go("east");
      else if (dirs.includes("south")) await go("south");
      else if (dirs.includes("enter")) await go("enter");
      else if (dirs[0]) await go(dirs[0]);
      else break;
      continue;
    }
    const dirs = (lastRoom?.exits || []).map((e) => e.dir);
    if (dirs.includes("north")) await go("north");
    else if (dirs[0]) await go(dirs[0]);
    else {
      send("look");
      await sleep(600);
    }
  }

  console.log("FINAL", JSON.stringify(lastRoom, null, 2));
  console.log("LOG", log.slice(-8));
  if (title === "石门") {
    send("close 石门");
    await sleep(800);
    send("look");
    await sleep(800);
    console.log("AFTER_CLOSE", JSON.stringify(lastRoom, null, 2));
  }
  ws.close();
  process.exit(title === "石门" ? 0 : 3);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

setTimeout(() => {
  console.log("TIMEOUT title=", title, JSON.stringify(lastRoom));
  process.exit(2);
}, 90000);
