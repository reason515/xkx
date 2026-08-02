import { describe, expect, it } from "vitest";
import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { AREA_MAPS, DIR, YANGZHOU_MAP } from "./roomMaps";

describe("八向约束（所有区域地图）", () => {
  for (const [key, map] of Object.entries(AREA_MAPS)) {
    describe(key, () => {
      it("所有边端点都存在，且满足八向约束", () => {
        const byId = new Map(map.nodes.map((n) => [n.id, n]));
        expect(map.nodes.length).toBeGreaterThan(0);
        for (const e of map.edges) {
          const from = byId.get(e.from);
          const to = byId.get(e.to);
          if (!from || !to) {
            throw new Error(`${key}: edge ${e.from}→${e.to} 端点缺失`);
          }
          const dirVec = DIR[e.dir];
          expect(dirVec, `dir ${e.dir}`).toBeDefined();
          if (!dirVec) throw new Error(`${key}: ${e.dir} 不是合法八向`);
          const dx = to.col - from.col;
          const dy = to.row - from.row;
          expect(
            dx === 0 || dy === 0 || Math.abs(dx) === Math.abs(dy),
            `${key}: ${e.from}(${from.col},${from.row}) → ${e.to}(${to.col},${to.row}) dir=${e.dir} 不满足八向（dx=${dx}, dy=${dy}）`
          ).toBe(true);
          // 声明的 dir 与几何方向一致
          const [ddx, ddy] = dirVec;
          expect(
            (dx === 0 && ddx === 0) || (dy === 0 && ddy === 0) ||
              (Math.sign(dx) === Math.sign(ddx) && Math.sign(dy) === Math.sign(ddy)),
            `${key}: ${e.from}→${e.to} dir=${e.dir} 与几何方向不符（dx=${dx}, dy=${dy}）`
          ).toBe(true);
        }
      });

      it("节点 id 唯一，且不占用同一网格格点", () => {
        const ids = map.nodes.map((n) => n.id);
        expect(new Set(ids).size).toBe(ids.length);
        const cells = map.nodes.map((n) => `${n.col},${n.row}`);
        expect(new Set(cells).size).toBe(cells.length);
      });
    });
  }
});

describe("YANGZHOU_MAP 与 d/city 房间一致性", () => {
  const cityDir = path.resolve(__dirname, "../../../../d/city");
  const shorts = new Set<string>();
  for (const fn of readdirSync(cityDir)) {
    if (!fn.endsWith(".c")) continue;
    const src = readFileSync(path.join(cityDir, fn), "utf8");
    const m = src.match(/set\("short",\s*(?:"([^"]+)"|([A-Z_]+)\+?"([^"]+)")/);
    if (!m) continue;
    const short = (m[1] || m[3] || "").replace(/\$[A-Z]+\$/g, "").trim();
    if (short) shorts.add(short);
  }

  it("每个扬州节点的名称都对应真实房间 short", () => {
    const missing = YANGZHOU_MAP.nodes
      .filter((n) => !shorts.has(n.name))
      .map((n) => `${n.id}(${n.name})`);
    expect(missing).toEqual([]);
  });

  it("每个节点 path 在 d/city 中存在对应文件", () => {
    const files = new Set(
      readdirSync(cityDir).filter((f) => f.endsWith(".c")).map((f) => f.replace(/\.c$/, ""))
    );
    const missing = YANGZHOU_MAP.nodes
      .filter((n) => n.path && !files.has(n.path))
      .map((n) => `${n.id}(${n.path})`);
    expect(missing).toEqual([]);
  });

  it("覆盖关键地标：四门 / 中央广场 / 南北集市 / 三条大街", () => {
    const names = new Set(YANGZHOU_MAP.nodes.map((n) => n.name));
    for (const room of ["北门", "南门", "西门", "东门", "中央广场", "北集市", "南集市", "西大街", "东大街", "南大街"]) {
      expect(names.has(room), `缺少 ${room}`).toBe(true);
    }
  });
});
