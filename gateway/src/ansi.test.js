import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { ansiToHtml, splitLines, stripAnsi } from "./ansi.js";

describe("stripAnsi", () => {
  it("removes color codes", () => {
    const raw = "\x1b[31m红色\x1b[0m文字";
    assert.equal(stripAnsi(raw), "红色文字");
  });

  it("removes clear screen sequences", () => {
    const raw = "hello\x1b[2Jworld";
    assert.equal(stripAnsi(raw), "helloworld");
  });
});

describe("ansiToHtml", () => {
  it("wraps colored text in span", () => {
    const raw = "\x1b[31m红\x1b[0m字";
    const html = ansiToHtml(raw);
    assert.match(html, /<span style="color:#c45c52">红<\/span>/);
    assert.match(html, /字$/);
  });

  it("escapes html entities", () => {
    assert.equal(ansiToHtml("<tag>&"), "&lt;tag&gt;&amp;");
  });
});

describe("splitLines", () => {
  it("normalizes line endings and trims trailing spaces", () => {
    const raw = "line1\r\nline2  \rline3\x1b[31m!\x1b[0m";
    assert.deepEqual(splitLines(raw), ["line1", "line2", "line3!"]);
  });
});
