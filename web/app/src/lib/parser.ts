import type { ExitInfo, InvItem, RoomState, SkillRow, Vitals } from "./types";

const DIR_MAP: Record<string, string> = {
  north: "北",
  south: "南",
  east: "东",
  west: "西",
  northeast: "东北",
  northwest: "西北",
  southeast: "东南",
  southwest: "西南",
  up: "上",
  down: "下",
  enter: "进",
  out: "出",
};

const PAD_SLOTS: (string | null)[][] = [
  ["northwest", "north", "northeast"],
  ["west", null, "east"],
  ["southwest", "south", "southeast"],
];

export function parseExits(text: string): ExitInfo[] {
  const exits: ExitInfo[] = [];
  const m = text.match(/明显的出口[是：:]\s*(.+)/);
  if (!m) return exits;
  const parts = m[1].split(/[,，、]/);
  for (const p of parts) {
    const mm = p.trim().match(/(\S+)\s+(\S+)/);
    if (mm) {
      exits.push({
        dir: mm[1],
        label: DIR_MAP[mm[1]] || mm[1],
        name: mm[2],
      });
    }
  }
  return exits;
}

export function parseRoom(text: string): Partial<RoomState> {
  const lines = text.split("\n").map((l) => l.trim()).filter(Boolean);
  const room: Partial<RoomState> = {
    exits: [],
    npcs: [],
    items: [],
  };

  if (lines.length) {
    room.title = lines[0].replace(/[\[\]【】]/g, "");
    const descLines: string[] = [];
    for (let i = 1; i < lines.length; i++) {
      if (/明显的出口/.test(lines[i])) break;
      if (/这里(?:有|摆着|放着)/.test(lines[i])) break;
      descLines.push(lines[i]);
    }
    if (descLines.length) room.desc = descLines.join("\n");
  }

  room.exits = parseExits(text);

  const here = text.match(/这里(?:有|摆着|放着)([^。\n]+)/);
  if (here) {
    const names = here[1].split(/[、和,，]/);
    for (const n of names) {
      const name = n.trim();
      if (!name) continue;
      if (/店小二|掌柜|老板|行人|乞丐|士兵|官兵/.test(name)) {
        room.npcs!.push({ id: name, name, kind: "npc" });
      } else {
        room.items!.push({ id: name, name, kind: "item" });
      }
    }
  }

  return room;
}

export function parseHp(text: string): Vitals {
  const v: Vitals = {};
  const jing = text.match(/精[：:]\s*(\d+)\/\s*(\d+)/);
  if (jing) {
    v.jing = +jing[1];
    v.effJing = +jing[1];
    v.maxJing = +jing[2];
  }
  const qi = text.match(/气[：:]\s*(\d+)\/\s*(\d+)/);
  if (qi) {
    v.qi = +qi[1];
    v.effQi = +qi[1];
    v.maxQi = +qi[2];
  }
  const jingli = text.match(/精力[：:]\s*(\d+)\s*\/\s*(\d+)/);
  if (jingli) {
    v.jingli = +jingli[1];
    v.maxJingli = +jingli[2];
  }
  const neili = text.match(/内力[：:]\s*(\d+)\s*\/\s*(\d+)/);
  if (neili) {
    v.neili = +neili[1];
    v.maxNeili = +neili[2];
  }
  const food = text.match(/食物[：:]\s*(\d+)\/\s*(\d+)/);
  if (food) {
    v.food = +food[1];
    v.maxFood = +food[2];
  }
  const water = text.match(/饮水[：:]\s*(\d+)\/\s*(\d+)/);
  if (water) {
    v.water = +water[1];
    v.maxWater = +water[2];
  }
  const pot = text.match(/潜能[：:]\s*(\d+)\s*\/\s*(\d+)/);
  if (pot) {
    v.potential = +pot[1];
    v.maxPotential = +pot[2];
  }
  const exp = text.match(/经验[：:]\s*(\d+)/);
  if (exp) v.exp = +exp[1];
  return v;
}

export function parseSkills(text: string): SkillRow[] {
  const rows: SkillRow[] = [];
  const lines = text.split("\n");
  for (const line of lines) {
    const m = line.match(/^([□\s]*)([\u4e00-\u9fff]+)\s+[-─]+\s*(\d+)/);
    if (m) {
      rows.push({
        id: m[2],
        name: m[2],
        level: +m[3],
        learned: 0,
        category: "misc",
        mastery: 1,
        equipped: m[1].includes("□"),
      });
    }
  }
  return rows;
}

export function parseInventory(text: string): InvItem[] {
  const items: InvItem[] = [];
  const lines = text.split("\n");
  for (const line of lines) {
    const m = line.match(/^([□\s]*)(.+?)（(.+?)）/);
    if (m) {
      const type = m[3];
      items.push({
        id: m[2],
        name: m[2],
        type,
        equipped: m[1].includes("□"),
      });
    }
  }
  return items;
}

export function isCombatLine(text: string): boolean {
  return /(?:攻击|闪避|招架|受伤|气血|致命|死亡|停手|逃跑|出招|一招)/.test(text);
}

export function isTrainLine(text: string): boolean {
  return /(?:打坐|吐纳|练功|内力|潜能|精力|缓缓|盘膝|调息)/.test(text);
}

export { PAD_SLOTS, DIR_MAP };
