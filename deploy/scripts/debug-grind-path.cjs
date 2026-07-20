const path = require("path");
const WebSocket = require(path.join(__dirname, "../../gateway/node_modules/ws"));

const WS = process.env.XKX_E2E_WS || "ws://127.0.0.1:3001/ws";
const START = process.env.XKX_GRIND_START || "dadong"; // dadong|yingbin|grindprep|shatan
const TARGET = process.env.XKX_GRIND_TARGET || "haigui_s";
const id = "gdbg" + Math.random().toString(36).slice(2, 6);

function log(m) {
  console.log(new Date().toISOString().slice(11, 19), m);
}

function openSession() {
  return new Promise((resolve, reject) => {
    const ws = new WebSocket(WS);
    let buf = "";
    const assist = [];
    const rooms = [];
    let ready = false;
    let done = false;
    const send = (obj) => ws.send(JSON.stringify(obj));
    const cmd = (c) => send({ type: "cmd", command: c });

    const timer = setTimeout(() => {
      if (!done) {
        done = true;
        reject(
          Object.assign(new Error("timeout"), {
            assist,
            rooms,
            buf: buf.slice(-1200),
          })
        );
      }
    }, 55000);

    ws.on("open", () => {
      send({
        type: "login",
        id,
        password: "Test1234",
        name: "路测",
        gender: "男",
        register: true,
      });
    });

    ws.on("message", (raw) => {
      let msg;
      try {
        msg = JSON.parse(raw.toString());
      } catch {
        return;
      }
      if (msg.type === "text" && msg.data) buf += msg.data;
      if (msg.type === "event" && msg.event) {
        const ev = msg.event;
        if (ev.type === "assist.status") {
          assist.push({ active: !!ev.active, message: String(ev.message || "") });
          log("assist active=" + !!ev.active + " " + (ev.message || ""));
        }
        if (ev.type === "room.update") {
          const title = ev.title || ev.short || "?";
          rooms.push(title);
          log("room " + title);
        }
        if (ev.type === "ready") {
          ready = true;
          log("ready");
        }
      }
    });

    ws.on("error", reject);

    const waitReady = setInterval(() => {
      if (!ready && !/目前权限|沙滩/.test(buf)) return;
      clearInterval(waitReady);
      log("start@" + START + " target=" + TARGET);
      if (START === "dadong") cmd("xkxe2e dadong");
      else if (START === "yingbin") cmd("xkxe2e yingbin");
      else if (START === "grindprep") cmd("xkxe2e grindprep");
      else log("stay at landing beach");

      setTimeout(() => {
        log("webassist grind " + TARGET + " 30");
        cmd("webassist grind " + TARGET + " 30");
        setTimeout(() => {
          log("webassist stop");
          cmd("webassist stop");
          setTimeout(() => {
            done = true;
            clearTimeout(timer);
            resolve({ assist, rooms, buf: buf.slice(-1500) });
            ws.close();
          }, 1200);
        }, 20000);
      }, 1800);
    }, 400);
  });
}

openSession()
  .then((r) => {
    console.log(
      JSON.stringify(
        {
          assist: r.assist,
          rooms: r.rooms,
          tail: r.buf.slice(-500),
        },
        null,
        2
      )
    );
    const went = r.assist.some((a) =>
      /前往|另寻|开战|交手|等候|挂机中/.test(a.message || "")
    );
    const failed = r.assist.some((a) => !a.active && a.message);
    if (!went && !failed) {
      console.error("NO_ASSIST_FEEDBACK");
      process.exit(2);
    }
    if (failed && !went) {
      console.error("ASSIST_FAILED_ONLY", r.assist);
      process.exit(3);
    }
    process.exit(0);
  })
  .catch((e) => {
    console.error("FAIL", e.message);
    console.log(
      JSON.stringify({ assist: e.assist, rooms: e.rooms, buf: e.buf }, null, 2)
    );
    process.exit(1);
  });
