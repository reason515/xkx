import { useEffect, useRef, useMemo } from "react";

interface Props {
  /** Raw ASCII map text */
  text: string;
  /** Current room title to highlight */
  roomTitle?: string;
  /** Exit direction labels near current room */
  exitLabels?: string[];
  /** CSS scale factor (from zoom) */
  scale?: number;
}

interface Cell {
  ch: string;
  x: number;
  y: number;
}

interface TextRun {
  text: string;
  x: number;
  y: number;
  w: number;
}

/** Box-drawing + line characters */
const LINE_CHARS = new Set("─│┌┐└┘├┤┬┴┼╴╵╶╷╭╮╰╯①②③④⑤⑥⑦⑧⑨⑩⊙◎●○◈◇◆□■△▲▽▼☆★→←↑↓↗↘↙↖∧∨＜＞＼／＋＋＋＋");

const COLOR = {
  bg: "#1a1714",
  line: "#3d5a4b",
  lineHi: "#5f8f78",
  text: "#c8bfb0",
  textHi: "#e8dfd0",
  marker: "#e8c84a",
  currentBg: "rgba(95,143,120,0.25)",
  currentRing: "#5f8f78",
  exitLine: "#7ab89a",
  water: "#2a5578",
  building: "rgba(95,143,120,0.12)",
};

/** Check if a char is a Chinese/CJK character */

/** Check if char is printable ASCII */

/** Collect continuous text runs from the grid */
function extractTextRuns(grid: Cell[][], rows: number, cols: number): TextRun[] {
  const runs: TextRun[] = [];
  const visited = new Set<string>();

  for (let y = 0; y < rows; y++) {
    for (let x = 0; x < cols; x++) {
      const key = `${x},${y}`;
      if (visited.has(key)) continue;
      const cell = grid[y]?.[x];
      if (!cell) continue;
      const ch = cell.ch.replace(/\s/g, "");
      if (!ch) continue;
      if (LINE_CHARS.has(cell.ch)) continue;

      // Start a text run
      let text = cell.ch;
      let ex = x + 1;
      while (ex < cols) {
        const nk = `${ex},${y}`;
        const nc = grid[y]?.[ex];
        if (!nc || LINE_CHARS.has(nc.ch) || visited.has(nk)) break;
        const nch = nc.ch.replace(/\s/g, "");
        if (!nch) break;
        text += nc.ch;
        visited.add(nk);
        ex++;
      }
      visited.add(key);
      // Only keep runs with meaningful content
      const stripped = text.replace(/\s+/g, "").trim();
      if (stripped.length >= 1) {
        runs.push({ text: text.trimEnd(), x, y, w: ex - x });
      }
    }
  }

  return runs;
}

/** Parse ASCII map into a grid and extract features */
function parseMap(text: string) {
  const lines = text.split("\n");
  const rows = lines.length;
  const cols = Math.max(...lines.map((l) => l.length), 1);

  // Build grid
  const grid: Cell[][] = [];
  for (let y = 0; y < rows; y++) {
    const row: Cell[] = [];
    const line = lines[y] || "";
    for (let x = 0; x < cols; x++) {
      row.push({ ch: line[x] || " ", x, y });
    }
    grid.push(row);
  }

  const textRuns = extractTextRuns(grid, rows, cols);

  return { grid, rows, cols, textRuns };
}

/** Find positions of a room title in text runs (fuzzy match) */
function findRoomPositions(
  textRuns: TextRun[],
  roomTitle: string | undefined
): TextRun[] {
  if (!roomTitle) return [];
  // Normalize: strip decorators and whitespace
  const normalize = (s: string) => s.replace(/[【】\[\]「」◎●○◉☆★→←↑↓↗↘↙↖]/g, "").replace(/\s+/g, "").trim();
  const title = normalize(roomTitle);
  if (!title || title.length < 2) return [];

  // Score each text run against the title
  const scored: { run: TextRun; score: number }[] = [];
  for (const run of textRuns) {
    const rt = normalize(run.text);
    if (!rt) continue;
    if (rt === title) { scored.push({ run, score: 100 }); continue; }
    if (rt.includes(title)) { scored.push({ run, score: 80 }); continue; }
    if (title.includes(rt) && rt.length >= 2) { scored.push({ run, score: 60 }); continue; }
    // Partial match: check if most chars overlap
    const common = [...rt].filter((c) => title.includes(c)).length;
    if (common >= Math.min(rt.length, title.length) * 0.6) {
      scored.push({ run, score: 40 });
    }
  }
  scored.sort((a, b) => b.score - a.score);
  return scored.slice(0, 1).map((s) => s.run);
}

