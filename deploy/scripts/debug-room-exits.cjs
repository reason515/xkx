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
}
ws.on("message", (data) => {
  const msg = JSON.parse(data.toString());
  if (msg.type === "event" && msg.event?.type === "room.update") {
    const e = msg.event;
    console.log("keys", Object.keys(e));
    console.log("exits type", typeof e.exits, Array.isArray(e.exits), JSON.stringify(e.exits));
    console.log("doors type", typeof e.doors, Array.isArray(e.doors), JSON.stringify(e.doors));
    console.log("npcs", JSON.stringify(e.npcs));
    console.log("items", JSON.stringify(e.items));
    console.log("title", e.title, "path", e.path, "area", e.area);
    console.log("longLen", (e.long || "").length);
  }
  if (msg.type === "text" && msg.text) {
    const t = String(msg.text);
    if (t.includes("north") || t.includes("出口")) {
      console.log("TEXT", JSON.stringify(t).slice(0, 400));
    }
  }
  if (msg.type === "ready") {
    setTimeout(() => send("look"), 500);
    setTimeout(() => {
      ws.close();
      process.exit(0);
    }, 2500);
  }
});
ws.on("open", () => {
  ws.send(
    JSON.stringify({
      type: "login",
      id,
      password: "Test1234",
      name: "出口测",
      gender: "男性",
      register: true,
    })
  );
});
setTimeout(() => process.exit(2), 8000);
