#!/usr/bin/env node
/**
 * Server-side login/register smoke against local gateway + MUD.
 * Register mode（默认）：进游戏即可（Web 已跳过迎宾/挂名）。
 * Env:
 *   XKX_E2E_WS   default ws://127.0.0.1:3001/ws
 *   XKX_E2E_MODE login | register (default register)
 *   XKX_E2E_ID / XKX_E2E_PASSWORD  required for login mode
 *   XKX_E2E_SKIP_FOLLOW=0  强制走旧：沙滩 → follow → 挂名 → 重登
 *   （默认跳过跟随/挂名，等同 SKIP_FOLLOW=1）
 */
const path = require("path");
const WebSocket = require(
  path.join(__dirname, "../../gateway/node_modules/ws")
);

const WS_URL = process.env.XKX_E2E_WS || "ws://127.0.0.1:3001/ws";
const MODE = process.env.XKX_E2E_MODE || "register";
const SKIP_FOLLOW = process.env.XKX_E2E_SKIP_FOLLOW !== "0";
const TIMEOUT_MS = Number(
  process.env.XKX_E2E_TIMEOUT_MS || (MODE === "register" ? 120000 : 45000)
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

const email = process.env.XKX_E2E_EMAIL || `${id}@e2e.example.com`;

const PASSWORD_KEPT_RE =
  /挂名登记完成|请继续使用你原来的密码|原来的密码登录/;
const PASSWORD_RESET_RE = /您的新密码是|请用新的密码连线/;

function openSession(loginPayload, onMessage) {
  return new Promise((resolve, reject) => {
    const ws = new WebSocket(WS_URL);
    let buf = "";
    let gotReady = false;
    let gotRoom = false;
    let lastRoomTitle = "";
    let gotError = "";
    const started = Date.now();
    let settled = false;

    const finish = (err, result) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      try {
        ws.close();
      } catch {
        /* ignore */
      }
      if (err) {
        err.buf = buf;
        err.gotReady = gotReady;
        err.gotRoom = gotRoom;
        err.lastRoomTitle = lastRoomTitle;
        err.gotError = gotError;
        reject(err);
      } else {
        resolve({
          ...result,
          buf,
          gotReady,
          gotRoom,
          lastRoomTitle,
          ms: Date.now() - started,
        });
      }
    };

    const timer = setTimeout(() => {
      const err = new Error("session_timeout");
      finish(err);
    }, TIMEOUT_MS);

    const api = {
      sendCmd: (cmd) =>
        ws.send(JSON.stringify({ type: "cmd", command: cmd })),
      buf: () => buf,
      gotReady: () => gotReady,
      gotRoom: () => gotRoom,
      lastRoomTitle: () => lastRoomTitle,
      done: (result) => finish(null, result || {}),
      fail: (reason) => finish(new Error(reason)),
    };

    ws.on("error", (e) => finish(new Error(`ws_error:${e.message}`)));

    ws.on("open", () => {
      ws.send(JSON.stringify(loginPayload));
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
        finish(new Error(`login_error:${gotError}`));
        return;
      }
      if (msg.type === "ready") gotReady = true;
      if (msg.type === "event" && msg.event?.type === "room.update") {
        gotRoom = true;
        if (msg.event.title) lastRoomTitle = String(msg.event.title);
      }
      if (msg.type === "text" && msg.text) buf += msg.text;
      onMessage(api, msg);
    });
  });
}

function latestRoomTitle(buf, fallback) {
  const matches = [
    ...buf.matchAll(
      /"type"\s*:\s*"room\.update"\s*,\s*"title"\s*:\s*"([^"]+)"/g
    ),
  ];
  if (matches.length) return matches[matches.length - 1][1];
  return fallback;
}

function report(code, fields) {
  console.log(
    JSON.stringify({
      result: code === 0 ? "pass" : "fail",
      mode: MODE,
      id,
      ...fields,
    })
  );
  process.exit(code);
}

function failReport(e, extra = {}) {
  report(1, {
    reason: e.message,
    ready: e.gotReady,
    room: e.gotRoom,
    error: e.gotError,
    tail: (e.buf || "").slice(-800),
    ...extra,
  });
}

async function runLoginOnly() {
  console.log("open", WS_URL, "login", id);
  let passTimer;
  try {
    const result = await openSession(
      {
        type: "login",
        id,
        password,
        name: process.env.XKX_E2E_NAME || "测试",
        gender: process.env.XKX_E2E_GENDER || "男",
        register: false,
      },
      (api) => {
        if (/BIG5|Do you want to use/i.test(api.buf())) {
          api.fail("login_banner_leaked");
          return;
        }
        const inGameText =
          /目前权限|沙滩|客店|扬州|挂名处|这里明显的出口|明显的出口|这里没有任何明显的出路/.test(
            api.buf()
          );
        if (api.gotReady() || api.gotRoom() || inGameText) {
          clearTimeout(passTimer);
          passTimer = setTimeout(() => {
            api.done({
              reason: api.gotRoom()
                ? "room.update"
                : inGameText
                  ? "text_in_game"
                  : "ready",
            });
          }, 1200);
        }
      }
    );
    report(0, {
      reason: result.reason,
      ms: result.ms,
      ready: result.gotReady,
      room: result.gotRoom,
      tail: result.buf.slice(-800),
    });
  } catch (e) {
    failReport(e);
  }
}

