const WebSocket = require("/opt/xkx/gateway/node_modules/ws");
const id = "stk" + Math.random().toString(36).slice(2, 6);
const ws = new WebSocket("ws://127.0.0.1:3001/ws");
let buf = "";
let n = 0;
const t0 = Date.now();
const log = (m) => console.log(Date.now() - t0 + "ms", m);

ws.on("open", () => {
  log("open");
  ws.send(
    JSON.stringify({
      type: "login",
      id,
      password: "Test1234",
      name: "卡测",
      gender: "男",
      register: true,
    })
  );
});

ws.on("message", (raw) => {
  n++;
  let msg;
  try {
    msg = JSON.parse(raw.toString());
  } catch {
    return;
  }
  if (msg.type === "text" && msg.data) {
    buf += msg.data;
    if (n <= 5 || /目前权限|沙滩|精疲|忙|出口/.test(msg.data)) {
      log("text:" + JSON.stringify(msg.data).slice(0, 140));
    }
  }
  if (msg.type === "event") {
    log(
      "ev:" +
        msg.event?.type +
        (msg.event?.title ? " " + msg.event.title : "") +
        (msg.event?.message ? " " + msg.event.message : "")
    );
  }
  if (msg.type === "event" && msg.event?.type === "ready") {
    setTimeout(() => {
      log("cmd look");
      ws.send(JSON.stringify({ type: "cmd", command: "look" }));
    }, 400);
    setTimeout(() => {
      log("cmd go north");
      ws.send(JSON.stringify({ type: "cmd", command: "go north" }));
    }, 1800);
    setTimeout(() => {
      log("cmd hp");
      ws.send(JSON.stringify({ type: "cmd", command: "hp" }));
    }, 3200);
    setTimeout(() => {
      log("done msgs=" + n + " buflen=" + buf.length);
      log("tail=" + JSON.stringify(buf.slice(-300)));
      ws.close();
      process.exit(0);
    }, 7000);
  }
});

ws.on("error", (e) => {
  console.error(e);
  process.exit(1);
});
setTimeout(() => {
  log("TIMEOUT msgs=" + n + " buflen=" + buf.length);
  process.exit(2);
}, 20000);
