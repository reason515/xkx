import { describe, expect, it } from "vitest";
import {
  beachGreeterActions,
  weaponRoomActions,
  buildAskTopicActions,
  buildScoreHtml,
  carriageTravelActions,
  closedDoorActions,
  inferredShutDoorActions,
  extractLookBlock,
  isCarriageItem,
  isCombatLine,
  isDocReadingCommand,
  isLoginNoise,
  isMorePromptLine,
  isProtocolNoise,
  chunkLooksLikeSelfLook,
  extractSelfLookPanel,
  isSelfLookLine,
  isSelfLookStopLine,
  isSheetDumpLine,
  DEFAULT_WIMPY_PCT,
  parseWimpyPct,
  isRoomLookChunk,
  isRoomLookLine,
  suggestedActionsFromRoomText,
  isTrainLine,
  labelAskTopic,
  labelSuggestedAction,
  mudCommandTarget,
  parseBoardReadActions,
  parseEntityShort,
  parseExits,
  parseHp,
  formatVitalMeter,
  parseVendorGoods,
  vitalCap,
  parseInventory,
  parseRoom,
  parseScore,
  parseSkills,
  parseSuggestedActions,
  parseSceneryFromDesc,
  roomUtilityActions,
  reflowSoftWrappedEntries,
  reflowSoftWrappedText,
  shouldJoinSoftWrap,
  stripScoreBanner,
  waterfallPassageActions,
  parseLearnOfferActions,
  buildLearnTopicActions,
  labelLearnTopic,
  parseSkillsPanelLearnActions,
  parseEnableMap,
  suggestEnableSlots,
  resolveEnableSlots,
  applySkillEnableSlots,
  hasMappedForce,
  hasLearnedForceSkill,
  FORCE_EXERT_ACTIONS,
  isBasicSkillId,
  reconcileEnableMap,
  isEntitySheetAction,
  sceneActionChips,
  suggestsRoomLayoutChange,
  isStaticPassageLine,
  classifyInvEquip,
  invCommandTarget,
  bagItemActions,
  groundItemActions,
  applyEquipOptimistic,
  coconutTreeActions,
  mountainFruitActions,
  fishingSpotActions,
  parseHelpDocActions,
  inventoryHasStone,
  inventoryHasFishingPole,
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

describe("isRoomLookLine", () => {
  const beachLook = `沙滩 - 
    蓝蓝的大海一望无边。岸边不远处停着几只小船。
    太阳正高挂在东方的天空中。
    这里明显的出口是 north、east 和 northwest。
  渔夫(Yu fu)
  石块(Shikuai)`;

  it("filters classic room look structure, keeps dialogue and movement", () => {
    expect(isRoomLookChunk(beachLook)).toBe(true);
    expect(isRoomLookLine("沙滩 -", beachLook)).toBe(true);
    expect(
      isRoomLookLine("    蓝蓝的大海一望无边。岸边不远处停着几只小船。", beachLook)
    ).toBe(true);
    // Soft-wrapped look continuation (no leading indent) must also be filtered
    expect(
      isRoomLookLine(
        "踩在脚下软软的好不舒服。不时有几只小蟹横行而过。",
        beachLook
      )
    ).toBe(true);
    expect(
      isRoomLookLine(
        "    这里明显的出口是 north、east 和 northwest。",
        beachLook
      )
    ).toBe(true);
    expect(isRoomLookLine("  渔夫(Yu fu)", beachLook)).toBe(true);
    expect(isRoomLookLine("  石块(Shikuai)", beachLook)).toBe(true);
    expect(
      isRoomLookLine("这里明显的出口是 north、east 和 northwest。")
    ).toBe(true);

    expect(isRoomLookLine("店小二说道：客官里面请")).toBe(false);
    expect(isRoomLookLine("你向北方走去。")).toBe(false);
    expect(isRoomLookLine("拉开屏风，露出一条甬道。")).toBe(false);
    expect(isRoomLookLine("  渔夫(Yu fu)")).toBe(false);
    expect(isRoomLookLine("> say 测试")).toBe(false);

    const dadongLook = `大山洞 -
    这是一个很大的山洞。
    屏风已被拉开，露出一条长长的甬道。
    这里明显的出口是 south 和 enter。
  厮仆(Si pu)`;
    expect(isRoomLookChunk(dadongLook)).toBe(true);
    expect(
      isRoomLookLine("    屏风已被拉开，露出一条长长的甬道。", dadongLook)
    ).toBe(true);
    expect(
      isRoomLookLine(
        "渔夫说道：这里就是侠客岛。两位岛主每年都派弟子到中原。"
      )
    ).toBe(false);
  });

  it("extracts parenthetical actions from room long without 见闻", () => {
    const actions = suggestedActionsFromRoomText(
      "岸边停着小船，不妨 (yell boat) 招呼船家。",
      [],
      "汉水南岸"
    );
    expect(actions.map((a) => a.command)).toContain("yell boat");
  });

  it("infers study/du practice from scenery like 石壁 and 书", () => {
    const wallRoom =
      "东面是块打磨光滑的大石壁(wall)，石壁旁点燃着火把。";
    expect(
      suggestedActionsFromRoomText(wallRoom).map((a) => a.command)
    ).toContain("study wall");
    expect(
      groundItemActions("wall", "大石壁", true).map((a) => a.command)
    ).toEqual(["look wall", "study wall"]);

    const bookDesc =
      "桌上放着一本线装书(book)。你可以试着读书(du book)去学点基本内功。";
    expect(
      suggestedActionsFromRoomText(bookDesc).map((a) => a.command)
    ).toEqual(expect.arrayContaining(["du book"]));
    expect(
      groundItemActions("book", "线装书", true).map((a) => a.command)
    ).toEqual(["look book", "du book"]);
  });

  it("木桩练功用 strike，勿发战斗 hit", () => {
    const shanxia =
      "山脚下是一块平地，四周摆了几个木桩(muzhuang)。这里好象是个练武场。";
    expect(
      suggestedActionsFromRoomText(shanxia).map((a) => a.command)
    ).toContain("strike muzhuang");
    expect(
      suggestedActionsFromRoomText(shanxia).map((a) => a.command)
    ).not.toContain("hit muzhuang");
    expect(
      groundItemActions("muzhuang", "木桩", true).map((a) => a.command)
    ).toEqual(["look muzhuang", "strike muzhuang"]);
    expect(labelSuggestedAction("strike muzhuang")).toBe("击打木桩");

    // 山洞描写偶写 (hit zhuang)，归一成 strike
    const cave =
      "地上埋着几根木桩(zhuang),一个年青小伙子正踩着马步打着木桩(hit zhuang)。";
    expect(
      suggestedActionsFromRoomText(cave).map((a) => a.command)
    ).toContain("strike zhuang");
    expect(
      suggestedActionsFromRoomText(cave).map((a) => a.command)
    ).not.toContain("hit zhuang");
    expect(
      groundItemActions("zhuang", "木桩", true).map((a) => a.command)
    ).toEqual(["look zhuang", "strike zhuang"]);
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
    // refreshCharacter 连发 look me + hp 时，提示符会粘在气血行首
    expect(
      isSheetDumpLine(">  精：  175/  175 (100%)    精力：  400 /  400 (+1)")
    ).toBe(true);
    expect(isSheetDumpLine("> 气：  200/  200 (100%)    内力：    0 /  400 (+0)")).toBe(
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
    // prepare/bei 对新手（无 skill_map）返回带「有效」的变体，勿漏进见闻
    expect(isSheetDumpLine("你现在没有使用任何有效特殊技能。")).toBe(true);
    expect(isSheetDumpLine("你现在没有使用任何特殊技能。")).toBe(true);
    expect(isSheetDumpLine("你现在没有组合任何特殊拳术技能。")).toBe(true);
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
    // look me / 行囊：□ 装备仍属角色卡
    const selfLook =
      "你看起来约二十多岁。\n你身上带著：\n  □布衣(Cloth)\n  □长剑(Changjian)";
    expect(isSheetDumpLine("  □布衣(Cloth)", selfLook)).toBe(true);
    // NPC look：同包或拆包到达的装备都必须进见闻
    const npcLook =
      "一个二十来岁的男装女子。\n她看起来约二十多岁。\n她看起来气血充盈，并没有受伤。\n她身上带著：\n  □白袍(Bai pao)";
    expect(isSheetDumpLine("她身上带著：", npcLook)).toBe(false);
    expect(isSheetDumpLine("  □白袍(Bai pao)", npcLook)).toBe(false);
    // 真实链路：装备行常在下一 TCP 分片，包内没有「身上带著」头
    expect(isSheetDumpLine("  □白袍(Bai pao)", "  □白袍(Bai pao)\r\n> ")).toBe(
      false
    );
    expect(isSheetDumpLine("店小二说道：客官里面请")).toBe(false);
    expect(isSheetDumpLine("你向北方走去。")).toBe(false);
    expect(isSheetDumpLine("  渔夫(Fu)")).toBe(false);
    expect(
      isSheetDumpLine(
        "渔夫说道：这里就是侠客岛。两位岛主每年都派弟子到中原。"
      )
    ).toBe(false);
    expect(isSheetDumpLine("> wimpy")).toBe(true);
    expect(
      isSheetDumpLine("你现在的当「气」低於 50% 时就会尝试逃跑。")
    ).toBe(true);
    expect(isSheetDumpLine("设定环境变量：wimpy = 60")).toBe(true);
  });
});

describe("parseWimpyPct", () => {
  it("parses query / set feedback and clamps", () => {
    expect(DEFAULT_WIMPY_PCT).toBe(50);
    expect(parseWimpyPct("你现在的当「气」低於 50% 时就会尝试逃跑。")).toBe(
      50
    );
    expect(parseWimpyPct('你现在的当"气"低于 0% 时就会尝试逃跑。')).toBe(0);
    expect(parseWimpyPct("设定环境变量：wimpy = 70")).toBe(70);
    expect(parseWimpyPct(">  你现在的当「气」低於 80% 时就会尝试逃跑。")).toBe(
      80
    );
    expect(parseWimpyPct("设定环境变量：wimpy = 99")).toBe(80);
    expect(parseWimpyPct("Ok.")).toBeNull();
    expect(parseWimpyPct("店小二说道：客官里面请")).toBeNull();
  });
});

describe("isSelfLookLine", () => {
  it("detects look-me lines but not NPC ask replies", () => {
    expect(isSelfLookLine("普通百姓 测试(Elgvzn)。")).toBe(true);
    expect(isSelfLookLine("少林派第十八代弟子 测试(Test)。")).toBe(true);
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
    expect(isSelfLookLine("  渔夫(Fu)")).toBe(false);
  });
});

describe("extractSelfLookPanel", () => {
  it("keeps gear under 身上带著 and drops glued hp lines", () => {
    const chunk = `你看起来约二十多岁。
你看起来气血充盈，并没有受伤。
你身上带著：
  □布衣(Cloth)
  □长剑(Changjian)
 精：  100/  100 (100%)    精力：   80 /  100 (+0)
 气：   90/  100 ( 90%)    内力：   50 /  120 (+0)
 食物：  120/  200         潜能：   10 /   100
 饮水：   90/  200         经验： 100`;
    const { text } = extractSelfLookPanel(chunk);
    expect(text).toContain("你身上带著：");
    expect(text).toContain("□布衣(Cloth)");
    expect(text).toContain("□长剑(Changjian)");
    expect(text).not.toMatch(/精\s*[：:]/);
    expect(text).not.toMatch(/精力\s*[：:]/);
    expect(text).not.toMatch(/气\s*[：:]/);
    expect(text).not.toMatch(/经验\s*[：:]/);
  });

  it("does not treat inventory 下列 dump as look-me start alone", () => {
    expect(
      chunkLooksLikeSelfLook(
        "你身上带著下列这些东西(负重 3%)：\n  □布衣(Cloth)\n  米饭(Rice)"
      )
    ).toBe(false);
    expect(isSelfLookStopLine("你身上带著下列这些东西(负重 3%)：")).toBe(true);
    expect(isSelfLookStopLine(" 精：  100/  100 (100%)    精力：   80 /  100 (+0)")).toBe(
      true
    );
  });

  it("drops prompt-glued hp line (real merged look me + hp chunk)", () => {
    // Real server capture: refreshCharacter fires look me + hp back-to-back,
    // MUD prompt「>」glues onto the hp line → ">  精：  175/  175 ...".
    const real = [
      "普通百姓 测试(Elgvzn)。",
      "你看起来约十多岁。",
      "你看起来气血充盈，并没有受伤。",
      "你身上带著：",
      "  □布衣(Cloth)",
      ">  精：  175/  175 (100%)    精力：  400 /  400 (+1)",
      " 气：  200/  200 (100%)    内力：    0 /  400 (+0)",
      " 食物：  350/  350         潜能：   97 /   97",
      " 饮水：  350/  350         经验： 0",
      "",
      "> > > ",
    ].join("\r\n");
    expect(chunkLooksLikeSelfLook(real)).toBe(true);
    const { text } = extractSelfLookPanel(real);
    expect(text).toContain("你身上带著：");
    expect(text).toContain("□布衣(Cloth)");
    expect(text).not.toMatch(/精\s*[：:]/);
    expect(text).not.toMatch(/精力/);
    expect(text).not.toMatch(/气\s*[：:]/);
    expect(text).not.toMatch(/^\s*>/m);
    expect(text).not.toMatch(/> > >/);
  });

  it("aligns html lines with kept plain lines", () => {
    const lines = [
      "你看起来约二十多岁。",
      "你身上带著：",
      "  □布衣(Cloth)",
      " 精：  100/  100 (100%)    精力：   80 /  100 (+0)",
    ];
    const htmlLines = [
      '<span class="mud-fg-jade">你看起来约二十多岁。</span>',
      "你身上带著：",
      '<span class="mud-fg-cyan">  □布衣(Cloth)</span>',
      '<span class="mud-fg-jade"> 精：  100/  100</span>',
    ];
    const { text, html } = extractSelfLookPanel(lines.join("\n"), htmlLines);
    expect(text).toContain("□布衣(Cloth)");
    expect(text).not.toMatch(/精/);
    expect(html).toContain("□布衣(Cloth)");
    expect(html).not.toMatch(/精/);
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
 攻击力: 12 (+3)		 防御力： 8 (+5)
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
    expect(score.attack).toBe(12);
    expect(score.attackBonus).toBe(3);
    expect(score.defense).toBe(8);
    expect(score.defenseBonus).toBe(5);
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

  it("extracts sleep hint from rest room prose", () => {
    const text =
      "如果你累了，就可以在这里睡觉(sleep)。墙上好象贴着一张小条子(tiaozi)。";
    expect(parseSuggestedActions(text).map((a) => a.command)).toEqual([
      "sleep",
    ]);
    expect(labelSuggestedAction("sleep")).toBe("睡觉");
  });

  it("parses scenery item_desc ids into lookable items", () => {
    const desc =
      "如果你累了，就可以在这里睡觉(sleep)。墙上好象贴着一张小条子(tiaozi)。";
    expect(parseSceneryFromDesc(desc)).toEqual([
      { id: "tiaozi", name: "小条子", kind: "item", scenery: true },
    ]);
    expect(
      roomUtilityActions({ title: "休息室", desc, canSleep: true }).map(
        (a) => a.command
      )
    ).toEqual(["sleep"]);
  });

  it("treats 洞(hole)+钻(zuan) as scenery+action, not fake items", () => {
    // yongdao2 / shibi: 「洞(hole)，好象可以钻(zuan)进去」must not yield
    // items「洞」「象可以钻」— only lookable hole + zuan hole chip.
    const yongdao =
      "西边有一个洞(hole)，好象可以钻(zuan)进去。";
    expect(parseSceneryFromDesc(yongdao)).toEqual([
      { id: "hole", name: "洞", kind: "item", scenery: true },
    ]);
    expect(suggestedActionsFromRoomText(yongdao).map((a) => a.command)).toEqual(
      ["zuan hole"]
    );
    expect(labelSuggestedAction("zuan hole")).toBe("钻洞");

    const shibi =
      "左边好象有个小洞(hole)，似乎可以钻(zuan)进去。从这跳(jump)下去就是山脚了。";
    expect(parseSceneryFromDesc(shibi)).toEqual([
      { id: "hole", name: "小洞", kind: "item", scenery: true },
    ]);
    const shibiCmds = suggestedActionsFromRoomText(shibi).map((a) => a.command);
    expect(shibiCmds).toContain("zuan hole");
    expect(shibiCmds).toContain("jump down");
    expect(shibiCmds).not.toContain("jump hole");
    expect(shibiCmds).not.toContain("jump zuan");

    // penglai: bare zuan with no hole id
    expect(
      suggestedActionsFromRoomText("如想通过就只有钻(zuan)进石缝。").map(
        (a) => a.command
      )
    ).toEqual(["zuan"]);
  });

  it("names 瀑布(fall) as 瀑布 not 是一道瀑布", () => {
    // pubu.c long: 「迎面是一道瀑布(fall)」—「面」曾被量词表误吞
    const desc =
      "山路的尽头，迎面是一道瀑布(fall)从十余丈的高处直挂下来。小潭旁有一棵大树(tree)。";
    expect(parseSceneryFromDesc(desc)).toEqual([
      { id: "fall", name: "瀑布", kind: "item", scenery: true },
      { id: "tree", name: "大树", kind: "item", scenery: true },
    ]);
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

  it("does not bind tutorial (look)/(get) into look/get chips", () => {
    // Fisherman greeting: 「四处看看(look)…捡起来(get)收着」must not become
    // a "拿起look" ground-item action bound to the preceding (look) mention.
    const text =
      "渔夫说道：你不妨四处看看(look)。地上有什麽东西你都可以捡起来(get)收着。" +
      "你可以先查查(i or inventory)看你现在身上有些什麽。(ask fu about 侠客岛)";
    const npcs = [{ id: "fu", name: "渔夫", kind: "npc" as const }];
    const commands = parseSuggestedActions(text, npcs).map((a) => a.command);
    expect(commands).not.toContain("get look");
    expect(commands.some((c) => /^get\b/.test(c))).toBe(false);
    expect(commands.some((c) => /^look\b/.test(c))).toBe(false);
    expect(commands).toContain("ask fu about 侠客岛");
  });

  it("discovers nested scenery and binds item_desc bare actions", () => {
    const text =
      "亭旁的大石(stone)後好象有什麽东西。\n" +
      "@@ITEM:stream@@\n涧水清澈，不时有鱼儿(fish)跃出水面。\n" +
      "@@ITEM:stone@@\n这是一块大山石，想看看後面是什麽，就要把大石移开(move)。";
    expect(parseSceneryFromDesc(text)).toEqual(
      expect.arrayContaining([
        { id: "fish", name: "鱼儿", kind: "item", scenery: true },
        { id: "stone", name: "大石", kind: "item", scenery: true },
      ])
    );
    expect(parseSuggestedActions(text)).toContainEqual({
      command: "move stone",
      label: "搬动大石",
    });
    expect(
      labelSuggestedAction("move stone", [
        { id: "stone", name: "大石", kind: "item", scenery: true },
      ])
    ).toBe("搬开大石");
    expect(groundItemActions("fish", "鱼儿", true)).toEqual([
      { label: "查看", command: "look fish" },
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

  it("does not inject fisherman ask chips without text hints", () => {
    expect(
      beachGreeterActions("沙滩", [
        { id: "yu fu", name: "渔夫", kind: "npc" },
      ])
    ).toEqual([]);
  });

  it("is empty outside the beach", () => {
    expect(
      beachGreeterActions("侠客岛挂名处", [
        { id: "zhang san", name: "张三", kind: "npc" },
      ])
    ).toEqual([]);
  });
});

describe("mudCommandTarget / buildAskTopicActions", () => {
  it("prefers short english alias for multi-word ids", () => {
    expect(mudCommandTarget("yu fu", "渔夫")).toBe("fu");
    expect(mudCommandTarget("fu", "渔夫")).toBe("fu");
    expect(mudCommandTarget("店小二", "店小二")).toBe("店小二");
    expect(mudCommandTarget("xiao er", "店小二")).toBe("er");
  });

  it("avoids generic dizi suffix and prefers commandId", () => {
    // 山顶：黄衣弟子 / 中伯 都有 dizi，末词会指错人
    expect(mudCommandTarget("huangyi dizi", "黄衣弟子")).toBe("huangyi");
    expect(mudCommandTarget("wudang dizi", "中伯")).toBe("wudang");
    expect(mudCommandTarget("huangyi dizi", "黄衣弟子", "huangyi")).toBe(
      "huangyi"
    );
    expect(mudCommandTarget("wudang dizi", "中伯", "zhongbo")).toBe("zhongbo");
  });

  it("learn topics for 黄衣弟子 use unique teacher id not dizi", () => {
    const hints = [
      { command: "learn dizi sword", label: "向黄衣弟子学剑法" },
      { command: "learn huangyi force", label: "向黄衣弟子学内功" },
    ];
    const topics = buildLearnTopicActions(
      "huangyi dizi",
      "黄衣弟子",
      hints,
      "",
      "huangyi"
    );
    expect(topics.map((a) => a.command)).toEqual([
      "learn huangyi sword",
      "learn huangyi force",
    ]);
    expect(topics.map((a) => a.label)).toEqual(["剑法", "内功"]);
    expect(
      parseLearnOfferActions(
        "黄衣弟子说道：你可向我学剑法(sword)，内功(force)。",
        [
          {
            id: "huangyi dizi",
            name: "黄衣弟子",
            kind: "npc",
            commandId: "huangyi",
          },
          {
            id: "wudang dizi",
            name: "中伯",
            kind: "npc",
            commandId: "zhongbo",
          },
        ]
      ).map((a) => a.command)
    ).toEqual(["learn huangyi sword", "learn huangyi force"]);
  });

  it("recovers teach offers from recent 见闻 when glued with another NPC", () => {
    const log =
      "中伯说道：这位小兄弟你有什麽问题问我就好啦。\n" +
      "(ask dizi about 武当) 或试试 help wudang黄衣弟子说道：欢迎这位小兄弟，你可向我学剑法(sword)，内功(force)，招架(parry)及轻功(dodge)。";
    const topics = buildLearnTopicActions(
      "huangyi dizi",
      "黄衣弟子",
      [],
      "你要察看谁的技能？\n",
      "huangyi",
      log
    );
    expect(topics.map((a) => a.command)).toEqual([
      "learn huangyi sword",
      "learn huangyi force",
      "learn huangyi parry",
      "learn huangyi dodge",
    ]);
    expect(topics.map((a) => a.label)).toEqual([
      "剑法",
      "内功",
      "招架",
      "轻功",
    ]);
  });

  it("labels universal ask topics in Chinese", () => {
    expect(labelAskTopic("ask fu about name")).toBe("姓名");
    expect(labelAskTopic("ask fu about here")).toBe("此地");
    expect(labelAskTopic("ask fu about rumors")).toBe("江湖传闻");
    expect(labelAskTopic("ask fu about 侠客岛")).toBe("侠客岛");
    expect(labelSuggestedAction("ask fu about name", [
      { id: "fu", name: "渔夫", kind: "npc" },
    ])).toBe("向渔夫打听姓名");
  });

  it("merges scene hints, ask-list output, and universal topics", () => {
    const hints = [
      { command: "ask fu about 侠客岛", label: "向渔夫打听侠客岛" },
      { command: "ask fu about 离岛", label: "向渔夫打听离岛" },
    ];
    const listText = `你可以向渔夫打听下列话题：
    (ask fu about 侠客岛)
    (ask fu about 船)
    (ask fu about name)
    (ask fu about here)
    (ask fu about rumors)`;
    const topics = buildAskTopicActions("yu fu", "渔夫", hints, listText);
    expect(topics.map((a) => a.command)).toEqual([
      "ask fu about 侠客岛",
      "ask fu about 离岛",
      "ask fu about 船",
      "ask fu about name",
      "ask fu about here",
      "ask fu about rumors",
    ]);
    expect(topics.map((a) => a.label)).toContain("姓名");
    expect(topics.map((a) => a.label)).toContain("船");
  });

  it("parses ask-list lines that use Chinese who", () => {
    const listText = `你可以向渔夫打听下列话题：
    (ask 渔夫 about 船)
    (ask 渔夫 about 离岛)`;
    expect(
      buildAskTopicActions("yu fu", "渔夫", [], listText).map((a) => a.command)
    ).toEqual([
      "ask fu about 船",
      "ask fu about 离岛",
      "ask fu about name",
      "ask fu about here",
      "ask fu about rumors",
    ]);
  });

  it("still offers universal topics when no hints exist", () => {
    expect(
      buildAskTopicActions("xiao er", "店小二").map((a) => a.command)
    ).toEqual([
      "ask er about name",
      "ask er about here",
      "ask er about rumors",
    ]);
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

describe("xiakedao help-gap room actions", () => {
  it("coconutTreeActions offers pa tree", () => {
    expect(
      coconutTreeActions({
        items: [{ id: "yezi tree", name: "椰子树", kind: "item" }],
      }).map((a) => a.command)
    ).toEqual(["pa tree"]);
    expect(labelSuggestedAction("pa tree")).toBe("爬树摘椰子");
    expect(coconutTreeActions({ items: [] })).toEqual([]);
  });

  it("mountainFruitActions for 山顶 and 树上", () => {
    expect(mountainFruitActions("山顶").map((a) => a.command)).toEqual([
      "pa up",
    ]);
    expect(mountainFruitActions("树上").map((a) => a.command)).toEqual([
      "zhai guo",
      "pa down",
    ]);
    expect(mountainFruitActions("沙滩")).toEqual([]);
  });

  it("fishingSpotActions needs pole for fishing chip", () => {
    expect(
      fishingSpotActions({ title: "望海亭" }).map((a) => a.command)
    ).toEqual(["move stone"]);
    expect(
      fishingSpotActions(
        { title: "望海亭" },
        [{ id: "pole", name: "钓鱼杆", type: "pole" }]
      ).map((a) => a.command)
    ).toEqual(["move stone", "fishing"]);
    expect(
      inventoryHasFishingPole([{ id: "pole", name: "钓鱼杆", type: "" }])
    ).toBe(true);
  });

  it("bag smash coconut when stone present", () => {
    const yezi = { id: "yezi", name: "椰子", type: "yezi" };
    const stone = { id: "shikuai", name: "石块", type: "stone" };
    expect(inventoryHasStone([stone])).toBe(true);
    expect(bagItemActions(yezi, [yezi, stone]).map((a) => a.label)).toContain(
      "砸开"
    );
    expect(bagItemActions(yezi, [yezi]).map((a) => a.label)).not.toContain(
      "砸开"
    );
  });

  it("groundItemActions for coconut tree and mountain tree scenery", () => {
    expect(
      groundItemActions("yezi tree", "椰子树", false, "tree").map((a) => a.command)
    ).toEqual(["look tree", "pa tree"]);
    expect(
      groundItemActions("yezi tree", "椰子树").map((a) => a.command)
    ).toEqual(["look yezi tree", "pa tree"]);
    expect(
      groundItemActions("tree", "大树", true).map((a) => a.command)
    ).toContain("pa up");
  });

  it("parseHelpDocActions extracts study/sleep/fishing", () => {
    const help = `石壁上领悟(study wall)。休息室可用(sleep)。还可(fishing)。`;
    expect(parseHelpDocActions(help).map((a) => a.command)).toEqual([
      "study wall",
      "sleep",
      "fishing",
    ]);
  });
});

describe("weaponRoomActions", () => {
  it("offers get chips for ground weapons in 兵器房", () => {
    const actions = weaponRoomActions({
      title: "兵器房",
      items: [
        { id: "mu dao", name: "木刀", kind: "item" },
        { id: "zhujian", name: "竹剑", kind: "item" },
        { id: "board", name: "告示牌", kind: "item", scenery: true },
      ],
      npcs: [
        {
          id: "pu ren",
          commandId: "pu",
          name: "黄衣仆人",
          kind: "npc",
        },
      ],
    });
    expect(actions.map((a) => a.command)).toEqual(
      expect.arrayContaining(["get mu dao", "get zhujian", "ask pu about 武器"])
    );
    expect(actions.map((a) => a.label)).toEqual(
      expect.arrayContaining(["拿起木刀", "拿起竹剑", "问仆人要武器"])
    );
  });

  it("is empty outside weapon rooms", () => {
    expect(
      weaponRoomActions({
        title: "甬道",
        items: [{ id: "mu dao", name: "木刀", kind: "item" }],
      })
    ).toEqual([]);
  });
});

describe("closedDoorActions", () => {
  it("offers open chip for closed doors using Chinese name", () => {
    expect(
      closedDoorActions([
        { dir: "enter", name: "石门", status: "closed" },
      ]).map((a) => a.command)
    ).toEqual(["open 石门"]);
    expect(labelSuggestedAction("open 石门")).toBe("打开石门");
  });

  it("offers unlock hint for locked doors", () => {
    expect(
      closedDoorActions([{ dir: "east", name: "木门", status: "locked" }])
    ).toEqual([{ command: "unlock 木门", label: "木门上着锁" }]);
  });

  it("returns empty when no doors", () => {
    expect(closedDoorActions([])).toEqual([]);
    expect(closedDoorActions(undefined)).toEqual([]);
  });

  it("infers 打开石门 when doors omitted but gate is shut", () => {
    expect(
      inferredShutDoorActions({
        title: "石门",
        desc: "面前一道厚重的石门。",
        exits: [{ dir: "south", label: "南" }],
        doors: [],
      }).map((a) => a.command)
    ).toEqual(["open 石门"]);
    expect(
      inferredShutDoorActions({
        title: "石门",
        desc: "面前一道厚重的石门。",
        exits: [{ dir: "enter", label: "进" }],
        doors: [],
      })
    ).toEqual([]);
  });
});

describe("carriageTravelActions", () => {
  it("detects carriage item", () => {
    expect(isCarriageItem("da che", "大车")).toBe(true);
    expect(isCarriageItem("stone", "鹅卵石")).toBe(false);
  });

  it("offers qu destinations when car is in a no-exit room", () => {
    const acts = carriageTravelActions({
      items: [{ id: "da che", name: "大车", kind: "item" }],
      exits: [],
    });
    expect(acts.map((a) => a.command)).toContain("qu 扬州");
    expect(acts.map((a) => a.command)).toContain("qu 少林");
    expect(labelSuggestedAction("qu 扬州")).toBe("乘车去扬州");
  });

  it("skips when room has many exits", () => {
    expect(
      carriageTravelActions({
        items: [{ id: "da che", name: "大车", kind: "item" }],
        exits: [
          { dir: "north" },
          { dir: "south" },
          { dir: "east" },
        ],
      })
    ).toEqual([]);
  });

  it("ground item sheet offers destinations instead of get", () => {
    const cmds = groundItemActions("da che", "大车").map((a) => a.command);
    expect(cmds[0]).toMatch(/^look /);
    expect(cmds).toEqual(
      expect.arrayContaining(["qu 扬州", "qu 武当", "qu 少林"])
    );
    expect(groundItemActions("da che", "大车").map((a) => a.label)).not.toContain(
      "拿"
    );
  });
});

describe("parseLearnOfferActions", () => {
  const disciple = { id: "lanyi dizi", name: "蓝衣弟子", kind: "npc" as const };

  it("parses 蓝衣弟子 greeting into learn chips", () => {
    const text =
      "蓝衣弟子说道：欢迎这位少侠，你可向我学掌法(strike)，内功(force)，\n" +
      "招架(parry)及轻功(dodge)。";
    // 用 lanyi 而非共享别名 dizi，避免与同房其它弟子冲突
    expect(
      parseLearnOfferActions(text, [disciple]).map((a) => a.command)
    ).toEqual([
      "learn lanyi strike",
      "learn lanyi force",
      "learn lanyi parry",
      "learn lanyi dodge",
    ]);
    expect(labelSuggestedAction("learn lanyi strike", [disciple])).toBe(
      "向蓝衣弟子学掌法"
    );
  });

  it("parses quanzhou-style teacher greetings", () => {
    const text =
      "龙泉说道：欢迎这位少侠，你可向我学刀法(blade)，爪法(claw)，内功(force)，招架(parry)及轻功(dodge)。";
    expect(
      parseLearnOfferActions(text, [
        { id: "long quan", name: "龙泉", kind: "npc" },
      ]).map((a) => a.command)
    ).toEqual([
      "learn quan blade",
      "learn quan claw",
      "learn quan force",
      "learn quan parry",
      "learn quan dodge",
    ]);
  });

  it("parses explicit (xue id skill) hints", () => {
    const text = "老学士说道：你可以跟我学点读书(xue shi literate)";
    expect(
      parseLearnOfferActions(text, [
        { id: "shi", name: "老学士", kind: "npc" },
      ]).map((a) => a.command)
    ).toEqual(["learn shi literate"]);
    expect(labelSuggestedAction("learn shi literate", [
      { id: "shi", name: "老学士", kind: "npc" },
    ])).toBe("向老学士学读书识字");
  });

  it("does not treat 瀑布(fall) as a skill outside teach context", () => {
    expect(
      parseLearnOfferActions(
        "迎面是一道瀑布(fall)从十余丈的高处直挂下来。有一棵大树(tree)。",
        [disciple]
      )
    ).toEqual([]);
  });

  it("buildLearnTopicActions filters to the entity", () => {
    const hints = parseLearnOfferActions(
      "蓝衣弟子说道：你可向我学掌法(strike)，内功(force)。",
      [disciple]
    );
    expect(
      buildLearnTopicActions("lanyi dizi", "蓝衣弟子", hints).map(
        (a) => a.label
      )
    ).toEqual(["掌法", "内功"]);
    expect(labelLearnTopic("learn dizi strike")).toBe("掌法");
    expect(
      buildLearnTopicActions("yu fu", "渔夫", hints)
    ).toEqual([]);
  });

  it("keeps learn/ask for entity sheet but hides them from scene chips", () => {
    const learn = parseLearnOfferActions(
      "蓝衣弟子说道：你可向我学掌法(strike)，内功(force)。",
      [disciple]
    );
    const mixed = [
      ...learn,
      { command: "follow zhang san", label: "跟随张三" },
      { command: "ask fu about 侠客岛", label: "向渔夫打听侠客岛" },
      { command: "enter", label: "上船" },
    ];
    expect(learn.every((a) => isEntitySheetAction(a.command))).toBe(true);
    expect(isEntitySheetAction("ask fu about 侠客岛")).toBe(true);
    expect(isEntitySheetAction("follow zhang san")).toBe(false);
    expect(sceneActionChips(mixed).map((a) => a.command)).toEqual([
      "follow zhang san",
      "enter",
    ]);
  });

  it("detects in-place room layout change narratives", () => {
    expect(
      suggestsRoomLayoutChange(
        "向旁缓缓拉开，露出一条长长的甬道。"
      )
    ).toBe(true);
    expect(
      suggestsRoomLayoutChange("你推开石门，眼前出现了一条甬道。")
    ).toBe(true);
    expect(suggestsRoomLayoutChange("渔夫微笑着看着你。")).toBe(false);
    const dadongLook = `大山洞 -
    这是一个很大的山洞。
    屏风已被拉开，露出一条长长的甬道。
    这里明显的出口是 south 和 enter。
  厮仆(Si pu)`;
    expect(suggestsRoomLayoutChange(dadongLook)).toBe(false);
    expect(
      suggestsRoomLayoutChange("    屏风已被拉开，露出一条长长的甬道。")
    ).toBe(false);
    // TCP/soft-wrap fragments of the static long must not retrigger look
    expect(
      suggestsRoomLayoutChange("拉开，露出一条长长的甬道。")
    ).toBe(false);
    expect(suggestsRoomLayoutChange("露出一条长长的甬道。")).toBe(false);
    expect(isStaticPassageLine("    屏风已被拉开，露出一条长长的甬道。")).toBe(
      true
    );
    expect(isStaticPassageLine("拉开，露出一条长长的甬道。")).toBe(true);
    expect(isStaticPassageLine("露出一条长长的甬道。")).toBe(true);
    expect(isStaticPassageLine("向旁缓缓拉开，露出一条长长的甬道。")).toBe(
      false
    );
    expect(
      suggestsRoomLayoutChange("向旁缓缓拉开，露出一条长长的甬道。")
    ).toBe(true);
  });

  it("merges skills panel of 师父 into learn topics without 见闻 hints", () => {
    const panel = `张三丰目前所学过的技能：（共3项技能）

基本内功 (force) - 深不可测  200/  0
太极剑 (taiji-jian) - 出神入化  180/ 12
轻功 (dodge) - 登峰造极  150/  3
`;
    expect(
      parseSkillsPanelLearnActions(panel, "zhang").map((a) => a.command)
    ).toEqual([
      "learn zhang force",
      "learn zhang taiji-jian",
      "learn zhang dodge",
    ]);
    expect(
      buildLearnTopicActions("zhang sanfeng", "张三丰", [], panel).map(
        (a) => a.label
      )
    ).toEqual(["基本内功", "太极剑", "轻功"]);
  });

  it("skills refuse yields no learn topics", () => {
    expect(
      parseSkillsPanelLearnActions("你要察看谁的技能？\n", "fu")
    ).toEqual([]);
    expect(
      buildLearnTopicActions("yu fu", "渔夫", [], "你要察看谁的技能？")
    ).toEqual([]);
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
    expect(v.effJing).toBe(150);
    expect(v.maxJing).toBeUndefined();
    expect(v.qi).toBe(80);
    expect(v.effQi).toBe(100);
    expect(v.maxQi).toBeUndefined();
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

  it("vitalCap prefers eff over max for qi/jing bars", () => {
    expect(vitalCap({ qi: 80, maxQi: 100, effQi: 90 }, "qi")).toBe(90);
    expect(vitalCap({ qi: 80, maxQi: 100 }, "qi")).toBe(100);
    expect(vitalCap({ jing: 10, maxJing: 50, effJing: 40 }, "jing")).toBe(40);
  });

  it("formatVitalMeter shows innate max when wounded", () => {
    expect(formatVitalMeter(80, 90, 100)).toBe("80/90（先天 100）");
    expect(formatVitalMeter(80, 100, 100)).toBe("80/100");
    expect(formatVitalMeter(80, 100)).toBe("80/100");
    expect(formatVitalMeter(undefined, undefined)).toBe("—/—");
  });

  it("parseVendorGoods extracts buy commands from dealer list", () => {
    const text = `                        烤鸡腿(Jitui)：五十文铜板
                           包子(Baozi)：三十文铜板
                       牛皮酒袋(Jiudai)：五十文铜板
你可以向店小二购买下列武器：
`;
    expect(parseVendorGoods(text)).toEqual([
      {
        name: "烤鸡腿",
        id: "jitui",
        price: "五十文铜板",
        command: "buy jitui",
      },
      {
        name: "包子",
        id: "baozi",
        price: "三十文铜板",
        command: "buy baozi",
      },
      {
        name: "牛皮酒袋",
        id: "jiudai",
        price: "五十文铜板",
        command: "buy jiudai",
      },
    ]);
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

  it("parses real skills.c boxed rows with id and mastery", () => {
    const text = `你目前所学过的技能：（共2项技能）

┌三项基本功夫    ──────────────────────┐
│□基本轻功 (dodge)                    - 初学乍练     5/    12│
│  基本内功 (force)                   - 粗通皮毛    40/   100│
└────────────────────────────────┘
`;
    const rows = parseSkills(text);
    expect(rows).toHaveLength(2);
    expect(rows[0]).toMatchObject({
      id: "dodge",
      name: "基本轻功",
      level: 5,
      learned: 12,
      equipped: true,
      category: "dodge",
      mastery: 1,
      masteryLabel: "初学乍练",
    });
    expect(rows[1]).toMatchObject({
      id: "force",
      name: "基本内功",
      level: 40,
      learned: 100,
      equipped: false,
      category: "force",
      mastery: 2,
      masteryLabel: "粗通皮毛",
    });
    // next level costs (5+1)^2 = 36
    expect(rows[0].learned).toBeLessThan((rows[0].level + 1) ** 2);
  });
});

describe("enable / jifa helpers", () => {
  it("treats basic skills as non-enableable", () => {
    expect(isBasicSkillId("force")).toBe(true);
    expect(isBasicSkillId("dodge")).toBe(true);
    expect(isBasicSkillId("taiji-jian")).toBe(false);
    expect(suggestEnableSlots("force")).toEqual([]);
    expect(suggestEnableSlots("taiji-jian")).toEqual(
      expect.arrayContaining(["sword", "parry"])
    );
    expect(suggestEnableSlots("taiji-shengong")).toEqual(["force"]);
  });

  it("maps 太玄功 / 五狱掌法 to precise slots without bogus defaults", () => {
    expect(suggestEnableSlots("taixuan-gong")).toEqual(["force"]);
    expect(suggestEnableSlots("wuyu-zhangfa")).toEqual(["strike", "parry"]);
    // 未知武功勿再默认甩出 招架/内功/轻功/拳脚
    expect(suggestEnableSlots("mystery-unknown-art")).toEqual([]);
  });

  it("prefers server valid_enable slots over heuristics", () => {
    expect(
      resolveEnableSlots("taixuan-gong", {
        "taixuan-gong": ["force"],
      })
    ).toEqual(["force"]);
    expect(
      resolveEnableSlots("wuyu-zhangfa", {
        "wuyu-zhangfa": ["parry", "strike"],
      })
    ).toEqual(["strike", "parry"]);
    expect(
      resolveEnableSlots("taixuan-gong", undefined, ["force"])
    ).toEqual(["force"]);
  });

  it("applies enable slot map onto skill rows", () => {
    const rows = applySkillEnableSlots(
      [
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
          level: 30,
          learned: 0,
          category: "misc",
          mastery: 2,
        },
      ],
      {
        "taixuan-gong": ["force"],
        "wuyu-zhangfa": ["strike", "parry"],
      }
    );
    expect(rows[0].enableSlots).toEqual(["force"]);
    expect(rows[1].enableSlots).toEqual(["strike", "parry"]);
  });

  it("lists force exert entry only after mapping force", () => {
    expect(FORCE_EXERT_ACTIONS.map((a) => a.label)).toEqual([
      "回气",
      "回精",
      "回精力",
      "疗伤",
    ]);
    expect(FORCE_EXERT_ACTIONS.every((a) => a.command.startsWith("yun "))).toBe(
      true
    );
    expect(hasMappedForce({})).toBe(false);
    expect(hasMappedForce({ force: { skill: "无", level: 0 } })).toBe(false);
    expect(
      hasMappedForce({
        force: { skill: "taixuan-gong", name: "太玄功", level: 30 },
      })
    ).toBe(true);
    expect(
      hasLearnedForceSkill([
        {
          id: "taixuan-gong",
          name: "太玄功",
          level: 30,
          learned: 0,
          category: "force",
          mastery: 2,
          enableSlots: ["force"],
        },
      ])
    ).toBe(true);
    expect(
      hasLearnedForceSkill([
        {
          id: "wuyu-zhangfa",
          name: "五狱掌法",
          level: 20,
          learned: 0,
          category: "misc",
          mastery: 1,
          enableSlots: ["strike", "parry"],
        },
      ])
    ).toBe(false);
  });

  it("parses enable panel and reconciles chinese names to ids", () => {
    const text = `以下是你目前使用中的特殊技能。
  内功 (force)          ： 太极神功              有效等级：180
  剑法 (sword)          ： 太极剑                有效等级：120
  轻功 (dodge)          ： 无                    有效等级： 45
`;
    const raw = parseEnableMap(text);
    expect(raw.force).toMatchObject({ name: "太极神功", level: 180 });
    expect(raw.sword).toMatchObject({ name: "太极剑", level: 120 });
    expect(raw.dodge).toBeUndefined();
    const reconciled = reconcileEnableMap(raw, [
      {
        id: "taiji-shengong",
        name: "太极神功",
        level: 180,
        learned: 0,
        category: "force",
        mastery: 5,
      },
      {
        id: "taiji-jian",
        name: "太极剑",
        level: 120,
        learned: 0,
        category: "weapon",
        mastery: 4,
      },
    ]);
    expect(reconciled.force.skill).toBe("taiji-shengong");
    expect(reconciled.sword.skill).toBe("taiji-jian");
  });

  it("empty enable notify yields empty map", () => {
    expect(parseEnableMap("你现在没有使用任何特殊技能。\n")).toEqual({});
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

  it("parses real inventory.c shorts with english ids", () => {
    const text = `你身上带著下列这些东西(负重 3%)：
□布衣(cloth)
  米饭(rice)
√毒针(needle)
  长剑(changjian)
`;
    const items = parseInventory(text);
    expect(items).toHaveLength(4);
    expect(items[0]).toMatchObject({
      id: "cloth",
      name: "布衣",
      equipped: true,
      equipKind: "armor",
    });
    expect(items[1]).toMatchObject({
      id: "rice",
      name: "米饭",
      equipped: false,
      equipKind: "food",
    });
    expect(items[2]).toMatchObject({
      id: "needle",
      name: "毒针",
      equipped: false,
      embedded: true,
    });
    expect(items[3]).toMatchObject({
      id: "changjian",
      name: "长剑",
      equipped: false,
      equipKind: "weapon",
    });
    expect(bagItemActions(items[0])).toEqual([
      { label: "看", command: "look cloth" },
      { label: "脱下", command: "remove cloth" },
    ]);
    expect(bagItemActions(items[3])).toEqual([
      { label: "看", command: "look changjian" },
      { label: "装备", command: "wield changjian" },
      { label: "丢下", command: "drop changjian" },
    ]);
    expect(bagItemActions(items[1])).toEqual([
      { label: "看", command: "look rice" },
      { label: "吃", command: "eat rice" },
      { label: "丢下", command: "drop rice" },
    ]);
    expect(bagItemActions(items[2])).toEqual([]);
  });

  it("does not offer reading for non-readable quest tokens", () => {
    const [reward, punishment] = parseInventory(`  赏善令(shangshan ling)
  罚恶令(fae ling)`);
    expect(reward.actions).not.toContainEqual({
      label: "阅读",
      command: "read shangshan ling",
      kind: "read",
    });
    expect(punishment.actions).not.toContainEqual({
      label: "阅读",
      command: "read fae ling",
      kind: "read",
    });
  });

  it("classifies wear vs wield by id and name", () => {
    expect(classifyInvEquip("cloth", "布衣")).toBe("armor");
    expect(classifyInvEquip("gangdao", "钢刀")).toBe("weapon");
    expect(classifyInvEquip("rice", "米饭")).toBe("food");
    expect(classifyInvEquip("zhou", "腊八粥")).toBe("food");
    expect(classifyInvEquip("laba zhou", "腊八粥")).toBe("food");
    expect(classifyInvEquip("wan", "粗磁大碗")).toBe("drink");
    expect(classifyInvEquip("hulu", "葫芦")).toBe("drink");
    expect(classifyInvEquip("sanhuang-wan", "三黄丸")).toBe("drug");
  });

  it("optimistically swaps same-slot armor and primary weapon", () => {
    const inv = [
      {
        id: "cloth",
        name: "布衣",
        type: "cloth",
        equipped: true,
        equipKind: "armor" as const,
      },
      {
        id: "yuyi",
        name: "雨衣",
        type: "cloth",
        equipped: false,
        equipKind: "armor" as const,
      },
      {
        id: "changjian",
        name: "长剑",
        type: "sword",
        equipped: true,
        equipKind: "weapon" as const,
      },
      {
        id: "gangdao",
        name: "钢刀",
        type: "blade",
        equipped: false,
        equipKind: "weapon" as const,
      },
    ];
    const afterWear = applyEquipOptimistic(inv, "wear", "yuyi");
    expect(afterWear.find((i) => i.id === "yuyi")?.equipped).toBe(true);
    expect(afterWear.find((i) => i.id === "cloth")?.equipped).toBe(false);
    expect(afterWear.find((i) => i.id === "changjian")?.equipped).toBe(true);

    const afterWield = applyEquipOptimistic(inv, "wield", "gangdao");
    expect(afterWield.find((i) => i.id === "gangdao")?.equipped).toBe(true);
    expect(afterWield.find((i) => i.id === "changjian")?.equipped).toBe(false);
    expect(afterWield.find((i) => i.id === "cloth")?.equipped).toBe(true);
  });

  it("offers look/eat for 腊八粥 and look/drink for tea bowl", () => {
    expect(
      bagItemActions({
        id: "zhou",
        name: "腊八粥",
        type: "zhou",
        equipKind: "food",
      })
    ).toEqual([
      { label: "看", command: "look zhou" },
      { label: "吃", command: "eat zhou" },
      { label: "丢下", command: "drop zhou" },
    ]);
    expect(
      bagItemActions({
        id: "wan",
        name: "粗磁大碗",
        type: "wan",
        equipKind: "drink",
      })
    ).toEqual([
      { label: "看", command: "look wan" },
      { label: "喝", command: "drink wan" },
      { label: "丢下", command: "drop wan" },
    ]);
    expect(
      groundItemActions("zhou", "腊八粥").map((a) => a.label)
    ).toEqual(["看", "拿", "吃"]);
  });

  it("uses full multi-word food id or pancake commandId (not bare bing)", () => {
    expect(invCommandTarget("jian bing", "煎饼")).toBe("jian bing");
    expect(invCommandTarget("jian bing", "煎饼", "pancake")).toBe("pancake");
    expect(
      groundItemActions("jian bing", "煎饼", false, "pancake").map((a) => a.command)
    ).toEqual(["look pancake", "get pancake", "eat pancake"]);
    expect(
      groundItemActions("chun juan", "春卷").map((a) => a.label)
    ).toEqual(["看", "拿", "吃"]);
    expect(
      groundItemActions("shao mai", "烧卖").map((a) => a.command)
    ).toEqual(["look shao mai", "get shao mai", "eat shao mai"]);
  });

  it("ignores help inventory prose", () => {
    const help = `指令格式: inventory

可列出你(你)目前身上所携带的所有物品。

注 : 此指令可以 " i " 代替。
`;
    expect(parseInventory(help)).toEqual([]);
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

describe("reflowSoftWrappedText", () => {
  it("joins help-file terminal wraps into continuous paragraphs", () => {
    const raw = `【出生】

    新玩家首次连线进入侠客行，会发现自己置身于一个与世隔绝的
什么小岛--侠客岛上，岛上住着龙，木两位岛主和若干弟子，以及从
中原武林请来的各门个派的高手。

chat  公共聊天频道，说的话全侠客行可以看到。
例子：         chat hi`;
    const out = reflowSoftWrappedText(raw);
    expect(out).toContain("与世隔绝的什么小岛");
    expect(out).toContain("以及从中原武林请来");
    expect(out).not.toMatch(/与世隔绝的\n什么小岛/);
    expect(out).toContain("【出生】");
    expect(out).toMatch(/可以看到。\n例子：/);
  });
});
