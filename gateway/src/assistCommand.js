const TOKEN = /^[a-z][a-z0-9_-]*$/i;

export function buildAssistCommand(config = {}) {
  if (config.action === "stop") return "webassist stop";
  if (config.mode === "combat") {
    const pct = Math.min(80, Math.max(5, Number(config.lowHpPct) || 30));
    const action = ["warn", "flee", "stop"].includes(config.lowHpAction)
      ? config.lowHpAction
      : "flee";
    return `webassist combat ${pct} ${action}`;
  }
  if (config.mode === "learn") {
    const teacher = String(config.teacher || "").toLowerCase();
    const skill = String(config.skill || "").toLowerCase();
    if (!TOKEN.test(teacher) || !TOKEN.test(skill)) return null;
    const stopWhen = config.stopWhen === "potential" ? "potential" : "count";
    const count = Math.min(999, Math.max(1, Number(config.stopCount) || 1));
    return `webassist learn ${teacher} ${skill} ${stopWhen} ${count} ${
      config.stopOnCombat === false ? 0 : 1
    }`;
  }
  const mode = ["dazuo", "tuna", "lian"].includes(config.mode)
    ? config.mode
    : "dazuo";
  const stopWhen = ["full", "count", "potential"].includes(config.stopWhen)
    ? config.stopWhen
    : "full";
  const count = Math.max(0, Number(config.stopCount) || 0);
  if (mode === "lian") {
    const skill = String(config.skill || "").toLowerCase();
    if (!TOKEN.test(skill)) return null;
    return `webassist train lian count ${Math.max(1, count || 1)} ${
      config.stopOnCombat ? 1 : 0
    } ${skill}`;
  }
  return `webassist train ${mode} ${stopWhen} ${count} ${
    config.stopOnCombat ? 1 : 0
  }`;
}
