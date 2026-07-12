import { describe, expect, it } from "vitest";
import {
  isCombatLine,
  isTrainLine,
  parseExits,
  parseHp,
  parseInventory,
  parseRoom,
  parseSkills,
} from "./parser";

describe("parseExits", () => {
  it("parses comma-separated exits with Chinese label", () => {
    const text = "明显的出口是 north 北大街, east 东大街, south 南大街";
    const exits = parseExits(text);
    expect(exits).toEqual([
      { dir: "north", label: "北", name: "北大街" },
      { dir: "east", label: "东", name: "东大街" },
      { dir: "south", label: "南", name: "南大街" },
    ]);
  });

  it("returns empty array when no exit line", () => {
    expect(parseExits("扬州客店\n这里是扬州城。")).toEqual([]);
  });
});

describe("parseRoom", () => {
  it("extracts title, description, exits, npcs and items", () => {
    const text = `【扬州客店】
这里是扬州城最大的客店，人来人往。
店小二正忙着招呼客人。
这里有店小二和一张木桌。
明显的出口是 north 北大街, east 东大街`;

    const room = parseRoom(text);
    expect(room.title).toBe("扬州客店");
    expect(room.desc).toContain("扬州城最大的客店");
    expect(room.exits).toHaveLength(2);
    expect(room.npcs).toEqual([{ id: "店小二", name: "店小二", kind: "npc" }]);
    expect(room.items).toEqual([{ id: "一张木桌", name: "一张木桌", kind: "item" }]);
  });
});

describe("parseHp", () => {
  it("parses vitals from hp output", () => {
    const text = `精：120/ 150
气：80/ 100
精力：50 / 60
内力：30 / 40
食物：10/ 20
饮水：15/ 25
潜能：100 / 200
经验：5000`;

    const v = parseHp(text);
    expect(v.jing).toBe(120);
    expect(v.maxJing).toBe(150);
    expect(v.qi).toBe(80);
    expect(v.maxQi).toBe(100);
    expect(v.jingli).toBe(50);
    expect(v.maxJingli).toBe(60);
    expect(v.neili).toBe(30);
    expect(v.maxNeili).toBe(40);
    expect(v.food).toBe(10);
    expect(v.maxFood).toBe(20);
    expect(v.water).toBe(15);
    expect(v.maxWater).toBe(25);
    expect(v.potential).toBe(100);
    expect(v.maxPotential).toBe(200);
    expect(v.exp).toBe(5000);
  });
});

describe("parseSkills", () => {
  it("parses skill rows with equipped marker", () => {
    const text = `□ 基本拳脚 ── 50
  基本剑法 ── 30`;
    const rows = parseSkills(text);
    expect(rows).toHaveLength(2);
    expect(rows[0]).toMatchObject({ name: "基本拳脚", level: 50, equipped: true });
    expect(rows[1]).toMatchObject({ name: "基本剑法", level: 30, equipped: false });
  });
});

describe("parseInventory", () => {
  it("parses inventory items with type", () => {
    const text = `□ 长剑（武器）
  布衣（防具）`;
    const items = parseInventory(text);
    expect(items).toHaveLength(2);
    expect(items[0]).toMatchObject({ name: "长剑", type: "武器", equipped: true });
    expect(items[1]).toMatchObject({ name: "布衣", type: "防具", equipped: false });
  });
});

describe("isCombatLine", () => {
  it("detects combat-related lines", () => {
    expect(isCombatLine("你一招「横扫千军」向店小二攻去。")).toBe(true);
    expect(isCombatLine("你环顾四周。")).toBe(false);
  });
});

describe("isTrainLine", () => {
  it("detects training-related lines", () => {
    expect(isTrainLine("你盘膝坐下，开始打坐吐纳。")).toBe(true);
    expect(isTrainLine("你向北方走去。")).toBe(false);
  });
});
