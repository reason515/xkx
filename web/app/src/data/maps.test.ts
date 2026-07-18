import { describe, expect, it } from "vitest";
import {
  getMapLabel,
  getMapText,
  highlightMapText,
  mapMarkerOccurrence,
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
    expect(xkd).toContain("石门");
    expect(xkd).toContain("石洞");
    expect(xkd).toContain("石室");
    expect(getMapLabel("xiakedao")).toBe("侠客岛");

    const world = getMapText("all") || "";
    expect(world).toMatch(/扬州城|侠客岛/);
    expect(getMapLabel("all")).toContain("总图");
  });

  it("marks stone-cave rooms on xiakedao map by path", () => {
    const xkd = getMapText("xiakedao") || "";
    expect(
      mapMarkerOccurrence("xiakedao", "石洞", { roomPath: "xiakexing1" })
    ).toBe(0);
    expect(
      mapMarkerOccurrence("xiakedao", "石洞", { roomPath: "xiakexing6" })
    ).toBe(5);
    expect(
      mapMarkerOccurrence("xiakedao", "石室", { roomPath: "xkx1" })
    ).toBe(0);
    expect(
      mapMarkerOccurrence("xiakedao", "石室", { roomPath: "xkx22" })
    ).toBe(23);
    expect(
      mapMarkerOccurrence("xiakedao", "甬道", { roomPath: "yongdao10" })
    ).toBe(5);
    expect(
      mapMarkerOccurrence("xiakedao", "石门", { roomPath: "gate" })
    ).toBe(0);

    const caveHtml = highlightMapText(xkd, ["石洞"], { 石洞: 0 });
    expect(caveHtml).toContain('<mark class="map-here">石洞</mark>');
    expect((xkd.match(/石洞/g) || []).length).toBe(6);
  });
});

describe("highlightMapText", () => {
  it("wraps room title once and escapes html", () => {
    const html = highlightMapText("沙滩－－－沙滩\n望海亭", ["沙滩"]);
    expect(html).toContain('<mark class="map-here">沙滩</mark>');
    expect(html.indexOf("map-here")).toBe(html.lastIndexOf("map-here"));
    expect(highlightMapText("a <b>", ["x"])).toContain("&lt;b&gt;");
  });

  it("can highlight the Nth duplicate label", () => {
    const row = "沙滩－－－沙滩－－－沙滩";
    const first = highlightMapText(row, ["沙滩"], { 沙滩: 0 });
    const third = highlightMapText(row, ["沙滩"], { 沙滩: 2 });
    expect(first.indexOf("<mark")).toBeLessThan(third.indexOf("<mark"));
    expect((first.match(/map-here/g) || []).length).toBe(1);
    expect((third.match(/map-here/g) || []).length).toBe(1);
  });
});

describe("mapMarkerOccurrence", () => {
  it("maps main fisherman beach to south-middle (index 4)", () => {
    expect(
      mapMarkerOccurrence("xiakedao", "沙滩", { roomPath: "shatan" })
    ).toBe(4);
    expect(
      mapMarkerOccurrence("xiakedao", "沙滩", { hasFisherman: true })
    ).toBe(4);
  });

  it("maps north beaches to top row indices", () => {
    expect(
      mapMarkerOccurrence("xiakedao", "沙滩", { roomPath: "shatann1" })
    ).toBe(0);
    expect(
      mapMarkerOccurrence("xiakedao", "沙滩", { roomPath: "shatann3" })
    ).toBe(2);
  });

  it("maps three 小路 rooms to distinct map occurrences", () => {
    // 0 = 小路－礁石, 1 = 海边－小路→山路, 2 = 迎宾厅南
    expect(
      mapMarkerOccurrence("xiakedao", "小路", { roomPath: "xiaolu3" })
    ).toBe(0);
    expect(
      mapMarkerOccurrence("xiakedao", "小路", { roomPath: "xiaolu2" })
    ).toBe(1);
    expect(
      mapMarkerOccurrence("xiakedao", "小路", { roomPath: "xiaolu" })
    ).toBe(2);
  });

  it("disambiguates 小路 by exit names when path missing", () => {
    expect(
      mapMarkerOccurrence("xiakedao", "小路", {
        exitNames: ["沙滩", "迎宾厅"],
      })
    ).toBe(2);
    expect(
      mapMarkerOccurrence("xiakedao", "小路", {
        exitNames: ["望海亭", "海边"],
      })
    ).toBe(1);
    expect(
      mapMarkerOccurrence("xiakedao", "小路", {
        exitNames: ["山脚下", "礁石"],
      })
    ).toBe(0);
  });

  it("highlights 迎宾厅南小路 after 迎宾厅, not the reef path", () => {
    const xkd = getMapText("xiakedao") || "";
    const reef = highlightMapText(xkd, ["小路"], { 小路: 0 });
    const south = highlightMapText(xkd, ["小路"], {
      小路: mapMarkerOccurrence("xiakedao", "小路", { roomPath: "xiaolu" }),
    });
    expect(south.indexOf("map-here")).toBeGreaterThan(reef.indexOf("map-here"));
    const beforeSouth = south.slice(0, south.indexOf("map-here"));
    expect(beforeSouth).toContain("迎宾厅");
    // first 小路 is 「小路－礁石」, before 迎宾厅 on the ASCII map
    expect(reef.slice(0, reef.indexOf("map-here"))).not.toContain("迎宾厅");
    expect(reef.slice(reef.indexOf("map-here")).slice(0, 40)).toMatch(/礁石/);
  });

  it("highlights main beach south of 迎宾厅, not the north row", () => {
    const xkd = getMapText("xiakedao") || "";
    const north = highlightMapText(xkd, ["沙滩"], { 沙滩: 0 });
    const main = highlightMapText(xkd, ["沙滩"], {
      沙滩: mapMarkerOccurrence("xiakedao", "沙滩", { roomPath: "shatan" }),
    });
    expect(main.indexOf("map-here")).toBeGreaterThan(north.indexOf("map-here"));
    const beforeMain = main.slice(0, main.indexOf("map-here"));
    expect(beforeMain).toContain("迎宾厅");
    expect(north.slice(0, north.indexOf("map-here"))).not.toContain("迎宾厅");
  });
});

describe("worldHighlightMarkers", () => {
  it("includes area landmark for xiakedao", () => {
    expect(worldHighlightMarkers("xiakedao", "沙滩")).toEqual(
      expect.arrayContaining(["侠客岛", "沙滩"])
    );
  });
});
