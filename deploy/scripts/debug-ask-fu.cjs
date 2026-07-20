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
let asked = false;

function log(tag, obj) {
  console.log(
    tag,
    typeof obj === "string" ? obj : JSON.stringify(obj).slice(0, 400)
  );
}

ws.on("message", (data) => {
  const msg = JSON.parse(data.toString());
  log("MSG", {
    type: msg.type,
    text: msg.text && String(msg.text).slice(0, 160),
    event: msg.event && msg.event.type,
    title: msg.event && msg.event.title,
    message: msg.message,
  });
  if (
    msg.type === "ready" ||
    (msg.type === "text" && /目前权限|重新连线/.test(msg.text || ""))
  ) {
    if (!asked) {
      asked = true;
      setTimeout(() => {
        ws.send(JSON.stringify({ type: "cmd", command: "look" }));
        log("CMD", "look");
      }, 800);
      setTimeout(() => {
        ws.send(
          JSON.stringify({ type: "cmd", command: "ask fu about 侠客岛" })
        );
        log("CMD", "ask fu about 侠客岛");
      }, 2200);
    }
  }
  if (msg.type === "text" && msg.text) buf += msg.text;
  if (msg.type === "event" && msg.event) {
    buf +=
      "\n[event:" +
      msg.event.type +
      " title=" +
      (msg.event.title || "") +
      "]\n";
  }
});

ws.on("open", () => {
  log("OPEN", id);
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

ws.on("error", (err) => log("ERR", String(err)));

setTimeout(() => {
  console.log("---BUF---");
  console.log(buf.slice(-2500));
  const hit =
    /这里就是侠客岛|听不懂人话|没有这个人|没听说过|打听有关|渔夫说道/.test(
      buf
    );
  console.log("HIT:", hit);
  ws.close();
  process.exit(hit ? 0 : 2);
}, 10000);
