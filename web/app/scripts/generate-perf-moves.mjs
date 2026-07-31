#!/usr/bin/env node
/**
 * Generate web/app/src/lib/perfMoves.generated.ts from kungfu/skill/<id>/ action files.
 * Run from repo root: node web/app/scripts/generate-perf-moves.mjs
 *
 * Only skills listed below are emitted — the combat window shows 绝招 buttons
 * for the player's 已激发/已准备 attack skills. 内功/轻功/招架 don't get
 * perform buttons (their action dirs are exert helpers, not 绝招).
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "../../..");
const skillDir = path.join(root, "kungfu/skill");
const outFile = path.join(root, "web/app/src/lib/perfMoves.generated.ts");

/** skill id → 中文名（优先文件头注释，缺失或错误时以此兜底） */
const SKILL_NAMES = {
  "taiji-jian": "太极剑",
  "taiji-quan": "太极拳",
  "dagou-bang": "打狗棒法",
  "dugu-jiujian": "独孤九剑",
  "huashan-jianfa": "华山剑法",
  "quanzhen-jian": "全真剑法",
  "yunu-jianfa": "玉女剑法",
  "pixie-jian": "辟邪剑法",
  "liumai-shenjian": "六脉神剑",
  "xianglong-zhang": "降龙十八掌",
  "emei-jian": "峨眉剑法",
  "damo-jian": "达摩剑",
  "duanjia-jian": "段家剑法",
  "luoying-shenjian": "落英神剑",
  "liangyi-jian": "两仪剑法",
  "tianyu-qijian": "天羽奇剑",
  "xueshan-jian": "雪山剑法",
  "yuxiao-jian": "玉箫剑法",
  "huifeng-jian": "回风拂柳剑",
  "liuhe-dao": "六合刀",
  "huoyan-dao": "火焰刀",
  "liangyi-dao": "两仪刀法",
  "ruyi-dao": "如意刀法",
  "xiuluo-dao": "修罗刀法",
  "xue-dao": "血刀刀法",
  "yanxing-dao": "雁行刀法",
  "banruo-zhang": "般若掌",
  "fengmo-zhang": "疯魔杖法",
  "hunyuan-zhang": "混元掌",
  "jinding-zhang": "金顶绵掌",
  "jingang-quan": "金刚拳",
  "jiuyin-zhao": "九阴神爪",
  "liuyang-zhang": "六阳掌",
  "longzhua-gong": "龙爪功",
  "meinu-quan": "美女拳法",
  "mian-zhang": "绵掌",
  "nianhua-zhi": "拈花指",
  "sanhua-juding": "三花聚顶掌",
  "sanyin-zhua": "三阴蜈蚣爪",
  "tanzhi-shentong": "弹指神通",
  "tianshan-zhang": "天山六阳掌",
  "xiaohun-zhang": "黯然销魂掌",
  "yiyang-zhi": "一阳指",
  "yizhi-chan": "一指禅",
  "youshen-zhang": "游身八卦掌",
  "zhemei-shou": "天山折梅手",
  "canhe-zhi": "参合指",
  "jueming-tui": "绝命腿",
  "jinshe-zhuifa": "金蛇锥法",
  "duanyun-bian": "断云鞭",
  "feifeng-bian": "飞凤鞭法",
  "feiyu-bian": "飞羽鞭法",
  "jueqing-bian": "绝情鞭法",
  "riyue-bian": "日月鞭法",
  "mo-bang": "墨家棒法",
  "zui-gun": "醉棍",
  "tianluo-diwang": "天罗地网",
  "yinsuo-jinling": "银索金铃",
  "shiba-pan": "十八盘",
  "douzhuan-xingyi": "斗转星移",
  "longxiang-banruo": "龙象般若功",
};

/** 动作文件里明显不是 perform 绝招的辅助文件（exert/内部实现），跳过 */
const SKIP_FILES = /(?:\.(?:h|txt|bak|backup|disabled|orig))$|(?:\.|_)(?:old|backup)\.c$|pixie_superskill/;

