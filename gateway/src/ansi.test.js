import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  ansiToHtml,
  ansiToHtmlLines,
  createAnsiState,
  splitLines,
  stripAnsi,
} from "./ansi.js";

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
    assert.match(html, /<span class="mud-fg-danger">红<\/span>/);
    assert.match(html, /字$/);
  });

  it("uses token classes for bright colors and bold", () => {
    const html = ansiToHtml("\x1b[1;96m剑光\x1b[0m");
    assert.equal(
      html,
      '<span class="mud-fg-cyan mud-bold">剑光</span>'
    );
  });

  it("escapes html entities", () => {
    assert.equal(ansiToHtml("<tag>&"), "&lt;tag&gt;&amp;");
  });

  it("drops non-display control sequences", () => {
    assert.equal(ansiToHtml("前\x1b[2J后"), "前后");
  });

  it("carries color across soft-wrapped lines when state is shared", () => {
    // say.c: CYN + name + "说道：" + arg_with_newline + "\n" + NOR
    const raw =
      "\x1b[36m渔夫说道：要去中原可得要岛主同意才行，我也不敢私自出海。等你\n" +
      "功夫有点小成，岛主就会让你离岛回中原去闯天下了。\n\x1b[37;0m";
    const lines = ansiToHtmlLines(raw);
    assert.match(lines[0], /mud-fg-cyan/);
    assert.match(lines[1], /mud-fg-cyan/);
    assert.match(lines[1], /功夫有点小成/);
  });

  it("carries color across separate chunks via state", () => {
    const state = createAnsiState();
    const a = ansiToHtml("\x1b[31m红字", state);
    const b = ansiToHtml("续行\x1b[0m", state);
    assert.match(a, /mud-fg-danger/);
    assert.match(b, /mud-fg-danger/);
    assert.match(b, /续行/);
  });
});

describe("splitLines", () => {
  it("normalizes line endings and trims trailing spaces", () => {
    const raw = "line1\r\nline2  \rline3\x1b[31m!\x1b[0m";
    assert.deepEqual(splitLines(raw), ["line1", "line2", "line3!"]);
  });
});
