/** Strip ANSI escape sequences and normalize mud output for parsing. */

const ANSI_RE =
  /\x1b(?:\[[0-9;?]*[ -/]*[@-~]|\][^\x07\x1b]*(?:\x07|\x1b\\)?)/g;
const CLEAR_RE = /\x1b\[2J|\x1b\[H|\x1b\[K/g;

const FG_CLASS = {
  30: "mud-fg-dim",
  31: "mud-fg-danger",
  32: "mud-fg-jade",
  33: "mud-fg-gold",
  34: "mud-fg-spirit",
  35: "mud-fg-exp",
  36: "mud-fg-cyan",
  37: "mud-fg-paper",
  90: "mud-fg-dim",
  91: "mud-fg-danger",
  92: "mud-fg-jade",
  93: "mud-fg-gold",
  94: "mud-fg-spirit",
  95: "mud-fg-exp",
  96: "mud-fg-cyan",
  97: "mud-fg-paper",
};

export function createAnsiState() {
  return { colorClass: null, bold: false };
}

export function stripAnsi(text) {
  return text.replace(ANSI_RE, "").replace(CLEAR_RE, "");
}

/**
 * Convert ANSI text to HTML spans.
 * When `state` is provided, color/bold carry across calls (and across `\n`
 * inside one string) — matching real terminal behavior.
 */
export function ansiToHtml(text, state = null) {
  const s = state || createAnsiState();
  let out = "";
  const tokens =
    /\x1b\[([0-9;]*)m|\x1b(?:\[[0-9;?]*[ -/]*[@-~]|\][^\x07\x1b]*(?:\x07|\x1b\\)?)/g;

  const escapeHtml = (value) =>
    value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  const wrap = (value) => {
    const classes = [s.colorClass, s.bold && "mud-bold"].filter(Boolean);
    const escaped = escapeHtml(value.replace(/\r/g, ""));
    return classes.length
      ? `<span class="${classes.join(" ")}">${escaped}</span>`
      : escaped;
  };

  let start = 0;
  for (const match of text.matchAll(tokens)) {
    out += wrap(text.slice(start, match.index));
    start = match.index + match[0].length;
    if (match[1] !== undefined) {
      for (const code of (match[1] || "0").split(";")) {
        const n = parseInt(code, 10);
        if (Number.isNaN(n) || n === 0) {
          s.colorClass = null;
          s.bold = false;
        } else if (n === 1) s.bold = true;
        else if (n === 22) s.bold = false;
        else if (FG_CLASS[n]) s.colorClass = FG_CLASS[n];
        else if (n === 39) s.colorClass = null;
      }
    }
  }
  return out + wrap(text.slice(start));
}

/** Per-line HTML with ANSI style carried across lines (and optional state). */
export function ansiToHtmlLines(text, state = null) {
  const s = state || createAnsiState();
  return text.split("\n").map((line) => ansiToHtml(line, s));
}

export function splitLines(text) {
  return stripAnsi(text)
    .replace(/\r\n/g, "\n")
    .replace(/\r/g, "\n")
    .split("\n")
    .map((l) => l.trimEnd());
}