/**
 * 动作中文名手工补全表（脚本从注释提取不到/提取错误的）。
 * 来源：动作文件 notify_fail 提示与头注释，均已核对真实文本。
 */
const ACTION_NAMES = {
  "banruo-zhang": { san: "一拍两散" },
  "canhe-zhi": { canshang: "动静如参商" },
  "dagou-bang": {
    dagou: "打狗阵法",
    duo: "獒口夺杖",
    feng: "封字诀",
    sansha: "三记杀招",
    zhuan: "转字诀",
  },
  "damo-jian": { weituo: "韦陀伏魔剑" },
  "douzhuan-xingyi": { huxin: "护心功" },
  "duanjia-jian": { ailao: "哀牢山剑意", yiyang: "一阳指力" },
  "duanyun-bian": { duanyun: "断云鞭", riyue: "日月无光" },
  "feifeng-bian": { jiutian: "凤舞九天" },
  "fengmo-zhang": { feizhang: "疯魔飞杖", fengmo: "疯魔飞杖" },
  "huashan-jianfa": { feilong: "天外飞龙", jianzhang: "剑掌五连环" },
  "huifeng-jian": { mie: "灭剑" },
  "hunyuan-zhang": { leidong: "雷动九天", wuji: "混元无极" },
  "huoyan-dao": { fen: "焚" },
  "jinding-zhang": { piaoxue: "飘雪穿云掌", puzhao: "佛光普照" },
  "jingang-quan": { jingang: "金刚神通" },
  "jinshe-zhuifa": { huayu: "漫天花雨", tuwu: "金蛇吐雾" },
  "jiuyin-zhao": { shenzhua: "九阴神爪" },
  "jueming-tui": { lianhuan: "连环腿" },
  "jueqing-bian": { sanwu: "三无三不手" },
  "liangyi-dao": { hebi: "双刀合璧", sanshen: "华岳三神峰" },
  "liangyi-jian": { xunlei: "迅雷剑" },
  "liuhe-dao": { cross: "十字砍", lianhuan: "连环诀", xiaoyao: "逍遥幻影" },
  "liumai-shenjian": {
    shangyang: "商阳剑",
    shaoshang: "少商剑",
    shaoze: "少泽剑",
    zhongchong: "中冲剑",
  },
  "liuyang-zhang": { qufu: "解生死符", zhongfu: "种生死符" },
  "longxiang-banruo": { longxiang: "龙象之力", shield: "护体神功", sing: "梵唱" },
  "luoying-shenjian": { kuangfeng: "狂风绝技" },
  "meinu-quan": { wuqing: "玉女无情", youju: "古墓幽居" },
  "nianhua-zhi": { fuxue: "拈花拂穴" },
  "pixie-jian": { guimei: "鬼魅" },
  "quanzhen-jian": {
    hubo: "双手互搏",
    jianhebi: "双剑合璧",
    lianhuan: "三连环",
    sanqing: "一剑化三清",
    tonggui: "同归剑法",
  },
  "riyue-bian": { chanrao: "天缠地绕" },
  "ruyi-dao": { lianhuan: "如意连环刀" },
  "sanhua-juding": { sanhua: "三花聚顶" },
  "sanyin-zhua": { sanyin: "三阴化功", sayin: "三阴化功", yiji: "一击" },
  "shiba-pan": { ruhe: "岱宗如何" },
  "taiji-jian": { tongshou: "天地同寿" },
  "tanzhi-shentong": { jinglei: "弹指惊雷" },
  "tianshan-zhang": { feizhang: "天山飞杖", jinxian: "大罗金仙化功杖", pifeng: "披风杖" },
  "tianyu-qijian": { san: "天女散花" },
  "xianglong-zhang": { leiting: "雷霆降龙", xianglong: "降龙一击" },
  "xiaohun-zhang": { xiaohun: "黯然销魂掌" },
  "xiuluo-dao": { xiuluo: "修罗无常斩" },
  "xue-dao": { shendao: "祭血神刀" },
  "xueshan-jian": { liuchu: "雪花六出" },
  "yanxing-dao": { huanying: "无形幻影" },
  "yinsuo-jinling": { dian: "点穴" },
  "yiyang-zhi": { qiankun: "一指乾坤" },
  "yizhi-chan": { jingmo: "惊魔一指" },
  "youshen-zhang": { huayu: "漫天花雨" },
  "yunu-jianfa": { hubo: "双手互搏", jianhebi: "双剑合璧", suxin: "玉女素心" },
  "yuxiao-jian": { jianmang: "剑芒", jianzhi: "剑指相配", jinglei: "弹指惊雷" },
  "zhemei-shou": { zhemei: "空手折梅" },
  "zui-gun": { zuida: "八仙醉打" },
};

