import { describe, expect, it } from "vitest";
import { readdirSync, readFileSync, existsSync, statSync } from "node:fs";
import path from "node:path";
import { AREA_MAPS, DIR, YANGZHOU_MAP, resolveRegionGraphMapKey } from "./roomMaps";

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

describe("YANGZHOU_MAP 与 d/ 房间一致性", () => {
  const dDir = path.resolve(__dirname, "../../../../d");
  const areas = readdirSync(dDir).filter((a) =>
    statSync(path.join(dDir, a)).isDirectory()
  );

  /** 按节点 path（basename）在 d/ 各区域下定位房间文件，返回其 short 集合。
   *  跨区域同名文件取并集；找不到返回空集。 */
  function roomShorts(nodePath: string): Set<string> {
    const out = new Set<string>();
    for (const area of areas) {
      const f = path.join(dDir, area, `${nodePath}.c`);
      if (!existsSync(f)) continue;
      const src = readFileSync(f, "utf8");
      // 兼容 set("short",...) / set  ("short",...) / HIW"象棋棋苑"NOR 颜色前缀写法
      const m = src.match(
        /set[ \t]*\([ \t]*"short",[ \t]*(?:[A-Z_]+[ \t]*\+?[ \t]*)?"([^"]+)"[ \t]*[A-Z]*[ \t]*\)/
      );
      if (!m) continue;
      const short = (m[1] || "").replace(/\$[A-Z]+\$/g, "").trim();
      if (short) out.add(short);
    }
    return out;
  }

  it("每个扬州节点的名称都对应真实房间 short", () => {
    const missing = YANGZHOU_MAP.nodes
      .filter((n) => n.path && !roomShorts(n.path).has(n.name))
      .map((n) => `${n.id}(${n.name})`);
    expect(missing).toEqual([]);
  });

  it("每个节点 path 在 d/ 中存在对应文件", () => {
    const files = new Set(
      areas.flatMap((a) =>
        readdirSync(path.join(dDir, a))
          .filter((f) => f.endsWith(".c"))
          .map((f) => f.replace(/\.c$/, ""))
      )
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

  it("覆盖新增地标：配药房与太乙武馆内部", () => {
    const byId = new Map(YANGZHOU_MAP.nodes.map((n) => [n.id, n]));
    const expectNode = (id: string, name: string, path: string) => {
      const n = byId.get(id);
      expect(n, `缺少节点 ${id}`).toBeDefined();
      expect(n!.name).toBe(name);
      expect(n!.path).toBe(path);
    };
    // 配药房在药铺正北（同列相邻）
    expectNode("peiyaofang", "配药房", "peiyaofang");
    expectNode("wuguan_damen", "太乙武馆大门", "wuguan_damen");
    expectNode("wuguan_dating", "武馆大厅", "wuguan_dating");
    expectNode("wuguan_liangong", "练功场", "wuguan_liangong");
    expectNode("wuguan_xiuxi", "休息室", "wuguan_xiuxi");
    const yaopu = byId.get("yaopu")!;
    const peiyaofang = byId.get("peiyaofang")!;
    expect(yaopu.col).toBe(peiyaofang.col);
    expect(yaopu.row).toBe(peiyaofang.row + 1);
    // 武馆拓扑：大门→大厅，大厅西练功场 / 东休息室
    const edgeKeys = new Set(YANGZHOU_MAP.edges.map((e) => `${e.from}->${e.to}:${e.dir}`));
    expect(edgeKeys.has("wuguan_damen->wuguan_dating:south")).toBe(true);
    expect(edgeKeys.has("wuguan_dating->wuguan_liangong:west")).toBe(true);
    expect(edgeKeys.has("wuguan_dating->wuguan_xiuxi:east")).toBe(true);
    expect(edgeKeys.has("dongdajie1->wuguan_damen:northwest")).toBe(true);
  });
});

describe("resolveRegionGraphMapKey", () => {
  it("扬州城各区域映射到 yangzhou 地图", () => {
    expect(resolveRegionGraphMapKey("city")).toBe("yangzhou");
    expect(resolveRegionGraphMapKey("yangzhou")).toBe("yangzhou");
    // 太乙武馆无 outdoors，回退 area=wuguan，应仍显示扬州城地图
    expect(resolveRegionGraphMapKey("wuguan")).toBe("yangzhou");
    expect(resolveRegionGraphMapKey("WUGUAN")).toBe("yangzhou");
    expect(resolveRegionGraphMapKey(undefined)).toBeNull();
    expect(resolveRegionGraphMapKey("xiakedao")).toBeNull();
  });

  it("柳秀山庄映射到 newbie_lxsz 地图", () => {
    expect(resolveRegionGraphMapKey("newbie_lxsz")).toBe("newbie_lxsz");
    expect(resolveRegionGraphMapKey("liuxiu-shanzhuang")).toBe("newbie_lxsz");
  });
});
