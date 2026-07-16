import { describe, expect, it } from "vitest";
import { applyEvent, buildAssistPayload, PROTOCOL_VERSION } from "./protocol";
import type { InvItem, RoomState, SkillRow, Vitals } from "./types";

const basePrev = () => ({
  room: {
    title: "扬州客店",
    desc: "客店大堂",
    exits: [{ dir: "north", label: "北", name: "北大街" }],
    npcs: [],
    items: [],
  } satisfies RoomState,
  vitals: { qi: 100, maxQi: 100 } satisfies Vitals,
  skills: [] as SkillRow[],
  inventory: [] as InvItem[],
  lookText: "",
  lookHtml: "",
  scoreText: "",
  scoreHtml: "",
  assistActive: false,
  assistStatus: "",
  combatLog: [] as string[],
  trainLog: [] as string[],
});

describe("applyEvent", () => {
  it("updates room from room.update event", () => {
    const prev = basePrev();
    const next = applyEvent(
      {
        v: 1,
        type: "room.update",
        title: "北大街",
        long: "一条繁忙的街道。",
        area: "city",
        exits: [{ dir: "south", name: "客店" }],
      },
      prev
    );
    expect(next.room.title).toBe("北大街");
    expect(next.room.desc).toBe("一条繁忙的街道。");
    expect(next.room.area).toBe("city");
    expect(next.room.exits[0]).toEqual({ dir: "south", label: "南", name: "客店" });
  });

  it("replaces exits with empty array for no-exit rooms", () => {
    const prev = basePrev();
    const next = applyEvent(
      {
        v: 1,
        type: "room.update",
        title: "侠客岛挂名处",
        long: "这是一个大厅。",
        exits: [],
      },
      prev
    );
    expect(next.room.title).toBe("侠客岛挂名处");
    expect(next.room.exits).toEqual([]);
  });

  it("merges vitals from player.vitals event", () => {
    const prev = basePrev();
    const next = applyEvent(
      { v: 1, type: "player.vitals", vitals: { qi: 80, maxQi: 100 } },
      prev
    );
    expect(next.vitals.qi).toBe(80);
    expect(next.vitals.maxQi).toBe(100);
  });

  it("appends combat and train logs with cap", () => {
    const prev = basePrev();
    prev.combatLog = Array.from({ length: 41 }, (_, i) => `line-${i}`);
    const next = applyEvent({ v: 1, type: "combat.event", text: "新战斗" }, prev);
    expect(next.combatLog).toHaveLength(41);
    expect(next.combatLog.at(-1)).toBe("新战斗");

    const trainNext = applyEvent({ v: 1, type: "train.event", text: "打坐中" }, prev);
    expect(trainNext.trainLog.at(-1)).toBe("打坐中");
  });

  it("updates assist status", () => {
    const prev = basePrev();
    const next = applyEvent(
      { v: 1, type: "assist.status", active: true, message: "挂机中" },
      prev
    );
    expect(next.assistActive).toBe(true);
    expect(next.assistStatus).toBe("挂机中");
  });

  it("appends error to combat log", () => {
    const prev = basePrev();
    const next = applyEvent({ v: 1, type: "error", message: "连接断开" }, prev);
    expect(next.combatLog).toContain("连接断开");
  });
});

describe("buildAssistPayload", () => {
  it("builds assist.start payload with protocol version", () => {
    const payload = buildAssistPayload({ mode: "dazuo", stopWhen: "full" });
    expect(payload).toEqual({
      v: PROTOCOL_VERSION,
      type: "assist.start",
      config: { mode: "dazuo", stopWhen: "full" },
    });
  });
});
