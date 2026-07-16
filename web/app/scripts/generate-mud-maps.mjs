#!/usr/bin/env node
/**
 * Generate web/app/src/data/mudMaps.generated.ts from doc/help/map_* files.
 * Run from repo root: node web/app/scripts/generate-mud-maps.mjs
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "../../..");
const helpDir = path.join(root, "doc/help");
const outFile = path.join(root, "web/app/src/data/mudMaps.generated.ts");

const ANSI_RE =
  /\x1b(?:\[[0-9;?]*[ -/]*[@-~]|\][^\x07\x1b]*(?:\x07|\x1b\\)?)/g;

function stripAnsi(text) {
  return text.replace(ANSI_RE, "").replace(/\x1b\[2J|\x1b\[H|\x1b\[K/g, "");
}

const maps = {};
const labels = {};

for (const name of fs.readdirSync(helpDir)) {
  if (!name.startsWith("map")) continue;
  if (name.includes(".")) continue; // skip map.beijing, map_mingjiao.c
  const full = path.join(helpDir, name);
  if (!fs.statSync(full).isFile()) continue;

  let key;
  if (name === "map") continue; // catalog only
  if (name === "map_all") key = "all";
  else if (name.startsWith("map_")) key = name.slice(4);
  else continue;

  const raw = fs.readFileSync(full, "utf8");
  const text = stripAnsi(raw).replace(/\r\n/g, "\n").replace(/\r/g, "\n");
  maps[key] = text.trimEnd() + "\n";

  // First non-empty line often has a title; keep a short display label
  const first = text
    .split("\n")
    .map((l) => l.trim())
    .find((l) => l.length > 0);
  labels[key] = first
    ? first.replace(/[【】\[\]「」]/g, "").slice(0, 24)
    : key;
}

// Human-friendly overrides for common areas
Object.assign(labels, {
  all: "侠客行第一阶段总图",
  xiakedao: "侠客岛",
  yangzhou: "扬州城",
  hangzhou: "杭州",
  beijing: "京师",
  shaolin: "少林寺",
  wudang: "武当山",
  emei: "峨嵋山",
  city: "扬州城",
});

// city domain often uses outdoors "city" → yangzhou map
const aliases = {
  city: "yangzhou",
  em: "emei",
  kunlun: "mingjiao",
};

const keys = Object.keys(maps).sort();
const body = keys
  .map((k) => `  ${JSON.stringify(k)}: ${JSON.stringify(maps[k])},`)
  .join("\n");
const labelBody = keys
  .map((k) => `  ${JSON.stringify(k)}: ${JSON.stringify(labels[k] || k)},`)
  .join("\n");
const aliasBody = Object.entries(aliases)
  .map(([a, b]) => `  ${JSON.stringify(a)}: ${JSON.stringify(b)},`)
  .join("\n");

const out = `/* eslint-disable */
/** Auto-generated from doc/help/map_* — run: node web/app/scripts/generate-mud-maps.mjs */
export const MUD_MAPS: Record<string, string> = {
${body}
};

export const MUD_MAP_LABELS: Record<string, string> = {
${labelBody}
};

/** outdoors / domain aliases → map key */
export const MUD_MAP_ALIASES: Record<string, string> = {
${aliasBody}
};
`;

fs.mkdirSync(path.dirname(outFile), { recursive: true });
fs.writeFileSync(outFile, out, "utf8");
console.log(`Wrote ${keys.length} maps → ${path.relative(root, outFile)}`);
