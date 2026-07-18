import type {
  AssistConfig,
  DoorInfo,
  InvItem,
  MudEvent,
  RoomState,
  SkillRow,
  Vitals,
} from "./types";
import {
  DIR_MAP,
  mergeRoomItems,
  parseSceneryFromDesc,
  roomAllowsSleep,
} from "./parser";

export const PROTOCOL_VERSION = 1;

function parseDoors(
  raw: unknown,
  fallback: DoorInfo[] | undefined
): DoorInfo[] | undefined {
  if (!Array.isArray(raw)) return fallback;
  const doors: DoorInfo[] = [];
  for (const d of raw) {
    if (!d || typeof d !== "object") continue;
    const dir = typeof (d as { dir?: unknown }).dir === "string"
      ? (d as { dir: string }).dir
      : "";
    if (!dir) continue;
    const name =
      typeof (d as { name?: unknown }).name === "string" &&
      (d as { name: string }).name
        ? (d as { name: string }).name
        : "门";
    const statusRaw = (d as { status?: unknown }).status;
    const status: DoorInfo["status"] =
      statusRaw === "locked" ? "locked" : "closed";
    doors.push({ dir, name, status });
  }
  return doors;
}

export function applyEvent(
  event: MudEvent,
  prev: {
    room: RoomState;
    vitals: Vitals;
    skills: SkillRow[];
    inventory: InvItem[];
    lookText: string;
    lookHtml?: string;
    scoreText: string;
    scoreHtml?: string;
    assistActive: boolean;
    assistStatus: string;
    combatLog: string[];
    trainLog: string[];
  }
) {
  const next = { ...prev };

  switch (event.type) {
    case "room.update": {
      const rawExits = event.exits as { dir: string; name: string }[] | undefined;
      const title = (event.title as string) || prev.room.title;
      const desc = (event.long as string) || prev.room.desc;
      const baseItems = Array.isArray(event.items)
        ? (event.items as RoomState["items"])
        : prev.room.items;
      const canSleepFlag =
        typeof event.canSleep === "boolean"
          ? event.canSleep
          : event.canSleep === 1 || event.canSleep === "1";
      next.room = {
        title,
        desc,
        area:
          typeof event.area === "string" && event.area
            ? event.area
            : prev.room.area,
        path:
          typeof event.path === "string"
            ? event.path || undefined
            : prev.room.path,
        canSleep: canSleepFlag || roomAllowsSleep({ title, desc }),
        // Empty exits must replace prior room exits (no-exit rooms like 挂名处)
        exits: Array.isArray(rawExits)
          ? rawExits.map((e) => ({
              dir: e.dir,
              label: DIR_MAP[e.dir] || e.dir,
              name: e.name,
            }))
          : prev.room.exits,
        // Empty doors array clears prior shut-door chips after open
        doors: parseDoors(event.doors, prev.room.doors),
        // Empty arrays must replace prior lists (e.g. last ground item picked up)
        npcs: Array.isArray(event.npcs)
          ? (event.npcs as RoomState["npcs"])
          : prev.room.npcs,
        items: mergeRoomItems(baseItems, parseSceneryFromDesc(desc || "")),
      };
      break;
    }
    case "player.vitals":
      next.vitals = { ...prev.vitals, ...(event.vitals as Vitals) };
      break;
    case "player.look":
      next.lookText = (event.text as string) || prev.lookText;
      if (typeof event.html === "string") next.lookHtml = event.html;
      break;
    case "player.score":
      next.scoreText = (event.text as string) || prev.scoreText;
      if (typeof event.html === "string") next.scoreHtml = event.html;
      break;
    case "skills.update":
      next.skills = (event.skills as SkillRow[]) || prev.skills;
      break;
    case "inv.update":
      next.inventory = (event.items as InvItem[]) || prev.inventory;
      break;
    case "combat.event":
      if (event.text) {
        next.combatLog = [...prev.combatLog.slice(-40), event.text as string];
      }
      break;
    case "train.event":
      if (event.text) {
        next.trainLog = [...prev.trainLog.slice(-40), event.text as string];
      }
      break;
    case "assist.status":
      next.assistActive = !!event.active;
      next.assistStatus = (event.message as string) || "";
      break;
    case "assist.config":
      next.assistActive = !!event.active;
      break;
    case "error":
      next.combatLog = [...prev.combatLog, (event.message as string) || "发生错误"];
      break;
  }

  return next;
}

export function buildAssistPayload(config: AssistConfig) {
  return {
    v: PROTOCOL_VERSION,
    type: "assist.start",
    config,
  };
}