function stripAnsi(text) {
  return text.replace(/\x1b\[[0-9;?]*[ -/]*[@-~]/g, "");
}

/** 从动作文件头注释提取中文名（逐行匹配，兼容文件名与动作名不一致的旧代码） */
function actionName(file, action) {
  const raw = fs.readFileSync(file, "utf8").split(/\r?\n/).slice(0, 8);
  for (const line of raw) {
    const clean = stripAnsi(line);
    // 优先「」引号内的招名（chan.c 太极剑法「缠」字诀 → 缠）
    const quoted = clean.match(/「([^」]+)」/);
    if (quoted) return quoted[1].replace(/字诀$/u, "").trim();
    // 次选：// xxx.c <描述>
    const desc = clean.match(new RegExp(`//\\s*${action}\\.c\\s*[:：]?\\s*(.+)$`, "u"));
    if (desc) {
      let name = desc[1]
        .replace(/^(perform|Perform)\s+/u, "")
        .replace(/[。！!，,\s]+$/u, "")
        .trim();
      if (name && name.length <= 14) return name;
    }
  }
  return "";
}

const SKILLS = Object.keys(SKILL_NAMES).sort();

const out = [];
for (const id of SKILLS) {
  const dir = path.join(skillDir, id);
  if (!fs.existsSync(dir) || !fs.statSync(dir).isDirectory()) {
    console.warn(`[skip] 无动作目录: ${id}`);
    continue;
  }
  const actions = [];
  for (const name of fs.readdirSync(dir).sort()) {
    if (!name.endsWith(".c")) continue;
    if (SKIP_FILES.test(name)) continue;
    if (name.startsWith(".")) continue;
    const action = name.slice(0, -2);
    const full = path.join(dir, name);
    if (!fs.statSync(full).isFile()) continue;
    const manual = ACTION_NAMES[id]?.[action];
    actions.push({ action, name: manual || actionName(full, action) || action });
  }
  if (!actions.length) continue;
  out.push({ id, skillName: SKILL_NAMES[id], actions });
}

const lines = [];
lines.push("/**");
lines.push(" * AUTO-GENERATED by web/app/scripts/generate-perf-moves.mjs — DO NOT EDIT.");
lines.push(" * 绝招数据来自 kungfu/skill/<id>/ 动作目录；动作名以 perform <slot>.<action> 使用。");
lines.push(" */");
lines.push("export interface PerfAction {");
lines.push("  /** perform <slot>.<action> 中的 action 段 */");
lines.push("  action: string;");
lines.push("  /** 绝招中文名 */");
lines.push("  name: string;");
lines.push("}");
lines.push("export interface PerfSkill {");
lines.push("  /** 武功中文名 */");
lines.push("  name: string;");
lines.push("  actions: PerfAction[];");
lines.push("}");
lines.push("export const PERF_MOVES: Record<string, PerfSkill> = {");
for (const { id, skillName, actions } of out) {
  lines.push(`  "${id}": { name: "${skillName}", actions: [`);
  for (const a of actions) {
    lines.push(`    { action: "${a.action}", name: "${a.name}" },`);
  }
  lines.push("  ] },");
}
lines.push("};");
lines.push("");

fs.writeFileSync(outFile, lines.join("\n"), "utf8");
console.log(
  `✔ ${outFile}\n  ${out.length} 个武功 / ${out.reduce((n, s) => n + s.actions.length, 0)} 个绝招`
);
