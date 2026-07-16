import { describe, expect, it } from "vitest";
import {
  beachGreeterActions,
  buildScoreHtml,
  extractLookBlock,
  isCombatLine,
  isDocReadingCommand,
  isLoginNoise,
  isMorePromptLine,
  isProtocolNoise,
  isSelfLookLine,
  isSheetDumpLine,
  isTrainLine,
  labelSuggestedAction,
  parseBoardReadActions,
  parseEntityShort,
  parseExits,
  parseHp,
  parseInventory,
  parseRoom,
  parseScore,
  parseSkills,
  parseSuggestedActions,
  reflowSoftWrappedEntries,
  shouldJoinSoftWrap,
  stripScoreBanner,
  waterfallPassageActions,
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

  it("parses real look.c dir-only exits", () => {
    const text = "这里明显的出口是 east、up 和 west。";
    expect(parseExits(text)).toEqual([
      { dir: "east", label: "东" },
      { dir: "up", label: "上" },
      { dir: "west", label: "西" },
    ]);
  });

  it("parses unique exit", () => {
    expect(parseExits("这里唯一的出口是 north。")).toEqual([
      { dir: "north", label: "北" },
    ]);
  });

  it("returns empty array when no exit line", () => {
    expect(parseExits("扬州客店\n这里是扬州城。")).toEqual([]);
  });
});

