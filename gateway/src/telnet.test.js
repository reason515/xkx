import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { stripTelnet } from "./telnet.js";

describe("stripTelnet", () => {
  it("passes through plain text", () => {
    const { text, replies } = stripTelnet(Buffer.from("hello", "utf8"));
    assert.equal(text.toString("utf8"), "hello");
    assert.equal(replies.length, 0);
  });

  it("strips WILL and replies DONT", () => {
    // IAC WILL 1 + "hi"
    const raw = Buffer.from([255, 251, 1, 0x68, 0x69]);
    const { text, replies } = stripTelnet(raw);
    assert.equal(text.toString("utf8"), "hi");
    assert.deepEqual(replies[0], Buffer.from([255, 254, 1]));
  });

  it("strips DO and replies WONT", () => {
    const raw = Buffer.from([255, 253, 3, 0x61]);
    const { text, replies } = stripTelnet(raw);
    assert.equal(text.toString("utf8"), "a");
    assert.deepEqual(replies[0], Buffer.from([255, 252, 3]));
  });
});
