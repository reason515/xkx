import type { HelpArticle, HelpStage } from "./helpTypes";

export const HELP_ARTICLES: HelpArticle[] = [
  // ═══ 新手村 ═══
  {
    id: "newbie-start",
    title: "新手村入门",
    summary: "初入柳秀山庄，你需要知道的基本操作。",
    category: "newbie_village",
    stage: "newbie_village",
    body: `<p>你醒来时身处未明谷。用 quest 指令可以查看当前目标。</p>
<p><strong>移动：</strong>点击出口方向按钮移动。east（东）、west（西）、south（南）、north（北）是常用的方向。</p>
<p><strong>查看周围：</strong>进入新场景时，自动显示场景名称和描述。人物和物品列表在下方。</p>
<p><strong>与 NPC 交互：</strong>点击人物名称查看可做的动作：打听、给予、跟随、切磋等。</p>
<p><strong>查看自身状态：</strong>点击顶部姓名区域打开角色面板。</p>`,
    related: ["newbie-status", "newbie-explore"],
    actions: [
      { label: "查看任务", command: "quest" },
    ],
    status: "published",
  },
  {
    id: "newbie-status",
    title: "查看状态",
    summary: "了解你的气血、精神、内力等核心数值。",
    category: "newbie_village",
    stage: "newbie_village",
    body: `<p>你的状态在顶部以彩色条和数字显示：</p>
<p><strong>气血：</strong>你的生命值。战斗中会减少，降到 0 会昏迷。休息或使用内力可以恢复。</p>
<p><strong>精神：</strong>读书、学习需要的能量。学习会消耗精神，睡觉可以恢复。</p>
<p><strong>食物 / 饮水：</strong>降到 0 时不会自然恢复气血和精神。记得吃喝。</p>
<p>点击顶部姓名区域打开完整角色面板，查看经验、潜能、武功、装备和背包。</p>`,
    related: ["newbie-start"],
    actions: [],
    status: "published",
  },
  {
    id: "newbie-explore",
    title: "探索与生存",
    summary: "如何在未明谷和柳秀山庄获取食物、饮水和方向感。",
    category: "newbie_village",
    stage: "newbie_village",
    body: `<p><strong>饥饿时：</strong>地上有野果（ye guo），点击物品拾取后食用。</p>
<p><strong>口渴时：</strong>靠近溪流（river），捡起地上的葫芦（hulu）装满清水饮用。</p>
<p><strong>迷路时：</strong>每个房间可通过 quest 了解当前任务和去向。完成探索后可以攀爬离开未明谷。</p>`,
    related: ["newbie-start"],
    actions: [],
    status: "published",
  },
  {
    id: "newbie-interact",
    title: "与 NPC 交流",
    summary: "打听、给予、跟随、拜师——如何与游戏世界互动。",
    category: "newbie_village",
    stage: "newbie_village",
    body: `<p>点击房间中的人物名称，打开交互面板，可以进行以下操作：</p>
<p><strong>打听：</strong>询问 NPC 关于特定话题的信息。试试打听「here」「name」。</p>
<p><strong>给予：</strong>将物品交给 NPC。某些任务需要交付特定物品。</p>
<p><strong>跟随：</strong>跟随 NPC 前往某个地点。</p>
<p><strong>切磋：</strong>与 NPC 进行友好比武，不会致死。</p>
<p>NPC 头顶的标记会提示你可以做什么。</p>`,
    related: ["newbie-combat", "newbie-bai"],
    actions: [],
    status: "published",
  },
  {
    id: "newbie-combat",
    title: "战斗入门",
    summary: "切磋、伤势、恢复与逃跑。",
    category: "newbie_village",
    stage: "newbie_village",
    body: `<p><strong>切磋（fight）：</strong>与 NPC 友好比武，双方气血降到 50% 时自动停止。</p>
<p><strong>停止（halt）：</strong>随时可以停止战斗。</p>
<p><strong>受伤：</strong>气血上限降低即为受伤。可以去药铺买药治疗。</p>
<p><strong>恢复：</strong>睡觉（sleep）可以同时恢复气血、精神和内力。</p>
<p><strong>逃跑：</strong>设定撤退阈值（wimpy），气血低于该比例时自动逃离。</p>`,
    related: ["newbie-bai", "newbie-economy"],
    actions: [
      { label: "睡觉", command: "sleep" },
    ],
    status: "published",
  },
  {
    id: "newbie-bai",
    title: "拜师学艺",
    summary: "如何拜师、学习武功、装备和练习。",
    category: "newbie_village",
    stage: "newbie_village",
    body: `<p><strong>拜师（bai）：</strong>找到武师后，点击交互面板中的「拜师」。拜师后才能学习武功。</p>
<p><strong>查看师傅技能（cha）：</strong>了解师傅会哪些武功。点击交互面板中的「查看技能」。</p>
<p><strong>学习（xue）：</strong>向师傅学习武功，消耗精神和潜能。</p>
<p><strong>激发（jifa）：</strong>将学到的特殊武功激发到对应的基本功上，才能在战斗中使用。例如激发太乙神功为内功。</p>
<p><strong>准备（bei）：</strong>指定空手功夫。同时准备两种可以每回合出两招。</p>
<p><strong>练习（lian）：</strong>反复练习已学武功，提高熟练度。不消耗潜能。</p>
<p><strong>装备：</strong>拿到武器后，点击物品选择「装备」即可持握。</p>`,
    related: ["newbie-combat", "newbie-status"],
    actions: [],
    status: "published",
  },
  {
    id: "newbie-economy",
    title: "经济与物品",
    summary: "赚钱、购物、存钱的基本方法。",
    category: "newbie_village",
    stage: "newbie_village",
    body: `<p>新手村期间，你可以在以下地方使用金钱：</p>
<p><strong>药铺：</strong>购买金疮药治疗伤势。buy yao 即可。</p>
<p><strong>铁匠铺：</strong>购买钢剑等武器。</p>
<p><strong>酒铺 / 杂货铺：</strong>购买食物、酒水和食盒等任务物品。</p>
<p><strong>当铺：</strong>卖不需要的物品换钱。</p>
<p><strong>票号：</strong>存取钱款。用 localmaps 查找票号位置。</p>
<p>完成新手村任务会奖励经验和潜能。毕业时更会获得一笔丰厚的潜能奖励。</p>`,
    related: ["newbie-interact", "graduate-attribute"],
    actions: [],
    status: "published",
  },

  // ═══ 毕业属性 ═══
  {
    id: "graduate-attribute",
    title: "四维天赋详解",
    summary: "膂力、悟性、根骨、身法——选择适合你的成长方向。",
    category: "attribute",
    stage: "graduate",
    body: `<p>四维天赋决定你的角色在武学道路上的倾向。离开柳秀山庄前，你有一次不可更改的天赋分配机会。四维总和固定为 80，每项可在 10-30 之间调整。</p>
<p><strong>膂力：</strong>影响近身攻击的威力与负重能力。适合偏好正面交锋、使用重兵器的侠士。</p>
<p><strong>悟性：</strong>影响学习、领悟与研读武学的效率。适合希望更快掌握复杂武功的侠士。</p>
<p><strong>根骨：</strong>影响体魄、恢复与内功成长基础。适合重视生存、续航和持久作战的侠士。</p>
<p><strong>身法：</strong>影响闪避与行动中的灵活性。适合轻功、剑法与规避伤害的侠士。</p>
<p>毕业后，天赋仍可通过游戏内的特殊机制少量提升，但初始分配决定了成长上限。</p>`,
    related: ["newbie-status", "yangzhou-basic"],
    actions: [],
    status: "published",
  },
  {
    id: "graduate-flow",
    title: "毕业流程",
    summary: "完成新手村后，如何进入扬州。",
    category: "newbie_village",
    stage: "graduate",
    body: `<p>当你完成柳秀山庄的全部试炼后：</p>
<ol>
  <li>到车马行（mache）输入 qu yangzhou</li>
  <li>确认离开的决心</li>
  <li>系统弹出自定义天赋界面，设定你的四维</li>
  <li>确认后，清除教学武功和经验</li>
  <li>获得毕业潜能奖励</li>
  <li>马车送你到扬州广场</li>
</ol>
<p>毕业不可逆。离开后无法再回到柳秀山庄学习教学武功。</p>`,
    related: ["graduate-attribute", "yangzhou-basic"],
    actions: [],
    status: "published",
  },

  // ═══ 扬州入门 ═══
  {
    id: "yangzhou-basic",
    title: "扬州生存指南",
    summary: "来到扬州后，你需要知道的事。",
    category: "yangzhou",
    stage: "yangzhou",
    body: `<p>扬州是中原最繁华的城市之一，也是你江湖旅程的真正起点。</p>
<p><strong>客店：</strong>扬州中心。可以睡觉恢复，也是默认的存档点。</p>
<p><strong>醉仙楼：</strong>购买食物和酒水。list 查看菜单，buy 购买。</p>
<p><strong>武庙：</strong>安全区。可以睡觉、存取物品、查询排行榜。</p>
<p><strong>钱庄：</strong>存取金钱。存款不会因死亡全部丢失。</p>
<p><strong>当铺：</strong>出售不需要的物品。</p>
<p><strong>打铁铺：</strong>购买和打造兵器。</p>
<p><strong>药铺：</strong>购买疗伤药物。</p>
<p>完成新手村后，你有了初始潜能。接下来可以做新手任务、拜师门派、或四处探索。</p>`,
    related: ["graduate-attribute", "newbie-combat"],
    actions: [],
    status: "published",
  },
  {
    id: "yangzhou-next",
    title: "下一步做什么",
    summary: "毕业后的成长路线建议。",
    category: "yangzhou",
    stage: "yangzhou",
    body: `<p>刚踏入扬州，你的经验为 0，但有了初始潜能。以下是推荐的成长路线：</p>
<p><strong>1. 拜师</strong><br/>
选择一个门派（help menpai），前往该门派拜师，开始学习本门武功。</p>
<p><strong>2. 新手任务</strong><br/>
部分门派有新手任务（quest），完成后奖励经验和门忠。</p>
<p><strong>3. 熟悉地图</strong><br/>
四处走走，了解各城镇、门派和交通路线。</p>
<p><strong>4. 公共任务</strong><br/>
抄经、送信等任务不需要高武功。</p>
<p><strong>5. 结交朋友</strong><br/>
用 chat 频道与其他玩家交流，江湖路远，有伴同行。</p>`,
    related: ["yangzhou-basic"],
    actions: [],
    status: "published",
  },

  // ═══ 规则 ═══
  {
    id: "rules",
    title: "基本规则",
    summary: "游戏中的行为规范与须知。",
    category: "rule",
    stage: "yangzhou",
    body: `<p>这里是一个测试中的江湖，请遵守以下基本规则：</p>
<p>· 禁止使用全自动机器人脚本</p>
<p>· 尊重其他玩家，不要恶意 PK 新手</p>
<p>· 发现 BUG 或有建议，欢迎反馈</p>
<p>· 当前为测试阶段，数据可能随版本更新重置</p>`,
    related: [],
    actions: [],
    status: "published",
  },

  // ═══ 基础玩法 ═══
  {
    id: "basic-move",
    title: "移动与探索",
    summary: "如何在地图间行走、观察周围环境。",
    category: "basic",
    stage: "yangzhou",
    body: `<p><strong>方向移动：</strong>点击屏幕上的出口按钮即可前往相邻房间。常用方向：north（北）、south（南）、east（东）、west（西）、up（上）、down（下）、enter（进）、out（出）。</p>
<p><strong>观察：</strong>进入新场景时会自动显示场景描述。点击出口按钮可以远眺邻房。</p>
<p><strong>localmaps：</strong>查看当前区域的小地图。</p>
<p><strong>保存位置：</strong>在安全房间使用 save 指令或菜单保存进度。死亡后会在扬州武庙复活。</p>`,
    related: ["yangzhou-basic"],
    actions: [{ label: "查看地图", command: "localmaps" }],
    status: "published",
  },
  {
    id: "basic-hp",
    title: "状态与恢复",
    summary: "气血、精神、内力、精力的含义与恢复方法。",
    category: "basic",
    stage: "yangzhou",
    body: `<p>你的状态在顶部以彩色条显示：</p>
<p><strong>气血（红条）：</strong>生命值。战斗中被攻击会减少。降到 0 会昏迷甚至死亡。气血上限受根骨、内力和年龄影响。可以使用 exert/yun recover 消耗内力恢复气血。受伤时用 exert/yun heal 疗伤。</p>
<p><strong>精神（蓝条）：</strong>学习和读书消耗精神。可以用 exert/yun regenerate 恢复精神。</p>
<p><strong>内力：</strong>通过打坐（dazuo）将气血转化为内力。内力可用于恢复、加力和施展武功。上限受内功等级和根骨影响。</p>
<p><strong>精力：</strong>通过吐纳（tuna）将精神转化为精力。精力影响精神和某些技能效果。</p>
<p><strong>食物 / 饮水：</strong>两项中任一项降到 0 时，气血和精神不会自然恢复。去酒楼吃饭或在井边 fill 容器装水。</p>`,
    related: ["basic-move", "graduate-attribute"],
    actions: [],
    status: "published",
  },
  {
    id: "basic-combat",
    title: "战斗详解",
    summary: "切磋、击杀、逃跑与死亡惩罚。",
    category: "combat",
    stage: "yangzhou",
    body: `<p><strong>切磋（fight）：</strong>与 NPC 或玩家进行友好比武。双方气血降至 50% 时自动停止。不会致死。</p>
<p><strong>击杀（kill）：</strong>生死搏斗，直到一方死亡才会停止。新手慎用。</p>
<p><strong>停止（halt）：</strong>随时可以停止战斗。</p>
<p><strong>逃跑设定（wimpy）：</strong>在角色面板设定撤退阈值。当气血低于该比例时会自动尝试逃跑。</p>
<p><strong>死亡惩罚：</strong>真死会损失约 2% 经验和部分潜能，所有技能降低 1 级。14 岁以下新手保护期无损失。</p>
<p><strong>死亡后：</strong>在鬼门关停留一段时间后，会被送回扬州武庙。</p>`,
    related: ["basic-hp", "skill-intro"],
    actions: [{ label: "设定逃跑", command: "set wimpy 50" }],
    status: "published",
  },
  {
    id: "skill-intro",
    title: "武功体系",
    summary: "学习、练习、激发、准备——武功提升之路。",
    category: "skill",
    stage: "yangzhou",
    body: `<p>武功分为基本功夫（如基本内功、基本剑法）和特殊功夫（如太极拳、独孤九剑）。特殊功夫需要激发（jifa）到相应的基本功上才能在战斗中发挥作用。</p>
<p><strong>学习（xue）：</strong>向师傅学习武功。消耗精神和潜能。学习前需要先拜师（bai）。</p>
<p><strong>练习（lian）：</strong>反复练习已学会的特殊功夫，提高等级。不消耗潜能，但需要对应的基本功夫达到一定等级。</p>
<p><strong>读书：</strong>很多武功可以通过阅读秘籍学习。在行囊中点击书籍选择「阅读」。</p>
<p><strong>激发（jifa）：</strong>将特殊武功激发到基本功上。例如 jifa force taiji-shengong 将特殊内功激发的内力上。</p>
<p><strong>准备（bei）：</strong>空手功夫需要准备后才能使用。可以同时准备两种空手功夫，每回合出两招。</p>
<p><strong>绝招（perform）：</strong>特殊武功的强力招式。在角色面板的武功详情中查看可用的绝招。</p>`,
    related: ["basic-combat", "basic-hp"],
    actions: [],
    status: "published",
  },
  {
    id: "skill-force",
    title: "内功详解",
    summary: "内力、打坐、吐纳与运功。",
    category: "skill",
    stage: "yangzhou",
    body: `<p>内功是一切武学的根基。学好内功能大幅提升你的生存和战斗能力。</p>
<p><strong>打坐（dazuo）：</strong>将气血转化为内力。需要激发特殊内功后才能使用。上限受内功等级和根骨影响。</p>
<p><strong>吐纳（tuna）：</strong>将精神转化为精力。同样需要激发特殊内功。</p>
<p><strong>运功（exert/yun）：</strong>使用内力实现各种效果：</p>
<p>· recover：消耗内力恢复气血</p>
<p>· regenerate：消耗内力恢复精神</p>
<p>· heal：消耗内力治疗伤势（气血上限伤害）</p>
<p>· lifeheal：消耗大量内力深度治疗</p>
<p>· powerup：消耗内力临时提升攻击力（部分内功支持）</p>
<p><strong>加力（jiali）：</strong>战斗中额外消耗内力增加伤害。在角色面板设置加力值。</p>`,
    related: ["skill-intro", "basic-hp"],
    actions: [{ label: "打坐", command: "dazuo" }],
    status: "published",
  },
  {
    id: "basic-economy",
    title: "赚钱与交易",
    summary: "如何在江湖中赚取和保存金钱。",
    category: "economy",
    stage: "yangzhou",
    body: `<p><strong>赚钱方法：</strong></p>
<p>· 做任务：大部分任务奖励金钱</p>
<p>· 卖物品：在当铺（pawn）出售不需要的装备和物品</p>
<p>· 捡取出售：路上掉落的物品可以捡起卖到当铺</p>
<p>· 向老玩家求助：很多玩家乐意帮助新人</p>
<p><strong>钱庄：</strong>扬州中心附近有钱庄。存款（deposit）安全保管金钱，死亡不会全部丢失。取款（withdraw）随时可用。各城市钱庄联网。</p>
<p><strong>购买物品：</strong>在店铺前使用 list 查看商品，buy 购买。武器店、药铺、酒肆等遍布扬州。</p>`,
    related: ["yangzhou-basic"],
    actions: [],
    status: "published",
  },
  {
    id: "basic-social",
    title: "社交与交流",
    summary: "聊天、组队、留言板。",
    category: "basic",
    stage: "yangzhou",
    body: `<p>MUD 是一个多人在线世界，交流是重要的组成部分！</p>
<p><strong>公共聊天（chat）：</strong>发送的消息会被全服玩家看到。在输入框输入 chat 消息即可。</p>
<p><strong>私聊（tell）：</strong>与指定玩家私下交流。格式：tell id 消息</p>
<p><strong>回复（reply）：</strong>回复最近 tell 你的人。</p>
<p><strong>耳语（whisper）：</strong>与同一房间的人秘密说话。</p>
<p><strong>表情（semote）：</strong>使用 chat* 表情 或直接输入 表情 来表演动作。</p>
<p><strong>留言板：</strong>在武庙和客店有留言板，可以阅读和留言。板上的文章会进入文选（wenxuan）。</p>`,
    related: ["yangzhou-basic"],
    actions: [],
    status: "published",
  },
  {
    id: "basic-move",
    title: "移动与探索",
    summary: "如何在地图间行走、观察周围环境。",
    category: "basic",
    stage: "yangzhou",
    body: "方向移动：点击出口按钮前往相邻房间。north（北）、south（南）、east（东）、west（西）。保存位置：在安全房间使用 save 或菜单保存进度。",
    related: ["yangzhou-basic"],
    actions: [],
    status: "published",
  },
  {
    id: "basic-hp",
    title: "状态与恢复",
    summary: "气血、精神、内力、精力的含义。",
    category: "basic",
    stage: "yangzhou",
    body: "气血：生命值。可用 exert recover 恢复，exert heal 疗伤。内力：打坐（dazuo）将气血转化而来。食物/饮水：任一为零时不会自然恢复。",
    related: ["basic-move"],
    actions: [{ label: "打坐", command: "dazuo" }],
    status: "published",
  },
  {
    id: "basic-combat",
    title: "战斗详解",
    summary: "切磋、击杀、逃跑与死亡。",
    category: "combat",
    stage: "yangzhou",
    body: "切磋（fight）：友好比武，气血 50% 时自动停止。击杀（kill）：生死搏斗。逃跑（wimpy）：角色面板设定阈值。死亡：损失少量经验，14 岁以下无损失。",
    related: ["basic-hp"],
    actions: [],
    status: "published",
  },
  {
    id: "skill-intro",
    title: "武功体系",
    summary: "拜师、学习、激发、练习。",
    category: "skill",
    stage: "yangzhou",
    body: "拜师（bai）：找 NPC 拜师。学习（xue）：向师傅学习，消耗精神潜能。激发（jifa）：将特殊武功激发到基本功。准备（bei）：空手功夫需要准备才能使用。练习（lian）：反复练习提高等级。",
    related: ["basic-combat"],
    actions: [],
    status: "published",
  },
  {
    id: "basic-economy",
    title: "赚钱与交易",
    summary: "赚钱、钱庄、购物。",
    category: "economy",
    stage: "yangzhou",
    body: "赚钱：做任务、卖装备到当铺。钱庄：存款安全保管金钱。购物：用 list 查看商品，buy 购买。",
    related: ["yangzhou-basic"],
    actions: [],
    status: "published",
  },
]

export const HELP_INDEX: Record<string, HelpArticle> = {};
for (const article of HELP_ARTICLES) {
  HELP_INDEX[article.id] = article;
}

/** 按阶段获取推荐文章 */
export function getHelpByStage(stage: HelpStage): HelpArticle[] {
  return HELP_ARTICLES.filter((a) => a.stage === stage && a.status === "published");
}

/** 按分类获取文章 */
export function getHelpByCategory(category: string): HelpArticle[] {
  return HELP_ARTICLES.filter((a) => a.category === category && a.status === "published");
}

/** 搜索文章 */
export function searchHelp(query: string): HelpArticle[] {
  const q = query.toLowerCase();
  return HELP_ARTICLES.filter(
    (a) =>
      a.status === "published" &&
      (a.title.toLowerCase().includes(q) ||
        a.summary.toLowerCase().includes(q) ||
        a.body.toLowerCase().includes(q))
  );
}
