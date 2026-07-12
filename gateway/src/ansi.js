/** Strip ANSI escape sequences and normalize mud output for parsing. */

const ANSI_RE =
  /\x1b(?:\[[0-9;?]*[ -/]*[@-~]|\][^\x07\x1b]*(?:\x07|\x1b\\)?)/g;
const CLEAR_RE = /\x1b\[2J|\x1b\[H|\x1b\[K/g;

const FG = {
  30: "#888",
  31: "#c45c52",
  32: "#6b9e8a",
  33: "#c4a35a",
  34: "#6a9bb8",
  35: "#b07ab0",
  36: "#6ec4c0",
  37: "#e8dfd0",
  90: "#666",
  91: "#e8b4aa",
  92: "#8fbfa6",
  93: "#e0c060",
  94: "#9ec4d4",
  95: "#c9a0d8",
  96: "#9ed4e8",
  97: "#f2eadc",
};

export function stripAnsi(text) {
  return text.replace(ANSI_RE, "").replace(CLEAR_RE, "");
}

export function ansiToHtml(text) {
  let out = "";
  let color = null;
  let bold = false;
  const stack = [];

  const pushSpan = () => {
    const styles = [];
    if (color) styles.push(`color:${color}`);
    if (bold) styles.push("font-weight:600");
    if (styles.length) {
      out += `<span style="${styles.join(";")}">`;
      stack.push("</span>");
    }
  };

  const closeSpans = () => {
    while (stack.length) out += stack.pop();
  };

  for (let i = 0; i < text.length; i++) {
    if (text[i] === "\x1b" && text[i + 1] === "[") {
      closeSpans();
      const end = text.indexOf("m", i);
      if (end === -1) {
        out += text[i];
        continue;
      }
      const seq = text.slice(i + 2, end).split(";");
      for (const code of seq) {
        const n = parseInt(code, 10);
        if (Number.isNaN(n) || n === 0) {
          color = null;
          bold = false;
        } else if (n === 1) bold = true;
        else if (FG[n]) color = FG[n];
      }
      pushSpan();
      i = end;
      continue;
    }
    if (text[i] === "\r") continue;
    const ch = text[i];
    if (ch === "<") out += "&lt;";
    else if (ch === ">") out += "&gt;";
    else if (ch === "&") out += "&amp;";
    else out += ch;
  }
  closeSpans();
  return out;
}

export function splitLines(text) {
  return stripAnsi(text)
    .replace(/\r\n/g, "\n")
    .replace(/\r/g, "\n")
    .split("\n")
    .map((l) => l.trimEnd());
}
