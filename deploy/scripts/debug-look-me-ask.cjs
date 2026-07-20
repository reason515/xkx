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
let phase = 0;

ws.on("message", (data) => {
  const msg = JSON.parse(data.toString());
  if (msg.type === "text" && msg.text) {
    buf += msg.text;
    console.log("T", JSON.stringify(msg.text).slice(0, 180));
  }
  if (msg.type === "ready" && phase === 0) {
    phase = 1;
    setTimeout(() => {
      ws.send(JSON.stringify({ type: "cmd", command: "look me" }));
      console.log("CMD look me");
    }, 1000);
    setTimeout(() => {
      ws.send(JSON.stringify({ type: "cmd", command: "ask fu about 侠客岛" }));
      console.log("CMD ask");
    }, 2500);
  }
});

ws.on("open", () => {
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

setTimeout(() => {
  console.log("lookMeFail", /你要看什么/.test(buf));
  console.log("lookMeOk", /看起来|身上带|多岁/.test(buf));
  console.log("askOk", /这里就是侠客岛/.test(buf));
  ws.close();
  process.exit(/这里就是侠客岛/.test(buf) && !/你要看什么/.test(buf) ? 0 : 2);
}, 6000);
