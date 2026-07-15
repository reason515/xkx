import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { stripJsonFrames } from "./session.js";

/**
 * Mirror of MudSession.extractJsonEvents — guards against infinite loop / OOM
 * when @@JSON@@ frames appear in the stream.
 */
function extractJsonEvents(state, chunk) {
  state.jsonBuffer += chunk;
  if (state.jsonBuffer.length > 200000) {
    state.jsonBuffer = state.jsonBuffer.slice(-100000);
  }
  let plain = state.jsonBuffer.replace(
    /\x1b(?:\[[0-9;?]*[ -/]*[@-~]|\][^\x07\x1b]*(?:\x07|\x1b\\)?)/g,
    ""
  );
  const events = [];
  let start;
  while ((start = plain.indexOf("@@JSON@@")) !== -1) {
    const end = plain.indexOf("@@ENDJSON@@", start);
    if (end === -1) {
      state.jsonBuffer = state.jsonBuffer.slice(-8000);
      return events;
    }
    const payload = plain.slice(start + 8, end).trim();
    try {
      events.push(JSON.parse(payload));
    } catch {
      /* ignore */
    }
    plain = plain.slice(end + 11);
  }
  state.jsonBuffer = plain.includes("@@JSON@@") ? plain : plain.slice(-2000);
  return events;
}

describe("extractJsonEvents", () => {
  it("parses one frame without hanging", () => {
    const state = { jsonBuffer: "" };
    const events = extractJsonEvents(
      state,
      'hello @@JSON@@{"v":1,"type":"assist.status","active":0}@@ENDJSON@@\n>'
    );
    assert.equal(events.length, 1);
    assert.equal(events[0].type, "assist.status");
    assert.ok(state.jsonBuffer.length < 100);
  });

  it("parses two frames in one chunk", () => {
    const state = { jsonBuffer: "" };
    const events = extractJsonEvents(
      state,
      '@@JSON@@{"v":1,"type":"a"}@@ENDJSON@@@@JSON@@{"v":1,"type":"b"}@@ENDJSON@@'
    );
    assert.deepEqual(
      events.map((e) => e.type),
      ["a", "b"]
    );
  });

  it("does not retain entire mud transcript when no JSON", () => {
    const state = { jsonBuffer: "" };
    const big = "x".repeat(5000);
    extractJsonEvents(state, big);
    assert.ok(state.jsonBuffer.length <= 2000);
  });
});

describe("stripJsonFrames", () => {
  it("removes JSON frames so escaped newlines do not leak to 见闻", () => {
    const raw =
      '你来到沙滩。\n@@JSON@@{"v":1,"type":"room.update","long":"蓝蓝的大海\\n岸边"}@@ENDJSON@@\n渔夫朝你微笑。';
    const cleaned = stripJsonFrames(raw);
    assert.equal(cleaned.includes("@@JSON@@"), false);
    assert.equal(cleaned.includes("@@ENDJSON@@"), false);
    assert.equal(cleaned.includes("\\n"), false);
    assert.match(cleaned, /你来到沙滩/);
    assert.match(cleaned, /渔夫朝你微笑/);
  });

  it("drops incomplete frame from marker onward", () => {
    const cleaned = stripJsonFrames('前缀@@JSON@@{"type":"room.update"');
    assert.equal(cleaned, "前缀");
  });

  it("leaves normal text unchanged", () => {
    assert.equal(stripJsonFrames("你好\n世界"), "你好\n世界");
  });

  it("preserves ANSI in player text for the presentation conversion", () => {
    const cleaned = stripJsonFrames(
      "\x1b[31m警讯\x1b[0m@@JSON@@{\"type\":\"room.update\"}@@ENDJSON@@"
    );
    assert.equal(cleaned, "\x1b[31m警讯\x1b[0m");
  });
});