async function runNewbiePath() {
  let sentFollow = false;
  let sentRegister = false;
  let followTarget = "";
  let phase = "login";
  let registerTimer;

  console.log("open", WS_URL, "register", id);

  try {
    await openSession(
      {
        type: "login",
        id,
        password,
        name: process.env.XKX_E2E_NAME || "测试",
        gender: process.env.XKX_E2E_GENDER || "男",
        register: true,
      },
      (api) => {
        const buf = api.buf();
        if (/BIG5|Do you want to use/i.test(buf)) {
          api.fail("login_banner_leaked");
          return;
        }

        if (api.gotReady() && phase === "login") {
          phase = "beach";
          setTimeout(() => api.sendCmd("look"), 1200);
        }

        if (SKIP_FOLLOW) {
          const inGameText =
            /目前权限|沙滩|客店|扬州|挂名处|这里明显的出口|明显的出口|这里没有任何明显的出路/.test(
              buf
            );
          if (api.gotReady() || api.gotRoom() || inGameText) {
            setTimeout(
              () =>
                api.done({
                  reason: api.gotRoom()
                    ? "room.update"
                    : inGameText
                      ? "text_in_game"
                      : "ready",
                }),
              1200
            );
          }
          return;
        }

        if (!sentFollow && /沙滩/.test(buf)) {
          const hinted = buf.match(/follow\s+(zhang san|li si)/i);
          let target = hinted ? hinted[1].toLowerCase() : "";
          if (!target) {
            if (/Zhang san/i.test(buf)) target = "zhang san";
            else if (/Li si/i.test(buf)) target = "li si";
          }
          if (target) {
            sentFollow = true;
            followTarget = target;
            phase = "follow";
            console.log("follow", followTarget);
            api.sendCmd(`follow ${followTarget}`);
            setTimeout(() => api.sendCmd("look"), 4000);
          }
        }

        const title = latestRoomTitle(buf, api.lastRoomTitle());
        const atRegister =
          /挂名/.test(title || "") ||
          /侠客岛挂名处\s*-/.test(buf) ||
          (/这是一个大厅/.test(buf) &&
            /木老七|登记使|register\s+/i.test(buf));

        if (atRegister && !sentRegister) {
          if (/沙滩/.test(title || "") && !/挂名/.test(title || "")) {
            if (!/侠客岛挂名处\s*-/.test(buf)) return;
          }
          sentRegister = true;
          phase = "register";
          console.log("register", email);
          api.sendCmd(`register ${email}`);
          clearTimeout(registerTimer);
          registerTimer = setTimeout(() => {
            if (PASSWORD_RESET_RE.test(api.buf())) {
              api.fail("password_was_reset");
              return;
            }
            api.done({
              reason: "newbie_registered",
              follow: followTarget,
              passwordKept: PASSWORD_KEPT_RE.test(api.buf()),
            });
          }, 2500);
        }

        if (sentRegister && PASSWORD_RESET_RE.test(buf)) {
          clearTimeout(registerTimer);
          api.fail("password_was_reset");
        }
      }
    );
  } catch (e) {
    failReport(e, { phase, follow: followTarget || undefined });
    return;
  }

  if (SKIP_FOLLOW) {
    report(0, { reason: "ready_skip_follow", follow: followTarget || undefined });
    return;
  }

  // Re-login with the same password — must not get 密码错误
  console.log("relogin", id);
  phase = "relogin";
  let reloginTimer;
  try {
    const relogin = await openSession(
      {
        type: "login",
        id,
        password,
        name: process.env.XKX_E2E_NAME || "测试",
        gender: process.env.XKX_E2E_GENDER || "男",
        register: false,
      },
      (api) => {
        const buf = api.buf();
        if (/密码错误/.test(buf)) {
          api.fail("relogin_password_rejected");
          return;
        }
        if (/BIG5|Do you want to use/i.test(buf)) {
          api.fail("login_banner_leaked");
          return;
        }
        const inGame =
          api.gotReady() ||
          api.gotRoom() ||
          /目前权限|沙滩|客店|扬州|挂名处|这里明显的出口|明显的出口|这里没有任何明显的出路/.test(
            buf
          );
        if (inGame) {
          clearTimeout(reloginTimer);
          reloginTimer = setTimeout(() => {
            if (/密码错误/.test(api.buf())) {
              api.fail("relogin_password_rejected");
              return;
            }
            api.done({ reason: "relogin_same_password" });
          }, 1500);
        }
      }
    );
    report(0, {
      reason: "newbie_register_relogin",
      ms: relogin.ms,
      follow: followTarget || undefined,
      ready: relogin.gotReady,
      room: relogin.gotRoom,
      roomTitle: relogin.lastRoomTitle || undefined,
      tail: relogin.buf.slice(-800),
    });
  } catch (e) {
    failReport(e, { phase: "relogin", follow: followTarget || undefined });
  }
}

if (MODE === "login") runLoginOnly();
else runNewbiePath();
