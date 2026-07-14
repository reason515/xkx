const WebSocket = require("ws");

const letters = "abcdefghijklmnopqrstuvwxyz";
let uid = "";
for (let i = 0; i < 6; i++) uid += letters[Math.floor(Math.random() * 26)];

const ws = new WebSocket("ws://127.0.0.1:3001/ws");
let buf = "";

ws.on("error", (e) => {
  console.log("ERR", e.message);
  process.exit(1);
});

ws.on("open", () => {
  ws.send(
    JSON.stringify({
      type: "login",
      register: true,
      id: uid,
      password: "Test1234",
      name: "测试",
      gender: "男",
    })
  );
  console.log("sent", uid);
});

ws.on("message", (d) => {
  const m = JSON.parse(d.toString());
  if (m.type === "text") {
    buf += m.text || "";
    const t = (m.text || "").replace(/\s+/g, " ").slice(0, 160);
    if (t.trim()) console.log("TEXT", t);
  } else {
    console.log("MSG", m.type, JSON.stringify(m).slice(0, 200));
  }
  if ((buf.match(/什么？/g) || []).length > 3) {
    console.log("FAIL spam");
    process.exit(2);
  }
});

setTimeout(() => {
  console.log("---TAIL---");
  console.log(buf.slice(-1500));
  const spam = (buf.match(/什么？/g) || []).length > 3;
  const inGame =
    /目前所在|欢迎你来到|进入游戏|客店|扬州|沙滩|挂名处|目前权限/.test(buf);
  console.log("RESULT", spam ? "spam" : inGame ? "in_game" : "unknown");
  process.exit(spam ? 2 : 0);
}, 35000);
