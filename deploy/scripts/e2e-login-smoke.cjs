#!/usr/bin/env node
/**
 * Server-side login/register smoke against local gateway + MUD.
 * Exit 0 = reached in-game (ready / room / look text).
 * Register mode also walks 沙滩 → follow → 挂名处.
 * Env:
 *   XKX_E2E_WS   default ws://127.0.0.1:3001/ws
 *   XKX_E2E_MODE login | register (default register)
 *   XKX_E2E_ID / XKX_E2E_PASSWORD  required for login mode
 *   XKX_E2E_SKIP_FOLLOW=1  skip newbie follow check
 */
const path = require("path");
const WebSocket = require(
  path.join(__dirname, "../../gateway/node_modules/ws")
);

const WS_URL = process.env.XKX_E2E_WS || "ws://127.0.0.1:3001/ws";
const MODE = process.env.XKX_E2E_MODE || "register";
const SKIP_FOLLOW = process.env.XKX_E2E_SKIP_FOLLOW === "1";
const TIMEOUT_MS = Number(
  process.env.XKX_E2E_TIMEOUT_MS || (MODE === "register" ? 90000 : 45000)
);

function randomId() {
  const letters = "abcdefghijklmnopqrstuvwxyz";
  let id = "";
  for (let i = 0; i < 6; i++) id += letters[Math.floor(Math.random() * 26)];
  return id;
}

const id =
  MODE === "login"
    ? process.env.XKX_E2E_ID
    : process.env.XKX_E2E_ID || randomId();
const password =
  MODE === "login"
    ? process.env.XKX_E2E_PASSWORD
    : process.env.XKX_E2E_PASSWORD || "Test1234";

if (!id || !password) {
  console.error("Missing XKX_E2E_ID / XKX_E2E_PASSWORD");
  process.exit(2);
}

const payload = {
  type: "login",
  id,
  password,
  name: process.env.XKX_E2E_NAME || "测试",
  gender: process.env.XKX_E2E_GENDER || "男",
  register: MODE !== "login",
};

let buf = "";
let gotReady = false;
let gotRoom = false;
let lastRoomTitle = "";
let gotError = "";
let sentFollow = false;
let followTarget = "";
let phase = "login"; // login | beach | follow | done
const started = Date.now();

let finished = false;
function done(code, reason) {
  if (finished) return;
  finished = true;
  try {
    ws.close();
  } catch {
    /* ignore */
  }
  console.log(
    JSON.stringify({
      result: code === 0 ? "pass" : "fail",
      reason,
      mode: MODE,
      id,
      ms: Date.now() - started,
      ready: gotReady,
      room: gotRoom,
      roomTitle: lastRoomTitle || undefined,
      follow: followTarget || undefined,
      error: gotError || undefined,
      tail: buf.slice(-800),
    })
  );
  process.exit(code);
}

function sendCmd(cmd) {
  ws.send(JSON.stringify({ type: "cmd", command: cmd }));
}

function tryFollow() {
  if (sentFollow || SKIP_FOLLOW || MODE !== "register") return;
  // Prefer explicit hint; else infer from look inventory (问候可能落在 ready 前被吞)
  const hinted = buf.match(/follow\s+(zhang san|li si)/i);
  let target = hinted ? hinted[1].toLowerCase() : "";
  if (!target) {
    if (/张三\s*\(\s*Zhang san\s*\)/i.test(buf) || /Zhang san/i.test(buf)) {
      target = "zhang san";
    } else if (/李四\s*\(\s*Li si\s*\)/i.test(buf) || /Li si/i.test(buf)) {
      target = "li si";
    }
  }
  if (!target || !/沙滩/.test(buf)) return;
  followTarget = target;
  sentFollow = true;
  phase = "follow";
  console.log("follow", followTarget);
  sendCmd(`follow ${followTarget}`);
  // 传送约 5s；之后再 look 以拿到挂名处 room.update
  setTimeout(() => sendCmd("look"), 6000);
}

function latestRoomTitle() {
  const matches = [
    ...buf.matchAll(/"type"\s*:\s*"room\.update"\s*,\s*"title"\s*:\s*"([^"]+)"/g),
  ];
  if (matches.length) return matches[matches.length - 1][1];
  return lastRoomTitle;
}

function checkPass() {
  if (/BIG5|Do you want to use/i.test(buf)) {
    done(1, "login_banner_leaked");
    return;
  }

  if (MODE !== "register" || SKIP_FOLLOW) {
    const inGameText =
      /目前权限|沙滩|客店|扬州|挂名处|这里明显的出口|明显的出口|这里没有任何明显的出路/.test(
        buf
      );
    const okRoom = gotRoom || inGameText || /沙滩|客店|扬州|挂名/.test(buf);
    if (!okRoom && !gotReady) return;
    done(0, gotRoom ? "room.update" : inGameText ? "text_in_game" : "ready");
    return;
  }

  // Newbie path: beach → follow → 挂名处 (title from latest room.update in buf)
  const title = latestRoomTitle();
  const atRegister =
    /挂名/.test(title || "") ||
    /侠客岛挂名处\s*-/.test(buf) ||
    (/这是一个大厅/.test(buf) && /木老七|登记使|register\s+/i.test(buf));
  if (atRegister) {
    if (/沙滩/.test(title || "") && !/挂名/.test(title || "")) {
      // Text arrived before event; wait for next room.update unless look title is clear
      if (!/侠客岛挂名处\s*-/.test(buf)) return;
    }
    done(0, "newbie_follow_register");
    return;
  }

  if (!sentFollow) tryFollow();
}

const ws = new WebSocket(WS_URL);

ws.on("error", (e) => done(1, `ws_error:${e.message}`));

ws.on("open", () => {
  console.log("open", WS_URL, MODE, id);
  ws.send(JSON.stringify(payload));
});

ws.on("message", (raw) => {
  let msg;
  try {
    msg = JSON.parse(raw.toString());
  } catch {
    return;
  }

  if (msg.type === "error") {
    gotError = msg.message || "error";
    done(1, `login_error:${gotError}`);
    return;
  }
  if (msg.type === "ready") {
    gotReady = true;
    phase = "beach";
    // 等 webassist mark_web 生效后再 look，避免 look 抢在 mark 之前导致无 room.update
    setTimeout(() => sendCmd("look"), 1200);
  }
  if (msg.type === "event" && msg.event?.type === "room.update") {
    gotRoom = true;
    if (msg.event.title) lastRoomTitle = String(msg.event.title);
  }
  if (msg.type === "text" && msg.text) {
    buf += msg.text;
  }

  checkPass();
});

setTimeout(() => {
  if ((buf.match(/什么？/g) || []).length > 3) {
    done(1, "spam_什么");
    return;
  }
  done(1, `timeout:${phase}`);
}, TIMEOUT_MS);
