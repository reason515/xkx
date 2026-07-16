import { describe, expect, it } from "vitest";
import {
  getMapLabel,
  getMapText,
  highlightMapText,
  normalizeMapKey,
  resolveRegionMapKey,
  worldHighlightMarkers,
} from "./maps";

describe("normalizeMapKey / resolveRegionMapKey", () => {
  it("resolves xiakedao and city alias", () => {
    expect(normalizeMapKey("xiakedao")).toBe("xiakedao");
    expect(normalizeMapKey("city")).toBe("yangzhou");
    expect(resolveRegionMapKey("xiakedao", "沙滩")).toBe("xiakedao");
    expect(resolveRegionMapKey("city", "客店")).toBe("yangzhou");
  });

  it("falls back to title scan when area missing", () => {
    expect(resolveRegionMapKey(undefined, "望海亭")).toBe("xiakedao");
  });
});

describe("getMapText / getMapLabel", () => {
  it("loads xiakedao and world maps", () => {
    const xkd = getMapText("xiakedao") || "";
    expect(xkd).toContain("沙滩");
    expect(xkd).toContain("望海亭");
    expect(getMapLabel("xiakedao")).toBe("侠客岛");

    const world = getMapText("all") || "";
    expect(world).toMatch(/扬州城|侠客岛/);
    expect(getMapLabel("all")).toContain("总图");
  });
});

describe("highlightMapText", () => {
  it("wraps room title once and escapes html", () => {
    const html = highlightMapText("沙滩－－－沙滩\n望海亭", ["沙滩"]);
    expect(html).toContain('<mark class="map-here">沙滩</mark>');
    expect(html.indexOf("map-here")).toBe(html.lastIndexOf("map-here"));
    expect(highlightMapText("a <b>", ["x"])).toContain("&lt;b&gt;");
  });
});

describe("worldHighlightMarkers", () => {
  it("includes area landmark for xiakedao", () => {
    expect(worldHighlightMarkers("xiakedao", "沙滩")).toEqual(
      expect.arrayContaining(["侠客岛", "沙滩"])
    );
  });
});
