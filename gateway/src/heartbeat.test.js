import { test } from "node:test";
import assert from "node:assert/strict";
import { MAX_MISSED_PINGS, shouldReapClient } from "./heartbeat.js";

test("单次丢包不判定死亡（网络抖动容忍）", () => {
  assert.equal(shouldReapClient(0), false);
  assert.equal(shouldReapClient(1), false);
  assert.equal(shouldReapClient(MAX_MISSED_PINGS - 1), false);
});

test("连续多次未回 pong 才判定死亡", () => {
  assert.equal(shouldReapClient(MAX_MISSED_PINGS), true);
  assert.equal(shouldReapClient(MAX_MISSED_PINGS + 2), true);
});
