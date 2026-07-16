#!/usr/bin/env node
/**
 * stop hook: when web/app or gateway files changed, run unit tests only.
 * Playwright e2e 由 Agent 按改动用 -Grep 定点跑；全量需显式 -Full。
 * Outputs followup_message on failure for agent retry loop.
 */
import { execSync, spawnSync } from "node:child_process";
import { createInterface } from "node:readline";
import { fileURLToPath } from "node:url";
import path from "node:path";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "../..");
const MAX_LOOP = 3;

const TEST_PATH_RE =
  /^(web\/app\/|web\\app\\|gateway\/|gateway\\|\.cursor\/hooks\/|\.cursor\/skills\/xkx-testing\/)/;

async function readStdinJson() {
  const rl = createInterface({ input: process.stdin });
  let data = "";
  for await (const chunk of rl) data += chunk;
  if (!data.trim()) return {};
  try {
    return JSON.parse(data);
  } catch {
    return {};
  }
}

function emit(obj) {
  process.stdout.write(`${JSON.stringify(obj)}\n`);
}

function git(args) {
  try {
    return execSync(`git ${args}`, { cwd: ROOT, encoding: "utf8" }).trim();
  } catch {
    return "";
  }
}

function touchesTestPaths() {
  const status = git("status --porcelain");
  if (!status) return false;
  for (const line of status.split("\n")) {
    if (!line.trim()) continue;
    const filePart = line.slice(3).trim();
    const paths = filePart.includes(" -> ")
      ? filePart.split(" -> ").map((p) => p.trim())
      : [filePart.split(/\s+/).pop() ?? filePart];
    for (const p of paths) {
      const norm = p.replace(/\\/g, "/");
      if (TEST_PATH_RE.test(norm)) return true;
    }
  }
  return false;
}

function runPowerShell(scriptRel) {
  const script = path.join(ROOT, scriptRel);
  return spawnSync(
    "powershell",
    ["-NoProfile", "-ExecutionPolicy", "Bypass", "-File", script],
    { cwd: ROOT, encoding: "utf8", timeout: 280_000 }
  );
}

const input = await readStdinJson();
const status = input.status ?? "completed";
const loopCount = input.loop_count ?? 0;

if (status === "aborted" || status === "error") {
  emit({});
  process.exit(0);
}

if (loopCount >= MAX_LOOP) {
  emit({});
  process.exit(0);
}

if (!touchesTestPaths()) {
  emit({});
  process.exit(0);
}

const unit = runPowerShell("scripts/run-unit-tests.ps1");
if (unit.status !== 0) {
  const detail = [unit.stdout, unit.stderr].filter(Boolean).join("\n").slice(-4000);
  emit({
    followup_message: `[xkx-testing] 单元测试失败。请先阅读 .cursor/skills/xkx-testing/SKILL.md，根据输出修复代码或测试，然后重新运行 scripts/run-unit-tests.ps1。\n\n${detail}`,
  });
  process.exit(0);
}

emit({});
process.exit(0);