describe("extractLookBlock", () => {
  it("strips login banner and keeps the look block", () => {
    const dirty = `有任何意见，请 email 给 xkx@egroups.com
Do you want to use BIG5 code?(y/n)
目前权限：(player)
－－－－－－－－
沙滩 -
    这里是侠客岛外的沙滩。
    这里明显的出口是 north、east 和 west。
  木老七（Mu laoqi）
  店小二(Xiao er)
`;
    const block = extractLookBlock(dirty);
    expect(block).not.toContain("BIG5");
    expect(block).not.toContain("有任何意见");
    expect(block).toContain("沙滩");
    expect(block).toContain("木老七（Mu laoqi）");
  });

  it("anchors to a newer no-exit room after an older beach look", () => {
    const dirty = `沙滩 -
    极目远眺，海上只见几点淡淡的帆影。
    这里没有任何明显的出路。
  张三(Zhang san)
侠客岛挂名处 - 
这是一个大厅，厅的中央是一张大桌子，桌上摆着一个厚厚的本
子。
  木老七（Mu laoqi）
`;
    const block = extractLookBlock(dirty);
    expect(block).toContain("侠客岛挂名处");
    expect(block).toContain("这是一个大厅");
    expect(block).not.toMatch(/^沙滩/);
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

  it("parses real look output even when login noise precedes it", () => {
    const text = `有任何意见，请 email 给 xkx@egroups.com
Do you want to use BIG5 code?(y/n)
沙滩 -
    这里是侠客岛外的一片沙滩，海风扑面。
    这里明显的出口是 north、east 和 west。
  木老七（Mu laoqi）
  店小二(Xiao er)
  一块石头`;

    const room = parseRoom(text);
    expect(room.title).toBe("沙滩");
    expect(room.desc).toContain("一片沙滩");
    expect(room.desc).not.toContain("BIG5");
    expect(room.exits?.map((e) => e.dir)).toEqual(["north", "east", "west"]);
    expect(room.npcs?.some((n) => n.name.includes("木老七"))).toBe(true);
    expect(room.npcs?.some((n) => n.name.includes("店小二"))).toBe(true);
    expect(room.items?.some((i) => i.name.includes("石头"))).toBe(true);
  });

  it("ignores question-mark-only inventory lines from garbled encoding", () => {
    const text = `沙滩 -
    这里是侠客岛外的一片沙滩。
    这里明显的出口是 north。
  渔夫(Yu fu)
  ????????????????
  一块石头`;

    const room = parseRoom(text);
    expect(room.npcs?.some((n) => n.name.includes("渔夫"))).toBe(true);
    expect(room.items?.some((i) => i.name.includes("石头"))).toBe(true);
    expect(room.items?.every((i) => !/^\?+$/.test(i.name))).toBe(true);
  });

  it("parses 挂名处 after 沙滩 without keeping the old title", () => {
    const text = `沙滩 -
    极目远眺，海上只见几点淡淡的帆影。
    这里没有任何明显的出路。
  张三(Zhang san)
侠客岛挂名处 - 
这是一个大厅，厅的中央是一张大桌子。
    这里没有任何明显的出路。
  木老七（Mu laoqi）`;

    const room = parseRoom(text);
    expect(room.title).toBe("侠客岛挂名处");
    expect(room.desc).toContain("这是一个大厅");
    expect(room.exits).toEqual([]);
    expect(room.npcs?.some((n) => n.name.includes("木老七"))).toBe(true);
  });
});

describe("isLoginNoise", () => {
  it("detects welcome and BIG5 lines", () => {
    expect(isLoginNoise("Do you want to use BIG5 code?(y/n)")).toBe(true);
    expect(isLoginNoise("有任何意见，请 email 给 xkx@egroups.com")).toBe(true);
    expect(isLoginNoise("店小二说道：客官里面请")).toBe(false);
  });
});

describe("isProtocolNoise", () => {
  it("filters JSON protocol markers and payloads", () => {
    expect(isProtocolNoise('@@JSON@@{"v":1,"type":"room.update"}@@ENDJSON@@')).toBe(
      true
    );
    expect(
      isProtocolNoise('{"v":1,"type":"player.vitals","vitals":{"qi":1}}')
    ).toBe(true);
    expect(isProtocolNoise("你来到了沙滩。")).toBe(false);
  });
});

describe("isSheetDumpLine", () => {
  it("filters hp / score / skills / inventory panel lines", () => {
    expect(isSheetDumpLine("> hp")).toBe(true);
    expect(isSheetDumpLine("> look me")).toBe(true);
    expect(
      isSheetDumpLine("                  【侠客行个人档案】(GB中文)")
    ).toBe(true);
    expect(isSheetDumpLine("【 布  衣 】测试(Test)")).toBe(true);
    expect(isSheetDumpLine("【系统】今晚维护")).toBe(false);
    expect(
      isSheetDumpLine(" 膂力：[ 18/ 16] 悟性：[ 20/ 18] 根骨：[ 17/ 15] 身法：[ 19/ 17]")
    ).toBe(true);
    expect(isSheetDumpLine(" 精：  100/  100 (100%)    精力：   80 /  100 (+0)")).toBe(
      true
    );
    expect(isSheetDumpLine(" 气：   90/  100 ( 90%)    内力：   50 /  120 (+0)")).toBe(
      true
    );
    expect(isSheetDumpLine(" 精力：")).toBe(true);
    expect(isSheetDumpLine(" 内力：")).toBe(true);
    expect(isSheetDumpLine(" 精  ：■■■■□□□□")).toBe(true);
    expect(isSheetDumpLine("你目前所学过的技能有：")).toBe(true);
    expect(isSheetDumpLine("你目前并没有学会任何技能。")).toBe(true);
    expect(isSheetDumpLine("基本轻功 ─────────── 45")).toBe(true);
    expect(
      isSheetDumpLine(
        "│□基本轻功 (dodge)                   - 初学乍练   45/   123│"
      )
    ).toBe(true);
    expect(
      isSheetDumpLine("┌──────────────────────┐")
    ).toBe(true);
    expect(isSheetDumpLine("□长剑（武器）")).toBe(true);
    expect(isSheetDumpLine("□布衣(Cloth)")).toBe(true);
    expect(isSheetDumpLine("目前你身上没有任何东西。")).toBe(true);
    expect(
      isSheetDumpLine("你身上带著下列这些东西(负重 3%)：")
    ).toBe(true);
    const invChunk = "你身上带著下列这些东西(负重 3%)：\n  布衣(Cloth)\n□长剑(Sword)";
    expect(isSheetDumpLine("  布衣(Cloth)", invChunk)).toBe(true);
    expect(isSheetDumpLine("店小二说道：客官里面请")).toBe(false);
    expect(isSheetDumpLine("你向北方走去。")).toBe(false);
    expect(isSheetDumpLine("  渔夫(Fu)")).toBe(false);
    expect(
      isSheetDumpLine(
        "渔夫说道：这里就是侠客岛。两位岛主每年都派弟子到中原。"
      )
    ).toBe(false);
  });
});

describe("isSelfLookLine", () => {
  it("detects look-me lines but not NPC ask replies", () => {
    expect(isSelfLookLine("你看起来约十多岁。")).toBe(true);
    expect(isSelfLookLine("你看起来气血充盈，并没有受伤。")).toBe(true);
    expect(isSelfLookLine("你身上带著：")).toBe(true);
    expect(isSelfLookLine("  □布衣(Cloth)")).toBe(true);
    expect(
      isSelfLookLine(
        "渔夫说道：这里就是侠客岛。两位岛主每年都派弟子到中原，找寻资质不凡的少年上岛。你就是今年被选上的吧。"
      )
    ).toBe(false);
    expect(isSelfLookLine("你向渔夫打听有关『侠客岛』的消息。")).toBe(false);
  });
});

describe("stripScoreBanner / buildScoreHtml", () => {
  it("removes personal archive banner and keeps body", () => {
    const raw =
      "                  【侠客行个人档案】(GB中文)\n\n 一介布衣张三\n 膂力：[18/16]";
    expect(stripScoreBanner(raw)).toBe(" 一介布衣张三\n 膂力：[18/16]");
    expect(buildScoreHtml(raw)).not.toMatch(/个人档案/);
    expect(buildScoreHtml(raw)).toContain("膂力");
  });

  it("keeps colored html lines without the banner", () => {
    const html = buildScoreHtml(
      "【侠客行个人档案】(GB中文)\n膂力",
      [
        '<span class="mud-fg-gold">【侠客行个人档案】(GB中文)</span>',
        '<span class="mud-fg-jade">膂力</span>',
      ]
    );
    expect(html).not.toMatch(/个人档案/);
    expect(html).toContain('mud-fg-jade');
    expect(html).toContain("膂力");
  });

  it("drops terminal bar graph lines from fallback html", () => {
    const html = buildScoreHtml("经验： 12\n 精  ：■■■□□□\n神  ： 1", [
      "经验： 12",
      " 精  ：■■■□□□",
      "神  ： 1",
    ]);
    expect(html).toContain("经验");
    expect(html).not.toMatch(/■/);
  });
});

describe("parseScore", () => {
  it("parses attrs bio and totals without bar clutter", () => {
    const raw = `
【侠客行个人档案】(GB中文)

 一介布衣测试
 你是一个二十岁两个月的男性人类，甲子年正月初一生。
 你的师父是张三丰。
 膂力：[ 18/ 16] 悟性：[ 20/ 20] 根骨：[ 15/ 17] 身法：[ 19/ 19]

 精  ：■■■■□□□□
 气  ：■■■■□□□□
 经验： 12480
 神  ：        120
 阅历： 35
 你到目前为止总共杀了 12 个人，其中有 1 个是其他玩家。
 你到目前为止总共死了 3 次，其中 2 次是正常死亡。
`;
    const score = parseScore(raw);
    expect(score.headline).toContain("测试");
    expect(score.bio).toMatch(/二十岁/);
    expect(score.master).toBe("张三丰");
    expect(score.attrs?.str).toEqual({ cur: 18, base: 16 });
    expect(score.attrs?.con).toEqual({ cur: 15, base: 17 });
    expect(score.exp).toBe(12480);
    expect(score.shen).toBe(120);
    expect(score.questExp).toBe(35);
    expect(score.kills).toBe(12);
    expect(score.playerKills).toBe(1);
    expect(score.deaths).toBe(3);
    expect(score.normalDeaths).toBe(2);
  });
});

describe("parseEntityShort", () => {
  it("splits chinese name and english id", () => {
    expect(parseEntityShort("木老七（Mu laoqi）")).toEqual({
      id: "mu laoqi",
      name: "木老七",
      kind: "npc",
    });
  });
});

describe("parseSuggestedActions", () => {
  it("extracts follow hint and labels with npc name", () => {
    const text =
      "木老七说道：请跟我来。\n    (follow mu laoqi)\n请快跟我来。(请键入follow mu laoqi)";
    const npcs = [{ id: "mu laoqi", name: "木老七", kind: "npc" as const }];
    const actions = parseSuggestedActions(text, npcs);
    expect(actions).toEqual([
      { command: "follow mu laoqi", label: "跟随木老七" },
    ]);
  });

  it("extracts enter and ask hints", () => {
    const text =
      "快上船吧。别被别人看到了。(enter)\n(ask fu about 侠客岛)";
    const actions = parseSuggestedActions(text, [
      { id: "fu", name: "渔夫", kind: "npc" },
    ]);
    expect(actions.map((a) => a.command)).toEqual([
      "enter",
      "ask fu about 侠客岛",
    ]);
    expect(labelSuggestedAction("enter")).toBe("上船");
    expect(labelSuggestedAction("ask fu about 侠客岛", [
      { id: "fu", name: "渔夫", kind: "npc" },
    ])).toBe("向渔夫打听侠客岛");
  });

  it("splits comma-joined ask hints from fisherman greeting", () => {
    const text =
      "你要是有什麽问题可以问我。\n(ask fu about 侠客岛，ask fu about 离岛)";
    const npcs = [{ id: "fu", name: "渔夫", kind: "npc" as const }];
    const actions = parseSuggestedActions(text, npcs);
    expect(actions.map((a) => a.command)).toEqual([
      "ask fu about 侠客岛",
      "ask fu about 离岛",
    ]);
    expect(actions.map((a) => a.label)).toEqual([
      "向渔夫打听侠客岛",
      "向渔夫打听离岛",
    ]);
  });

  it("does not surface help / list / read as scene actions", () => {
    expect(parseSuggestedActions("侠客岛告示牌的使用方法请见 help board")).toEqual(
      []
    );
    expect(parseSuggestedActions("请用help board查看留言版使用方法。")).toEqual(
      []
    );
    expect(parseSuggestedActions("(help rules) (foobar baz)")).toEqual([]);
    expect(parseSuggestedActions("(list) (read 1)")).toEqual([]);
    expect(labelSuggestedAction("help skills")).toBe("查看「skills」说明");
    expect(labelSuggestedAction("help board")).toBe("留言板说明");
  });

  it("recognizes doc-reading commands and more prompts", () => {
    expect(isDocReadingCommand("help board")).toBe(true);
    expect(isDocReadingCommand("list")).toBe(true);
    expect(isDocReadingCommand("read new")).toBe(true);
    expect(isDocReadingCommand("follow zhang san")).toBe(false);
    expect(
      isMorePromptLine(
        "== 未完继续 40% == (n 或 <ENTER> 继续下一页，q 离开，b 前一页)"
      )
    ).toBe(true);
    expect(isMorePromptLine("木老七说道：请跟我来。")).toBe(false);
  });

  it("ignores unknown verbs", () => {
    expect(parseSuggestedActions("(foobar baz)")).toEqual([]);
  });

  it("extracts register hint for 挂名处", () => {
    const text =
      "请到这边来登个记吧。\n\t\t(register xxxxx@yyyy.zzz)\n千万不能有错";
    const actions = parseSuggestedActions(text);
    expect(actions).toEqual([
      { command: "register xxxxx@yyyy.zzz", label: "挂名登记" },
    ]);
  });

  it("ignores bare get from fisherman newbie tutorial on beach", () => {
    const text =
      "地上有什麽东西你都可以捡起来\n    (get)收着。(ask fu about 侠客岛，ask fu about 离岛)";
    const npcs = [{ id: "fu", name: "渔夫", kind: "npc" as const }];
    const actions = parseSuggestedActions(text, npcs);
    expect(actions.map((a) => a.command)).toEqual([
      "ask fu about 侠客岛",
      "ask fu about 离岛",
    ]);
  });
});

describe("parseBoardReadActions", () => {
  it("builds read chips from board list lines", () => {
    const text = `侠客岛告示牌上现有下列留言：
————————————————————————
[ 1]  欢迎来到侠客岛                              木老七 (Jul 15 12:00)
[ 2]  岛规须知                                    张三 (Jul 16 09:30)
[12]  超长标题用来测试截断显示是否正确无误        李四 (Jul 16 10:00)`;
    const actions = parseBoardReadActions(text);
    expect(actions.map((a) => a.command)).toEqual([
      "read 1",
      "read 2",
      "read 12",
    ]);
    expect(actions[0].label).toBe("阅读「欢迎来到侠客岛」");
    expect(actions[2].label).toMatch(/^阅读「超长标题用来测试截断/);
    expect(labelSuggestedAction("read new")).toBe("读新留言");
    expect(labelSuggestedAction("list")).toBe("浏览留言");
  });

  it("respects limit", () => {
    const lines = Array.from(
      { length: 12 },
      (_, i) => `[${String(i + 1).padStart(2, " ")}]  标题${i + 1}                    作者`
    ).join("\n");
    expect(parseBoardReadActions(lines, 3)).toHaveLength(3);
  });
});

describe("beachGreeterActions", () => {
  it("offers follow when 张三 is on the beach", () => {
    expect(
      beachGreeterActions("沙滩", [
        { id: "zhang san", name: "张三", kind: "npc" },
      ])
    ).toEqual([{ command: "follow zhang san", label: "跟随张三" }]);
  });

  it("offers ask chips when fisherman is on the beach", () => {
    expect(
      beachGreeterActions("沙滩", [
        { id: "yu fu", name: "渔夫", kind: "npc" },
      ]).map((a) => a.command)
    ).toEqual(["ask fu about 侠客岛", "ask fu about 离岛"]);
  });

  it("is empty outside the beach", () => {
    expect(
      beachGreeterActions("侠客岛挂名处", [
        { id: "zhang san", name: "张三", kind: "npc" },
      ])
    ).toEqual([]);
  });
});

describe("waterfallPassageActions", () => {
  it("offers climb wear jump on 瀑布", () => {
    expect(waterfallPassageActions("瀑布").map((a) => a.command)).toEqual([
      "climb tree",
      "remove cloth",
      "wear rain coat",
      "jump fall",
    ]);
    expect(labelSuggestedAction("climb tree")).toBe("爬树取雨衣");
    expect(labelSuggestedAction("remove cloth")).toBe("脱下布衣");
    expect(labelSuggestedAction("wear rain coat")).toBe("穿上雨衣");
    expect(labelSuggestedAction("jump fall")).toBe("跳进瀑布");
    expect(waterfallPassageActions("沙滩")).toEqual([]);
  });
});

describe("parseRoom inventory ids", () => {
  it("stores english id separately for follow", () => {
    const text = `沙滩 -
    这里是沙滩。
    这里明显的出口是 north。
  木老七（Mu laoqi）`;
    const room = parseRoom(text);
    expect(room.npcs?.[0]).toMatchObject({
      id: "mu laoqi",
      name: "木老七",
    });
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

describe("reflowSoftWrappedEntries", () => {
  it("joins author soft-wrap mid-sentence (渔夫离岛 reply)", () => {
    const a =
      "渔夫说道：要去中原可得要岛主同意才行，我也不敢私自出海。等你";
    const b = "功夫有点小成，岛主就会让你离岛回中原去闯天下了。";
    expect(shouldJoinSoftWrap(a, b)).toBe(true);
    const out = reflowSoftWrappedEntries([
      { text: a, html: `<span class="mud-fg-cyan">${a}</span>` },
      { text: b, html: `<span class="mud-fg-cyan">${b}</span>` },
    ]);
    expect(out).toHaveLength(1);
    expect(out[0].text).toBe(a + b);
    expect(out[0].html).toContain("mud-fg-cyan");
    expect(out[0].html).toContain("功夫有点小成");
  });

  it("does not join sentence-complete lines", () => {
    expect(
      shouldJoinSoftWrap("这里就是侠客岛。", "两位岛主每年都派弟子到中原。")
    ).toBe(false);
  });

  it("does not join indented inventory / entity lines", () => {
    expect(shouldJoinSoftWrap("你身上带着：", "  布衣(cloth)")).toBe(false);
    expect(shouldJoinSoftWrap("  布衣(cloth)", "  长剑(sword)")).toBe(false);
  });

  it("does not join board list rows", () => {
    expect(
      shouldJoinSoftWrap("告示牌上现有下列留言：", "[ 1]  欢迎来到侠客岛")
    ).toBe(false);
  });

  it("inserts a space when joining ASCII word wrap", () => {
    const a = "Please wait for the master to allow you to leave the island and";
    const b = "return to the mainland.";
    // pad a to incomplete threshold with CJK-free long English
    expect(a.length).toBeGreaterThanOrEqual(40);
    expect(shouldJoinSoftWrap(a, b)).toBe(true);
    const out = reflowSoftWrappedEntries([{ text: a }, { text: b }]);
    expect(out[0].text).toBe(`${a} ${b}`);
  });
});
