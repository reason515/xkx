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
const rooms = [];
ws.on("message", (data) => {
  const msg = JSON.parse(data.toString());
  if (msg.type === "event" && msg.event?.type === "room.update") {
    rooms.push({
      title: msg.event.title,
      path: msg.event.path,
      exits: msg.event.exits,
      doors: msg.event.doors,
    });
    console.log("ROOM", JSON.stringify(rooms[rooms.length - 1]));
  }
  if (msg.type === "text" && msg.text) {
    const t = String(msg.text);
    if (/测试|石门|打开|关闭|你必须/.test(t)) {
      console.log("TEXT", JSON.stringify(t).slice(0, 200));
    }
  }
  if (msg.type === "ready") {
    setTimeout(() => send("xkxe2e gate"), 400);
    setTimeout(() => send("xkxe2e closedoor"), 1200);
    setTimeout(() => send("look"), 2000);
    setTimeout(() => {
      console.log("SUMMARY", JSON.stringify(rooms, null, 2));
      ws.close();
      process.exit(0);
    }, 3200);
  }
});
ws.on("open", () => {
  ws.send(
    JSON.stringify({
      type: "login",
      id,
      password: "Test1234",
      name: "门态",
      gender: "男性",
      register: true,
    })
  );
});
setTimeout(() => process.exit(2), 10000);
