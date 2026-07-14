const WebSocket = require("ws");
const ws = new WebSocket("ws://127.0.0.1:3001/ws");
ws.on("open", () => {
  ws.send(
    JSON.stringify({
      type: "login",
      id: "tester",
      password: "test1234",
      name: "测试",
      gender: "男",
      register: true,
    })
  );
});
ws.on("message", (d) => console.log("MSG", d.toString().slice(0, 400)));
ws.on("error", (e) => console.log("ERR", e.message));
ws.on("close", () => console.log("CLOSE"));
setTimeout(() => process.exit(0), 8000);
