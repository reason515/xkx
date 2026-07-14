const WebSocket = require("ws");

const uid = "t" + Date.now().toString().slice(-5);
const ws = new WebSocket("ws://127.0.0.1:3001");
let buf = "";

ws.on("open", () => {
  ws.send(
    JSON.stringify({
      type: "auth",
      mode: "register",
      id: uid,
      password: "Test1234",
      name: "测试",
      gender: "male",
    })
  );
  console.log("sent", uid);
});

ws.on("message", (d) => {
  const m = JSON.parse(d.toString());
  if (m.type === "text") {
    buf += m.text || "";
    console.log("TEXT", JSON.stringify(m.text).slice(0, 180));
  } else {
    console.log("MSG", m.type, JSON.stringify(m).slice(0, 160));
  }
  if ((buf.match(/什么？/g) || []).length > 3) {
    console.log("FAIL spam");
    process.exit(2);
  }
});

setTimeout(() => {
  console.log("---TAIL---");
  console.log(buf.slice(-900));
  process.exit(0);
}, 20000);
