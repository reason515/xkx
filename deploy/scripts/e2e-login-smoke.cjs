#!/usr/bin/env node
/**
 * Server-side login/register smoke against local gateway + MUD.
 * Register mode（默认）：锁沙滩 → follow 张三/李四 → 主沙滩有出口 → 同密码重登。
 * Env:
 *   XKX_E2E_WS   default ws://127.0.0.1:3001/ws
 *   XKX_E2E_MODE login | register (default register)
 *   XKX_E2E_ID / XKX_E2E_PASSWORD  required for login mode
 *   XKX_E2E_SKIP_FOLLOW=1  仅验证进游戏（调试用）；默认走完整跟随链
 */
const path = require("path");
const WebSocket = require(
  path.join(__dirname, "../../gateway/node_modules/ws")
);

const WS_URL = process.env.XKX_E2E_WS || "ws://127.0.0.1:3001/ws";
const MODE = process.env.XKX_E2E_MODE || "register";
const SKIP_FOLLOW = process.env.XKX_E2E_SKIP_FOLLOW === "1";
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

function openSession(loginPayload, onMessage) {
  return new Promise((resolve, reject) => {
    const ws = new WebSocket(WS_URL);
    let buf = "";
    let gotReady = false;
    let gotRoom = false;
    let lastRoomTitle = "";
    let lastExits = [];
    let lastVitalsQi = null;
    let vitalsEvents = 0;
    let lastAssistMessage = "";
    let assistActive = false;
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
          lastExits,
          lastVitalsQi,
          vitalsEvents,
          lastAssistMessage,
          assistActive,
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
      lastExits: () => lastExits,
      lastVitalsQi: () => lastVitalsQi,
      vitalsEvents: () => vitalsEvents,
      lastAssistMessage: () => lastAssistMessage,
      assistActive: () => assistActive,
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
        if (Array.isArray(msg.event.exits)) lastExits = msg.event.exits;
      }
      if (msg.type === "event" && msg.event?.type === "player.vitals") {
        vitalsEvents += 1;
        const qi = msg.event?.vitals?.qi;
        if (typeof qi === "number") lastVitalsQi = qi;
      }
      if (msg.type === "event" && msg.event?.type === "assist.status") {
        lastAssistMessage = String(msg.event.message || "");
        assistActive = !!msg.event.active;
      }
      if (msg.type === "text" && msg.text) buf += msg.text;
      onMessage(api, msg);
    });
  });
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
          /目前权限|沙滩|客店|扬州|这里明显的出口|明显的出口|这里没有任何明显的出路/.test(
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
  let followTarget = "";
  let phase = "login";
  let beachTimer;
  let hurtSent = false;
  let qiBeforeHurt = null;
  let vitalsCountBeforeHurt = 0;
  let grindStarted = false;
  let grindStopped = false;
  let vitalsQiAfter = null;

  console.log("open", WS_URL, "register", id);

  try {
    const result = await openSession(
      {
        type: "login",
        id,
        password,
        name: process.env.XKX_E2E_NAME || "测试",
        gender: process.env.XKX_E2E_GENDER || "男",
        register: true,
      },
      (api, msg) => {
        const buf = api.buf();
        if (/BIG5|Do you want to use/i.test(buf)) {
          api.fail("login_banner_leaked");
          return;
        }
        if (/挂名处|register\s+\S+@/i.test(buf) && /木老/.test(buf)) {
          api.fail("unexpected_register_room");
          return;
        }

        if (api.gotReady() && phase === "login") {
          phase = "beach";
          setTimeout(() => api.sendCmd("look"), 1200);
        }

        if (SKIP_FOLLOW) {
          const inGameText =
            /目前权限|沙滩|这里明显的出口|明显的出口|这里没有任何明显的出路/.test(
              buf
            );
          if (api.gotReady() || api.gotRoom() || inGameText) {
            clearTimeout(beachTimer);
            beachTimer = setTimeout(() => {
              api.done({ reason: "ready_skip_follow" });
            }, 1200);
          }
          return;
        }

        if (!sentFollow) {
          const hinted = buf.match(/follow\s+(zhang san|li si)/i);
          let target = hinted ? hinted[1].toLowerCase() : "";
          if (!target) {
            if (/Zhang san/i.test(buf)) target = "zhang san";
            else if (/Li si/i.test(buf)) target = "li si";
          }
          if (
            !target &&
            msg.type === "event" &&
            msg.event?.type === "room.update"
          ) {
            const npcs = Array.isArray(msg.event.npcs) ? msg.event.npcs : [];
            for (const n of npcs) {
              const nid = String(n.id || "").toLowerCase();
              const nname = String(n.name || "");
              if (nid === "zhang san" || /张三/.test(nname)) {
                target = "zhang san";
                break;
              }
              if (nid === "li si" || /李四/.test(nname)) {
                target = "li si";
                break;
              }
            }
          }
          if (target) {
            sentFollow = true;
            followTarget = target;
            phase = "follow";
            console.log("follow", followTarget);
            api.sendCmd(`follow ${followTarget}`);
            setTimeout(() => api.sendCmd("look"), 2500);
            setTimeout(() => api.sendCmd("look"), 5500);
          }
        }

        if (phase === "hurt") {
          const qi = api.lastVitalsQi();
          const gotNewVitals = api.vitalsEvents() > vitalsCountBeforeHurt;
          const dropped =
            typeof qi === "number" &&
            (qiBeforeHurt == null || qi < qiBeforeHurt);
          if (gotNewVitals && dropped) {
            clearTimeout(beachTimer);
            vitalsQiAfter = qi;
            phase = "grind";
            console.log("xkxe2e grindprep");
            api.sendCmd("xkxe2e grindprep");
            setTimeout(() => {
              console.log("webassist grind haigui_s 30");
              api.sendCmd("webassist grind haigui_s 30");
              beachTimer = setTimeout(() => {
                api.fail("grind_assist_not_started");
              }, 8000);
            }, 1200);
          }
          return;
        }

        if (phase === "grind") {
          const msg = api.lastAssistMessage() || "";
          if (!grindStarted && api.assistActive() && /挂机打怪/.test(msg)) {
            grindStarted = true;
            clearTimeout(beachTimer);
            console.log("grind started", msg);
            api.sendCmd("webassist stop");
            beachTimer = setTimeout(() => {
              api.fail("grind_assist_not_stopped");
            }, 8000);
            return;
          }
          if (
            grindStarted &&
            !grindStopped &&
            (!api.assistActive() || /停止|手动/.test(msg))
          ) {
            grindStopped = true;
            clearTimeout(beachTimer);
            api.done({
              reason: "follow_to_main_beach",
              follow: followTarget,
              roomTitle: api.lastRoomTitle(),
              exits: (api.lastExits() || []).length,
              vitalsQiBefore: qiBeforeHurt,
              vitalsQiAfter,
              vitalsPush: true,
              grindAssist: true,
            });
          }
          return;
        }

        if (sentFollow) {
          const title = api.lastRoomTitle() || "";
          const exits = api.lastExits() || [];
          const hasExit =
            exits.length > 0 ||
            /这里明显的出口|明显的出口是/.test(buf);
          const atMainBeach =
            /沙滩/.test(title) &&
            !/挂名/.test(title) &&
            hasExit &&
            (/渔夫|north|east|northwest/i.test(buf) || exits.length > 0);
          const escorted =
            /先在岛上四处看看|熟悉一下环境/.test(buf) || atMainBeach;
          if (escorted && hasExit && !hurtSent) {
            hurtSent = true;
            clearTimeout(beachTimer);
            beachTimer = setTimeout(() => {
              if (/挂名处/.test(api.buf())) {
                api.fail("landed_at_register");
                return;
              }
              // 先拉一次 hp 作基线，再 hurt，断言伤害路径推送更低的 qi
              api.sendCmd("hp");
              setTimeout(() => {
                phase = "hurt";
                qiBeforeHurt =
                  typeof api.lastVitalsQi() === "number"
                    ? api.lastVitalsQi()
                    : null;
                vitalsCountBeforeHurt = api.vitalsEvents();
                console.log("xkxe2e hurt", "qiBefore", qiBeforeHurt);
                api.sendCmd("xkxe2e hurt");
                beachTimer = setTimeout(() => {
                  api.fail("vitals_not_pushed_after_hurt");
                }, 8000);
              }, 1200);
            }, 1500);
          }
        }
      }
    );

    if (SKIP_FOLLOW) {
      report(0, {
        reason: result.reason || "ready_skip_follow",
        ms: result.ms,
        ready: result.gotReady,
        room: result.gotRoom,
      });
      return;
    }

    console.log("relogin", id);
    phase = "relogin";
    let reloginTimer;
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
          /目前权限|沙滩|这里明显的出口|明显的出口|这里没有任何明显的出路/.test(
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
      reason: "newbie_follow_relogin",
      ms: result.ms + relogin.ms,
      follow: followTarget || undefined,
      roomTitle: result.lastRoomTitle || undefined,
      vitalsQiBefore: result.vitalsQiBefore,
      vitalsQiAfter: result.vitalsQiAfter,
      vitalsPush: result.vitalsPush,
      grindAssist: result.grindAssist,
      ready: relogin.gotReady,
      room: relogin.gotRoom,
      tail: relogin.buf.slice(-800),
    });
  } catch (e) {
    failReport(e, { phase, follow: followTarget || undefined });
  }
}

if (MODE === "login") runLoginOnly();
else runNewbiePath();
