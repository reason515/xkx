import { describe, expect, it } from "vitest";
import { applyEvent, buildAssistPayload, PROTOCOL_VERSION } from "./protocol";
import type { InvItem, RoomState, SkillRow, Vitals } from "./types";

const basePrev = () => ({
  room: {
    title: "扬州客店",
    desc: "客店大堂",
    exits: [{ dir: "north", label: "北", name: "北大街" }],
    npcs: [] as RoomState["npcs"],
    items: [] as RoomState["items"],
  } satisfies RoomState,
  vitals: { qi: 100, maxQi: 100 } as Vitals,
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
        path: "beidajie",
        exits: [{ dir: "south", name: "客店" }],
        npcs: [
          {
            id: "teacher",
            commandId: "teacher",
            name: "师父",
            kind: "npc",
            canApprentice: 1,
            canTrade: 0,
          },
        ],
      },
      prev
    );
    expect(next.room.title).toBe("北大街");
    expect(next.room.desc).toBe("一条繁忙的街道。");
    expect(next.room.area).toBe("city");
    expect(next.room.path).toBe("beidajie");
    expect(next.room.exits[0]).toEqual({ dir: "south", label: "南", name: "客店" });
    expect(next.room.npcs[0]).toMatchObject({
      id: "teacher",
      commandId: "teacher",
      canApprentice: 1,
      canTrade: 0,
    });
  });

  it("merges scenery and canSleep from rest-room room.update", () => {
    const prev = basePrev();
    const next = applyEvent(
      {
        v: 1,
        type: "room.update",
        title: "休息室",
        long: "这里可以睡觉(sleep)。墙上贴着一张小条子(tiaozi)。",
        canSleep: 1,
        exits: [{ dir: "east", name: "甬道" }],
        items: [],
        npcs: [],
      },
      prev
    );
    expect(next.room.canSleep).toBe(true);
    expect(next.room.items).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ id: "tiaozi", name: "小条子", scenery: true }),
      ])
    );
  });

  it("discovers nested item_desc scenery from room.update", () => {
    const next = applyEvent(
      {
        v: 1,
        type: "room.update",
        title: "望海亭",
        long: "亭左是一道深涧(stream)，亭旁有一块大石(stone)。",
        itemDesc:
          "涧水清澈，不时有鱼儿(fish)跃出水面。\n想看看后面，就要把大石移开(move)。",
        exits: [],
        items: [],
        npcs: [],
      },
      basePrev()
    );
    expect(next.room.sceneryText).toContain("鱼儿(fish)");
    expect(next.room.items).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ id: "stream", name: "深涧", scenery: true }),
        expect.objectContaining({ id: "stone", name: "大石", scenery: true }),
        expect.objectContaining({ id: "fish", name: "鱼儿", scenery: true }),
      ])
    );
  });

  it("does not treat 钻(zuan) prose as a room item on room.update", () => {
    const next = applyEvent(
      {
        v: 1,
        type: "room.update",
        title: "甬道",
        long: "西边有一个洞(hole)，好象可以钻(zuan)进去。",
        exits: [],
        items: [],
        npcs: [],
      },
      basePrev()
    );
    expect(next.room.items).toEqual([
      expect.objectContaining({ id: "hole", name: "洞", scenery: true }),
    ]);
    expect(next.room.items.every((i) => !/可以钻|象可以/.test(i.name))).toBe(
      true
    );
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

  it("parses closed doors from room.update and clears them when empty", () => {
    const prev = basePrev();
    const withDoor = applyEvent(
      {
        v: 1,
        type: "room.update",
        title: "石门",
        long: "面前一道厚重的石门。",
        exits: [{ dir: "south", name: "甬道" }],
        doors: [{ dir: "enter", name: "石门", status: "closed" }],
        npcs: [],
        items: [],
      },
      prev
    );
    expect(withDoor.room.doors).toEqual([
      { dir: "enter", name: "石门", status: "closed" },
    ]);

    const opened = applyEvent(
      {
        v: 1,
        type: "room.update",
        title: "石门",
        long: "面前一道厚重的石门。",
        exits: [
          { dir: "south", name: "甬道" },
          { dir: "enter", name: "石洞" },
        ],
        doors: [],
        npcs: [],
        items: [],
      },
      withDoor
    );
    expect(opened.room.doors).toEqual([]);
    expect(opened.room.exits.map((e) => e.dir)).toContain("enter");
  });

  it("clears room items when room.update sends an empty items array", () => {
    const prev = basePrev();
    prev.room = {
      ...prev.room,
      items: [{ id: "stone", name: "鹅卵石", kind: "item" }],
      npcs: [{ id: "yu fu", name: "渔夫", kind: "npc" }],
    };
    const next = applyEvent(
      {
        v: 1,
        type: "room.update",
        title: "沙滩",
        long: "海风扑面。",
        exits: [{ dir: "north", name: "小路" }],
        npcs: [{ id: "yu fu", name: "渔夫", kind: "npc" }],
        items: [],
      },
      prev
    );
    expect(next.room.items).toEqual([]);
    expect(next.room.npcs).toEqual([{ id: "yu fu", name: "渔夫", kind: "npc" }]);
  });

  it("merges vitals from player.vitals event", () => {
    const prev = basePrev();
    const next = applyEvent(
      {
        v: 1,
        type: "player.vitals",
        vitals: { qi: 80, maxQi: 100, effQi: 90 },
      },
      prev
    );
    expect(next.vitals.qi).toBe(80);
    expect(next.vitals.maxQi).toBe(100);
    expect(next.vitals.effQi).toBe(90);
  });

  it("hp-style partial vitals keep innate maxQi", () => {
    const prev = basePrev();
    prev.vitals = { qi: 100, maxQi: 100, effQi: 100 };
    const afterPush = applyEvent(
      {
        v: 1,
        type: "player.vitals",
        vitals: { qi: 80, maxQi: 100, effQi: 90 },
      },
      prev
    );
    // 模拟 parseHp 只回填 qi/effQi，不得冲掉 maxQi
    const afterHp = {
      ...afterPush,
      vitals: { ...afterPush.vitals, qi: 80, effQi: 90 },
    };
    expect(afterHp.vitals.maxQi).toBe(100);
    expect(afterHp.vitals.effQi).toBe(90);
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

    const resting = applyEvent(
      {
        v: 1,
        type: "assist.status",
        active: true,
        message: "调息中 · 气 28%，恢复后续打坐",
      },
      next
    );
    expect(resting.assistActive).toBe(true);
    expect(resting.assistStatus).toMatch(/调息中/);
  });

  it("appends error to combat log", () => {
    const prev = basePrev();
    const next = applyEvent({ v: 1, type: "error", message: "连接断开" }, prev);
    expect(next.combatLog).toContain("连接断开");
  });

  it("merges skills.enable slots from MUD valid_enable", () => {
    const prev = {
      ...basePrev(),
      skills: [
        {
          id: "taixuan-gong",
          name: "太玄功",
          level: 30,
          learned: 0,
          category: "force",
          mastery: 2,
        },
        {
          id: "wuyu-zhangfa",
          name: "五狱掌法",
          level: 20,
          learned: 0,
          category: "misc",
          mastery: 2,
        },
      ] as SkillRow[],
      skillEnableSlots: {},
    };
    const next = applyEvent(
      {
        v: 1,
        type: "skills.enable",
        slots: {
          "taixuan-gong": ["force"],
          "wuyu-zhangfa": ["strike", "parry"],
        },
      },
      prev
    );
    expect(next.skillEnableSlots["taixuan-gong"]).toEqual(["force"]);
    expect(next.skillEnableSlots["wuyu-zhangfa"]).toEqual([
      "strike",
      "parry",
    ]);
    expect(next.skills[0].enableSlots).toEqual(["force"]);
    expect(next.skills[1].enableSlots).toEqual(["strike", "parry"]);
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