export function GraphicalMap({ text, roomTitle, exitLabels = [], scale = 1 }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const { grid, rows, cols, textRuns } = useMemo(() => parseMap(text), [text]);
  const currentPositions = useMemo(
    () => findRoomPositions(textRuns, roomTitle),
    [textRuns, roomTitle]
  );

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const CELL_W = 10;
    const CELL_H = 19;
    const PAD = 20;

    const w = cols * CELL_W + PAD * 2;
    const h = rows * CELL_H + PAD * 2;

    canvas.width = w;
    canvas.height = h;
    canvas.style.width = `${Math.round(w * scale)}px`;
    canvas.style.height = `${Math.round(h * scale)}px`;

    const ctx = canvas.getContext("2d")!;

    // Background
    ctx.fillStyle = COLOR.bg;
    ctx.fillRect(0, 0, w, h);

    // Find current room bounding box for highlight
    let currentRect = { x1: 0, y1: 0, x2: 0, y2: 0 };
    if (currentPositions.length > 0) {
      const p = currentPositions[0];
      currentRect = {
        x1: (p.x - 1) * CELL_W + PAD,
        y1: (p.y - 1) * CELL_H + PAD,
        x2: (p.x + p.w + 1) * CELL_W + PAD,
        y2: (p.y + 2) * CELL_H + PAD,
      };
      ctx.fillStyle = COLOR.currentBg;
      ctx.fillRect(
        currentRect.x1,
        currentRect.y1,
        currentRect.x2 - currentRect.x1,
        currentRect.y2 - currentRect.y1
      );
      // Ring
      ctx.strokeStyle = COLOR.currentRing;
      ctx.lineWidth = 2;
      ctx.strokeRect(
        currentRect.x1,
        currentRect.y1,
        currentRect.x2 - currentRect.x1,
        currentRect.y2 - currentRect.y1
      );
    }

    // Draw lines
    ctx.strokeStyle = COLOR.line;
    ctx.lineWidth = 1.2;
    ctx.lineCap = "round";

    for (let y = 0; y < rows; y++) {
      for (let x = 0; x < cols; x++) {
        const cell = grid[y]?.[x];
        if (!cell) continue;
        const ch = cell.ch;
        const cx = x * CELL_W + CELL_W / 2 + PAD;
        const cy = y * CELL_H + CELL_H / 2 + PAD;

        // Horizontal lines
        if ("─═".includes(ch)) {
          const isHighlighted = isNearCurrent(currentPositions, x, y, 3);
          ctx.strokeStyle = isHighlighted ? COLOR.exitLine : COLOR.line;
          ctx.beginPath();
          ctx.moveTo(cx - CELL_W / 2, cy);
          ctx.lineTo(cx + CELL_W / 2, cy);
          ctx.stroke();
        }
        // Vertical lines
        if ("│║".includes(ch)) {
          const isHighlighted = isNearCurrent(currentPositions, x, y, 3);
          ctx.strokeStyle = isHighlighted ? COLOR.exitLine : COLOR.line;
          ctx.beginPath();
          ctx.moveTo(cx, cy - CELL_H / 2);
          ctx.lineTo(cx, cy + CELL_H / 2);
          ctx.stroke();
        }
      }
    }

    // Draw corner/junction characters as fills to connect lines
    ctx.fillStyle = COLOR.line;
    for (let y = 0; y < rows; y++) {
      for (let x = 0; x < cols; x++) {
        const cell = grid[y]?.[x];
        if (!cell) continue;
        const ch = cell.ch;
        const cx = x * CELL_W + CELL_W / 2 + PAD;
        const cy = y * CELL_H + CELL_H / 2 + PAD;
        if ("┌┐└┘├┤┬┴┼╭╮╰╯".includes(ch)) {
          ctx.fillStyle = COLOR.line;
          ctx.fillRect(cx - 1.5, cy - 1.5, 3, 3);
        }
        // Up arrows
        if ("↑∧".includes(ch)) {
          ctx.fillStyle = COLOR.exitLine;
          ctx.beginPath();
          ctx.moveTo(cx, cy - CELL_H / 3);
          ctx.lineTo(cx - 3, cy + CELL_H / 4);
          ctx.lineTo(cx + 3, cy + CELL_H / 4);
          ctx.fill();
        }
        // Down arrows
        if ("↓∨".includes(ch)) {
          ctx.fillStyle = COLOR.exitLine;
          ctx.beginPath();
          ctx.moveTo(cx, cy + CELL_H / 3);
          ctx.lineTo(cx - 3, cy - CELL_H / 4);
          ctx.lineTo(cx + 3, cy - CELL_H / 4);
          ctx.fill();
        }
      }
    }

    // Draw text runs
    const roomTitleStripped = roomTitle?.replace(/[【】\[\]「」]/g, "").trim() || "";
    for (const run of textRuns) {
      const runText = run.text.replace(/\s+/g, "").replace(/[【】\[\]「」]/g, "");
      const isCurrent = roomTitleStripped && (
        runText === roomTitleStripped ||
        runText.includes(roomTitleStripped) ||
        roomTitleStripped.includes(runText)
      );

      ctx.font = "12px 'PingFang SC', 'Microsoft YaHei', sans-serif";
      ctx.fillStyle = isCurrent ? COLOR.marker : COLOR.text;
      ctx.textBaseline = "middle";

      const displayText = run.text.trimEnd();
      const tx = run.x * CELL_W + PAD;
      const ty = run.y * CELL_H + CELL_H / 2 + PAD;

      // Truncate if too long
      const maxW = (cols - run.x) * CELL_W;
      ctx.fillText(displayText, tx, ty, maxW);
    }

    // Draw legend for current room
    if (currentPositions.length > 0) {
      const p = currentPositions[0];
      const lx = p.x * CELL_W + PAD;
      const ly = (p.y + 2) * CELL_H + PAD + 12;
      ctx.font = "11px 'PingFang SC', 'Microsoft YaHei', sans-serif";
      ctx.fillStyle = COLOR.marker;
      ctx.fillText("◎ 当前位置", lx, ly, 200);
    }
  }, [grid, rows, cols, textRuns, currentPositions, roomTitle, scale, exitLabels]);

  return (
    <canvas
      ref={canvasRef}
      style={{
        display: "block",
        maxWidth: "100%",
        margin: "0 auto",
        borderRadius: 8,
        imageRendering: "auto",
      }}
    />
  );
}

function isNearCurrent(
  positions: TextRun[],
  x: number,
  y: number,
  dist: number
): boolean {
  if (positions.length === 0) return false;
  const p = positions[0];
  return Math.abs(x - p.x) <= dist + p.w && Math.abs(y - p.y) <= dist;
}
