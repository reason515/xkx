const WebSocket = require("/opt/xkx/gateway/node_modules/ws");

function randomId() {
  const letters = "abcdefghijklmnopqrstuvwxyz";
  let id = "";
  for (let i = 0; i < 6; i++) id += letters[Math.floor(Math.random() * 26)];
  return id;
}

const id = randomId();
const ws = new WebSocket("ws://127.0.0.1:3001/ws");
let buf = "";
let phase = "login";
let ready = false;

function send(cmd) {
  console.log("CMD", cmd);
  ws.send(JSON.stringify({ type: "cmd", command: cmd }));
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

ws.on("message", (data) => {
  const msg = JSON.parse(data.toString());
  if (msg.type === "text" && msg.text) {
    buf += msg.text;
    const t = String(msg.text).replace(/\s+/g, " ").slice(0, 200);
    if (t.trim()) console.log("TEXT", t);
  }
  if (msg.type === "event" && msg.event) {
    console.log(
      "EVENT",
      msg.event.type,
      msg.event.title || "",
      Array.isArray(msg.event.items) ? `items=${msg.event.items.length}` : ""
    );
    if (msg.event.type === "room.update" && msg.event.title) {
      buf += `\n[room=${msg.event.title}]\n`;
    }
  }
  if (
    !ready &&
    (msg.type === "ready" ||
      (msg.type === "text" && /目前权限|重新连线/.test(msg.text || "")))
  ) {
    ready = true;
    run().catch((e) => {
      console.error(e);
      process.exit(1);
    });
  }
});

async function run() {
  await sleep(1000);
  for (let i = 0; i < 4; i++) {
    send("go north");
    await sleep(1200);
  }
  send("go northup");
  await sleep(1500);
  send("climb tree");
  await sleep(1500);
  send("remove cloth");
  await sleep(1200);
  send("wear rain coat");
  await sleep(1500);
  send("jump fall");
  await sleep(2000);
  send("look");
  await sleep(1500);
  send("go east");
  await sleep(1200);
  send("go north");
  await sleep(1500);
  send("list");
  await sleep(1500);
  send("read new");
  await sleep(1500);
  console.log("---TAIL---");
  console.log(buf.slice(-2000));
  const ok =
    /甬道|大山洞/.test(buf) &&
    /点牌子可浏览留言|现有下列留言|没有任何留言|告示牌/.test(buf);
  console.log(ok ? "PASS" : "FAIL", { id });
  ws.close();
  process.exit(ok ? 0 : 2);
}

ws.on("open", () => {
  console.log("OPEN", id);
  ws.send(
    JSON.stringify({
      type: "login",
      id,
      password: "Test1234",
      name: "测试",
      gender: "男性",
      register: true,
    })
  );
});

ws.on("error", (err) => console.error("ERR", err));
setTimeout(() => {
  console.log("TIMEOUT");
  console.log(buf.slice(-2000));
  process.exit(3);
}, 45000);
