import {
  MUD_MAPS,
  MUD_MAP_ALIASES,
  MUD_MAP_LABELS,
} from "./mudMaps.generated";

export { MUD_MAPS, MUD_MAP_ALIASES, MUD_MAP_LABELS };

/** Region landmark names used to highlight on the world (map_all) view. */
const AREA_WORLD_MARKERS: Record<string, string[]> = {
  xiakedao: ["侠客岛"],
  yangzhou: ["扬州城", "扬州"],
  city: ["扬州城", "扬州"],
  hangzhou: ["杭州"],
  beijing: ["京师"],
  shaolin: ["少林寺", "少林"],
  wudang: ["武当山", "武当"],
  emei: ["峨嵋山", "峨嵋"],
  foshan: ["佛山镇", "佛山"],
  taohua: ["桃花岛"],
  shenlong: ["神龙岛"],
  xingxiu: ["星宿"],
  baituo: ["白驼"],
  huashan: ["华山"],
  xueshan: ["大雪山"],
  dali: ["大理国", "大理"],
  quanzhou: ["泉州港", "泉州"],
  jiaxing: ["嘉兴城", "嘉兴"],
  lanzhou: ["兰州城", "兰州"],
  nanyang: ["南阳城", "南阳"],
  changbai: ["长白山"],
  taishan: ["泰山"],
};

export function normalizeMapKey(area?: string): string | undefined {
  if (!area) return undefined;
  const raw = area.trim().toLowerCase();
  if (!raw) return undefined;
  const aliased = MUD_MAP_ALIASES[raw] || raw;
  if (MUD_MAPS[aliased]) return aliased;
  return undefined;
}

/**
 * Pick the best regional map key for the current room.
 * Prefer area (outdoors /d/<area>); fall back to scanning titles in maps.
 */
export function resolveRegionMapKey(
  area?: string,
  roomTitle?: string
): string | undefined {
  const fromArea = normalizeMapKey(area);
  if (fromArea) return fromArea;

  const title = (roomTitle || "").trim();
  if (!title || title.length < 2) return undefined;

  // Prefer smaller/local maps over the huge world map when matching by title
  const keys = Object.keys(MUD_MAPS).filter((k) => k !== "all" && k !== "xkx" && k !== "link");
  let best: string | undefined;
  let bestScore = 0;
  for (const key of keys) {
    const text = MUD_MAPS[key];
    if (!text.includes(title)) continue;
    // Prefer maps where title appears more "room-like" (shorter map = more local)
    const score = 10000 - Math.min(text.length, 9999);
    if (score > bestScore) {
      bestScore = score;
      best = key;
    }
  }
  return best;
}

export function getMapText(key: string | undefined): string | undefined {
  if (!key) return undefined;
  return MUD_MAPS[key];
}

export function getMapLabel(key: string | undefined): string {
  if (!key) return "地图";
  return MUD_MAP_LABELS[key] || key;
}

function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

/**
 * 0-based index among identical labels on map_xiakedao.
 * ASCII has two rows of three 沙滩; main fisherman beach is bottom-middle (4).
 */
const XIAKEDAO_BEACH_OCCURRENCE: Record<string, number> = {
  shatann1: 0,
  shatann2: 1,
  shatann3: 2,
  shatan: 4,
  shatan1: 4,
  shatan3: 4,
  shatan4: 4,
  shatans2: 5,
  shatans3: 5,
  shatan5: 5,
};

/**
 * Which occurrence of a repeated map label to highlight (0 = first).
 * Falls back to heuristics when room path is missing.
 */
export function mapMarkerOccurrence(
  mapKey: string | undefined,
  marker: string | undefined,
  opts?: {
    roomPath?: string;
    hasFisherman?: boolean;
    hasCarriage?: boolean;
  }
): number {
  const title = (marker || "").trim();
  if (!title) return 0;
  if (mapKey === "xiakedao" && title === "沙滩") {
    const path = (opts?.roomPath || "").toLowerCase().replace(/\.c$/, "");
    const base = path.includes("/") ? path.split("/").pop()! : path;
    if (base && base in XIAKEDAO_BEACH_OCCURRENCE) {
      return XIAKEDAO_BEACH_OCCURRENCE[base];
    }
    // Main south beach: fisherman / landing car / default for login
    if (opts?.hasFisherman || opts?.hasCarriage) return 4;
    return 4;
  }
  return 0;
}

/**
 * Highlight one occurrence of each marker inside ASCII map text.
 * Use `occurrence` to pick among duplicate labels (e.g. six 沙滩).
 * Returns safe HTML for dangerouslySetInnerHTML.
 */
export function highlightMapText(
  ascii: string,
  markers: (string | undefined)[],
  occurrence: Record<string, number> = {}
): string {
  const escaped = escapeHtml(ascii);
  const seen = new Set<string>();
  let out = escaped;
  for (const raw of markers) {
    const m = (raw || "").trim();
    if (!m || m.length < 2 || seen.has(m)) continue;
    seen.add(m);
    const nth = occurrence[m] ?? 0;
    const re = new RegExp(escapeRegExp(escapeHtml(m)), "g");
    let count = 0;
    out = out.replace(re, (match) => {
      if (count++ === nth) return `<mark class="map-here">${match}</mark>`;
      return match;
    });
  }
  return out;
}

export function worldHighlightMarkers(
  area?: string,
  roomTitle?: string
): string[] {
  const key = normalizeMapKey(area) || resolveRegionMapKey(area, roomTitle);
  const fromArea = key ? AREA_WORLD_MARKERS[key] || [] : [];
  return [...fromArea, roomTitle].filter(Boolean) as string[];
}

/** @deprecated concept placeholders — kept empty so old imports do not break. */
export const YANGZHOU_CELLS: never[] = [];
export const WORLD_SPOTS: never[] = [];

export const GUIDE_STEPS = [
  "环顾四周，熟悉所处环境。",
  "打开角色面板，查看气血与档案。",
  "点出口前往下一处，确认「前往」。",
  "使用「修炼」尝试打坐。",
];
