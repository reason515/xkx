// assistd.c — official AFK assist (no player scripting)

#include <ansi.h>
#include <skill.h>

#define WEBD "/adm/daemons/webd"
#define PATHD "/adm/daemons/xkd_pathd"
#define GO_CMD "/cmds/std/go"
#define MAX_TRAIN_TICKS 500
#define MAX_LEARN_TICKS 999
#define MAX_COMBAT_TICKS 2000
#define MAX_GRIND_TICKS 3000
#define MAX_STUDY_TICKS 3000
#define GRIND_RESUME_PCT 80
#define GRIND_WOUND_MIN_PCT 60
#define STUDY_MIN_JING 30
#define FRUIT_MAX_EXP 250

// Minimum resources to attempt one round (match cmds/skill thresholds).
#define DAZUO_MIN_QI 30
#define TUNA_MIN_JING 30
#define LIAN_MIN_JINGLI 30
#define LIAN_MIN_NEILI 20

inherit F_DBASE;

mapping sessions;

void grind_tick(string id);
void do_grind_tick(string id);
void study_tick(string id);
string grind_recover_dest(object me);
void grind_set_path(mapping cfg, object me, string dest);
void grind_set_spawn_path(mapping cfg, object me, string target_key);
int grind_follow_path(object me, mapping cfg);
int grind_jingli_too_low(object me);
int grind_try_recover_jingli(object me);
int grind_try_yun_recover(object me, int need_pct);
int grind_dispose_zhou(object me);
int grind_step_or_rest(object me, mapping cfg);
int assist_is_sleeping(object me);
void assist_finish_sleep(object me);
int study_resume_jing(object me);
string assist_unreachable_hint(object me, string dest);
string grind_target_label(string target_key);
string grind_unreachable_spawn_msg(object me, string target_key);

void create()
{
	seteuid(getuid());
	sessions = ([]);
}

void grind_restore_wimpy(object me, mapping cfg)
{
	int prev;

	if (!objectp(me) || !mapp(cfg) || cfg["kind"] != "grind")
		return;
	if (undefinedp(cfg["saved_wimpy"])) return;
	prev = (int)cfg["saved_wimpy"];
	if (prev > 0)
		me->set("env/wimpy", prev);
	else
		me->delete("env/wimpy");
}

/* 低血撤回：断开仇杀并立刻迈出撤离第一步（halt  alone 清不掉 kill_ob）。 */
void grind_begin_retreat(object me, mapping cfg)
{
	string dest;

	if (!objectp(me) || !mapp(cfg)) return;
	me->remove_all_killer();
	me->force_me("halt");
	if (!stringp(cfg["home"]) || cfg["home"] == "")
		cfg["home"] = PATHD->room_path(environment(me));
	cfg["phase"] = "retreat";
	cfg["path"] = ({});
	dest = grind_recover_dest(me);
	grind_set_path(cfg, me, dest);
	if (arrayp(cfg["path"]) && sizeof(cfg["path"]))
		grind_follow_path(me, cfg);
	else {
		/* 勿随机 flee：容易跑出挂机白名单，随后「无法前往刷怪点」 */
		WEBD->send_assist_status(me, 1, "挂机中 · 撤回受阻，请手动走到大山洞或休息室");
		return;
	}
	WEBD->send_assist_status(me, 1, "挂机中 · 撤回休整");
}

void stop_assist(object me, string reason)
{
	string id;
	int had;
	mapping cfg;

	if (!objectp(me)) return;
	id = me->query("id");
	had = !undefinedp(sessions[id]);
	if (had) {
		cfg = sessions[id];
		if (mapp(cfg)) grind_restore_wimpy(me, cfg);
		map_delete(sessions, id);
	}
	me->delete_temp("web_assist");
	// 启动新挂机时用非字符串 reason 静默清场，避免先推 active:0 冲掉前端状态。
	if (!had || !stringp(reason) || reason == "") return;
	WEBD->send_assist_status(me, 0, reason);
}

int should_stop_train(object me, mapping cfg)
{
	mapping my;

	if (!objectp(me)) return 1;
	if (cfg["stop_combat"] && me->is_fighting()) return 1;

	my = me->query_entire_dbase();
	switch (cfg["stop_when"]) {
	case "full":
		if (cfg["mode"] == "dazuo") {
			if (my["neili"] >= my["max_neili"] * 95 / 100) return 1;
		} else if (cfg["mode"] == "tuna") {
			if (my["jingli"] >= my["max_jingli"] * 95 / 100) return 1;
		}
		break;
	case "potential":
		if ((int)me->query("potential") < 1) return 1;
		break;
	case "count":
		if (cfg["remaining"] <= 0) return 1;
		break;
	}
	return 0;
}

// recovering=0: enter rest when below hard mins.
// recovering=1: resume only after a hysteresis band (avoid thrashing).
int train_can_act(object me, mapping cfg, int recovering)
{
	mapping my;
	int max_qi, max_jing, max_jingli, max_neili, need;

	if (!objectp(me)) return 0;
	my = me->query_entire_dbase();
	if (!mapp(my)) return 0;

	max_qi = my["max_qi"];
	max_jing = my["max_jing"];
	max_jingli = my["max_jingli"];
	max_neili = my["max_neili"];

	switch (cfg["mode"]) {
	case "dazuo":
		need = DAZUO_MIN_QI;
		if (recovering && max_qi > 0) {
			need = max_qi * 45 / 100;
			if (need < DAZUO_MIN_QI) need = DAZUO_MIN_QI;
		}
		if (my["qi"] < need) return 0;
		if (max_jing > 0 && my["jing"] * 100 / max_jing < 70) return 0;
		return 1;
	case "tuna":
		need = TUNA_MIN_JING;
		if (recovering && max_jing > 0) {
			need = max_jing * 45 / 100;
			if (need < TUNA_MIN_JING) need = TUNA_MIN_JING;
		}
		if (my["jing"] < need) return 0;
		if (max_qi > 0 && my["qi"] * 100 / max_qi < 70) return 0;
		return 1;
	case "lian":
		need = LIAN_MIN_JINGLI;
		if (recovering && max_jingli > 0) {
			need = max_jingli * 40 / 100;
			if (need < LIAN_MIN_JINGLI) need = LIAN_MIN_JINGLI;
		}
		if (my["jingli"] < need) return 0;
		need = LIAN_MIN_NEILI;
		if (recovering && max_neili > 0) {
			need = max_neili * 30 / 100;
			if (need < LIAN_MIN_NEILI) need = LIAN_MIN_NEILI;
		}
		if (my["neili"] < need) return 0;
		return 1;
	}
	return 0;
}

string recover_status(object me, mapping cfg)
{
	mapping my;
	int pct;

	my = me->query_entire_dbase();
	if (!mapp(my)) return "调息中，待状态恢复后续练";

	switch (cfg["mode"]) {
	case "dazuo":
		pct = my["max_qi"] > 0 ? my["qi"] * 100 / my["max_qi"] : 0;
		return sprintf("调息中 · 气 %d%%，恢复后续打坐", pct);
	case "tuna":
		pct = my["max_jing"] > 0 ? my["jing"] * 100 / my["max_jing"] : 0;
		return sprintf("调息中 · 精 %d%%，恢复后续吐纳", pct);
	case "lian":
		pct = my["max_jingli"] > 0 ? my["jingli"] * 100 / my["max_jingli"] : 0;
		return sprintf("调息中 · 精力 %d%%，恢复后续练功", pct);
	}
	return "调息中，待状态恢复后续练";
}

void train_tick(string id)
{
	object me;
	mapping cfg;
	string cmd;
	int resting, result;

	if (undefinedp(sessions[id])) return;
	me = find_player(id);
	if (!objectp(me)) {
		map_delete(sessions, id);
		return;
	}

	cfg = sessions[id];
	if (should_stop_train(me, cfg)) {
		stop_assist(me, "已达停止条件");
		return;
	}

	// Mid-dazuo / mid-tuna: wait out busy instead of stacking failed cmds.
	if (me->is_busy()
	 || me->query_temp("pending/exercise")
	 || me->query_temp("pending/respirate")) {
		call_out("train_tick", 2, id);
		return;
	}

	resting = cfg["resting"];
	if (!train_can_act(me, cfg, resting)) {
		cfg["resting"] = 1;
		sessions[id] = cfg;
		WEBD->send_assist_status(me, 1, recover_status(me, cfg));
		WEBD->send_vitals(me);
		call_out("train_tick", 4, id);
		return;
	}

	if (resting) {
		cfg["resting"] = 0;
		sessions[id] = cfg;
		WEBD->send_assist_status(me, 1, "状态已恢复，继续修炼");
	}

	switch (cfg["mode"]) {
	case "dazuo":
		cmd = "dazuo 30";
		break;
	case "tuna":
		cmd = "tuna 30";
		break;
	case "lian":
		cmd = "lian " + cfg["skill"] + " 1";
		break;
	default:
		stop_assist(me, "未知修炼模式");
		return;
	}

	result = me->force_me(cmd);
	if (!result) {
		if (cfg["mode"] == "lian") {
			if (cfg["retry_after_rest"]) {
				stop_assist(
					me, "状态已恢复但仍无法练习，请检查功夫条件"
				);
				return;
			}
			cfg["resting"] = 1;
			cfg["retry_after_rest"] = 1;
			sessions[id] = cfg;
			WEBD->send_assist_status(
				me, 1, "调息中 · 练功所需精力或内力不足"
			);
			call_out("train_tick", 4, id);
			return;
		}
		stop_assist(me, "当前环境或状态无法继续修炼");
		return;
	}
	cfg["retry_after_rest"] = 0;
	// Only count a successful round.
	if (cfg["stop_when"] == "count") cfg["remaining"]--;
	WEBD->send_vitals(me);
	cfg["ticks"]++;
	sessions[id] = cfg;
	if (cfg["ticks"] > MAX_TRAIN_TICKS) {
		stop_assist(me, "挂机时长已达上限");
		return;
	}
	call_out("train_tick", 2, id);
}

string learn_stop_reason(object me, object teacher, mapping cfg)
{
	int mine, theirs;
	string skill;

	if (!objectp(teacher) || environment(teacher) != environment(me))
		return "授业者已不在身边，学艺停止";
	if (!living(teacher)) return "授业者目前无法指点，学艺停止";
	if (cfg["stop_combat"] && me->is_fighting())
		return "进入战斗，学艺停止";
	if ((int)me->query("potential") < 1)
		return "潜能耗尽，学艺停止";

	skill = cfg["skill"];
	theirs = teacher->query_skill(skill, 1);
	if (theirs < 1) return "对方不会这门功夫，学艺停止";
	mine = me->query_skill(skill, 1);
	if (mine >= theirs) return "这门功夫已不逊于授业者，学艺停止";
	if ((string)SKILL_D(skill)->type() == "martial"
	 && mine * mine * mine / 10 > (int)me->query("combat_exp"))
		return "实战经验不足，暂时无法继续领悟";
	if (cfg["stop_when"] == "count" && cfg["remaining"] <= 0)
		return "已完成设定的学习次数";
	return 0;
}

/* 与 cmds/skill/learn.c 单次基础精耗一致（尚未乘次数与 3/2） */
int learn_unit_base(object me, string skill)
{
	int intel, cost;

	intel = me->query_int();
	if (intel < 1) intel = 1;
	cost = 150 / intel;
	if (!me->query_skill(skill, 1)) cost *= 2;
	if (cost < 1) cost = 1;
	return cost;
}

int learn_gin_cost(object me)
{
	int cost;

	cost = learn_unit_base(me, me->query_temp("web_learn_skill")) * 3 / 2;
	if (cost < 1) cost = 1;
	return cost;
}

/* 一次 learn 可下的最大次数（对齐 learn.c 的精/潜能门槛） */
int learn_max_times(object me, object teacher, string skill, int want)
{
	int base, pot, jing, tjing, times;

	if (!objectp(me) || !objectp(teacher) || want < 1) return 0;
	base = learn_unit_base(me, skill);
	pot = (int)me->query("potential");
	if (pot < 1) return 0;
	if (want > pot) want = pot;
	if (want > 200) want = 200;

	jing = (int)me->query("jing");
	tjing = (int)teacher->query("jing");
	times = want;
	while (times > 0) {
		if (tjing > times * base / 5 + 1
		 && jing > times * base * 3 / 2)
			return times;
		times--;
	}
	return 0;
}

void learn_tick(string id)
{
	object me, teacher;
	mapping cfg;
	string reason, cmd, skill;
	int times, result, unit_cost;

	if (undefinedp(sessions[id])) return;
	me = find_player(id);
	if (!objectp(me)) {
		map_delete(sessions, id);
		return;
	}
	cfg = sessions[id];
	if (cfg["kind"] != "learn") return;
	teacher = present(cfg["teacher"], environment(me));
	reason = learn_stop_reason(me, teacher, cfg);
	if (stringp(reason)) {
		stop_assist(me, reason);
		return;
	}
	if (me->is_busy()) {
		call_out("learn_tick", 2, id);
		return;
	}

	skill = cfg["skill"];
	if (cfg["stop_when"] == "count")
		times = (int)cfg["remaining"];
	else
		times = (int)me->query("potential");
	if (times < 1) {
		stop_assist(me, "已完成设定的学习次数");
		return;
	}
	times = learn_max_times(me, teacher, skill, times);
	if (times < 1) {
		unit_cost = learn_unit_base(me, skill) * 3 / 2;
		cfg["resting"] = 1;
		sessions[id] = cfg;
		WEBD->send_assist_status(
			me, 1,
			(int)me->query("jing") <= unit_cost
				? "调息中 · 精不足，恢复后继续学艺"
				: "授业者正在休息，稍后继续学艺"
		);
		WEBD->send_vitals(me);
		call_out("learn_tick", 4, id);
		return;
	}
	if (cfg["resting"]) {
		cfg["resting"] = 0;
		WEBD->send_assist_status(me, 1, "精神已恢复，继续学艺");
	}

	/* 一次指令学多次，避免 learn … 1 反复刷屏 */
	cmd = sprintf("learn %s %s %d", cfg["teacher"], skill, times);
	result = me->force_me(cmd);
	if (!result) {
		stop_assist(me, "当前条件不允许继续学习");
		return;
	}
	cfg["ticks"] += times;
	if (cfg["stop_when"] == "count") {
		cfg["remaining"] -= times;
		if (cfg["remaining"] < 0) cfg["remaining"] = 0;
	}
	sessions[id] = cfg;
	WEBD->send_vitals(me);
	WEBD->send_assist_status(
		me, 1, sprintf("学艺中 · 已学 %d 次", cfg["ticks"])
	);
	if (cfg["ticks"] >= MAX_LEARN_TICKS) {
		stop_assist(me, "学习次数已达上限");
		return;
	}
	if (cfg["stop_when"] == "count" && cfg["remaining"] <= 0) {
		stop_assist(me, "已完成设定的学习次数");
		return;
	}
	if (cfg["stop_when"] == "potential" && (int)me->query("potential") < 1) {
		stop_assist(me, "潜能耗尽，学艺停止");
		return;
	}
	call_out("learn_tick", 2, id);
}

void combat_tick(string id)
{
	object me;
	mapping cfg, my;
	int pct;

	if (undefinedp(sessions[id])) return;
	me = find_player(id);
	if (!objectp(me)) {
		map_delete(sessions, id);
		return;
	}

	cfg = sessions[id];
	if (!me->is_fighting()) {
		stop_assist(me, "战斗已结束");
		return;
	}

	my = me->query_entire_dbase();
	if (my["max_qi"] > 0) {
		pct = my["qi"] * 100 / my["max_qi"];
		if (pct <= cfg["low_hp"]) {
			switch (cfg["low_action"]) {
			case "flee":
				me->force_me("flee");
				stop_assist(me, "气血过低，已逃跑");
				return;
			case "stop":
				me->force_me("halt");
				stop_assist(me, "气血过低，已停手");
				return;
			default:
				WEBD->send_assist_status(me, 1, "气血偏低，请注意");
				break;
			}
		}
	}

	me->force_me("hit");
	cfg["ticks"]++;
	if (cfg["ticks"] > MAX_COMBAT_TICKS) {
		stop_assist(me, "挂机时长已达上限");
		return;
	}
	call_out("combat_tick", 1, id);
}

varargs int start_train(object me, string mode, string stop_when,
		int count, int stop_combat, string skill)
{
	string id;
	mapping cfg;
	string mapped;

	if (!objectp(me)) return 0;
	id = me->query("id");
	stop_assist(me, 0);

	if (mode == "dazuo" && !stringp(me->query_skill_mapped("force"))) {
		WEBD->send_assist_status(me, 0, "请先激发内功再打坐");
		return 0;
	}
	if (mode == "lian") {
		mapped = me->query_skill_mapped(skill);
		if (!stringp(skill) || skill == "parry" || !stringp(mapped)) {
			WEBD->send_assist_status(me, 0, "请先激发要练习的功夫");
			return 0;
		}
		if (me->query_skill(skill, 1) < 1
		 || me->query_skill(mapped, 1) < 1
		 || me->query_skill(skill, 1) / 2
		    <= me->query_skill(mapped, 1) / 3) {
			WEBD->send_assist_status(me, 0, "基本功火候不足，暂时无法练习");
			return 0;
		}
		if (!SKILL_D(mapped)->valid_learn(me)) {
			WEBD->send_assist_status(me, 0, "当前条件不允许练习这门功夫");
			return 0;
		}
		stop_when = "count";
		if (count < 1) count = 1;
	}

	cfg = ([
		"kind": "train",
		"mode": mode,
		"stop_when": stop_when,
		"remaining": count,
		"stop_combat": stop_combat,
		"skill": skill,
		"ticks": 0,
		"resting": 0,
	]);
	sessions[id] = cfg;
	me->set_temp("web_assist", 1);
	WEBD->mark_web_client(me);
	WEBD->send_assist_status(me, 1, "修炼助手进行中");
	call_out("train_tick", 1, id);
	return 1;
}

int start_learn(object me, string teacher, string skill,
		string stop_when, int count, int stop_combat)
{
	string id;
	mapping cfg;
	object ob;

	if (!objectp(me)) return 0;
	ob = present(teacher, environment(me));
	if (!objectp(ob) || !ob->is_character()) {
		WEBD->send_assist_status(me, 0, "授业者不在身边");
		return 0;
	}
	id = me->query("id");
	stop_assist(me, 0);
	cfg = ([
		"kind": "learn",
		"teacher": teacher,
		"skill": skill,
		"stop_when": stop_when,
		"remaining": count,
		"stop_combat": stop_combat,
		"ticks": 0,
		"resting": 0,
	]);
	sessions[id] = cfg;
	me->set_temp("web_assist", 1);
	WEBD->mark_web_client(me);
	WEBD->send_assist_status(me, 1, "学艺助手进行中");
	call_out("learn_tick", 1, id);
	return 1;
}

int start_combat(object me, int low_hp, string action)
{
	string id;
	mapping cfg;

	if (!objectp(me)) return 0;
	id = me->query("id");
	stop_assist(me, 0);

	cfg = ([
		"kind": "combat",
		"low_hp": low_hp,
		"low_action": action,
		"ticks": 0,
	]);
	sessions[id] = cfg;
	me->set_temp("web_assist", 1);
	WEBD->mark_web_client(me);
	WEBD->send_assist_status(me, 1, "战斗辅助：自动普攻");
	call_out("combat_tick", 1, id);
	return 1;
}

string grind_recover_dest(object me)
{
	if (!objectp(me)) return "/d/xiakedao/dadong";
	/* 经验超过 250 后粥和野果均不可用，直接去休息室睡觉。 */
	if ((int)me->query("combat_exp") > FRUIT_MAX_EXP)
		return "/d/xiakedao/xiuxi";
	return "/d/xiakedao/dadong";
}

/* sleep.c 的 wakeup 在 living 时会提前 return，可能残留 disabled / block_msg */
int assist_is_sleeping(object me)
{
	string dtype;

	if (!objectp(me)) return 0;
	if (me->query_temp("block_msg/all")) return 1;
	dtype = me->query("disable_type");
	if (stringp(dtype) && strsrch(dtype, "睡") >= 0) return 1;
	return 0;
}

void assist_finish_sleep(object me)
{
	if (!objectp(me)) return;
	if (me->query_temp("disabled") || me->query_temp("block_msg/all")
	 || stringp(me->query("disable_type"))) {
		catch(me->enable_player());
		me->delete_temp("block_msg/all");
		me->delete_temp("disabled");
		me->delete("disable_type");
	}
}

int study_resume_jing(object me)
{
	int max_jing, need;

	if (!objectp(me)) return STUDY_MIN_JING;
	max_jing = (int)me->query("max_jing");
	if (max_jing < 1) max_jing = 1;
	need = max_jing * 70 / 100;
	if (need < STUDY_MIN_JING + 20)
		need = STUDY_MIN_JING + 20;
	if (need > max_jing) need = max_jing;
	return need;
}

void grind_set_path(mapping cfg, object me, string dest)
{
	string *path;

	path = PATHD->path_to_room(me, dest);
	if (!arrayp(path)) path = ({});
	cfg["path"] = path;
	cfg["path_dest"] = dest;
}

void grind_set_spawn_path(mapping cfg, object me, string target_key)
{
	string *path;
	mixed err;

	/* 优先去仍有活怪的刷怪点；都没有再退回最近刷怪房 */
	path = 0;
	err = catch(path = PATHD->path_to_spawn_with_target(me, target_key, 0));
	if (err || !arrayp(path) || !sizeof(path)) {
		path = 0;
		err = catch(path = PATHD->path_to_nearest_spawn(me, target_key));
		if (err) path = 0;
	}
	if (!arrayp(path)) path = ({});
	cfg["path"] = path;
	cfg["path_dest"] = "spawn";
	cfg["stuck"] = 0;
}

string grind_target_label(string target_key)
{
	if (target_key == "monkey") return "小猴子";
	if (target_key == "haigui_s") return "小海龟";
	if (target_key == "haigui") return "海龟";
	if (target_key == "maque") return "麻雀";
	if (target_key == "wuya") return "乌鸦";
	if (target_key == "haidao_w") return "受伤海盗";
	if (target_key == "haidao_s") return "小海盗";
	if (target_key == "haidao_o") return "老海盗";
	return "目标";
}

string grind_unreachable_spawn_msg(object me, string target_key)
{
	string here;

	if (!objectp(me) || !environment(me))
		return "无法前往刷怪点";
	here = PATHD->room_path(environment(me));
	if (!PATHD->in_whitelist(here))
		return "无法前往刷怪点 · 请先走到甬道、大山洞、迎宾馆或沙滩再挂机";
	return "无法前往" + grind_target_label(target_key) + "的刷怪点";
}

int grind_follow_path(object me, mapping cfg)
{
	string *path;

	path = cfg["path"];
	if (!arrayp(path) || !sizeof(path)) return 0;
	path = PATHD->advance_path(me, path);
	cfg["path"] = path;
	return sizeof(path) == 0;
}

/* 与 cmds/std/go.c：精力 < 上限/10 时「精疲力尽，动弹不得」 */
int grind_jingli_too_low(object me)
{
	int jl, max;

	if (!objectp(me)) return 1;
	max = (int)me->query("max_jingli");
	if (max < 1) return 0;
	jl = (int)me->query("jingli");
	return jl < max / 10;
}

/* 大洞持粥 valid_leave 会拦出门；吃不下（太饱）时倒掉以免挂机空转 */
int grind_dispose_zhou(object me)
{
	object zhou;

	if (!objectp(me)) return 1;
	zhou = present("laba zhou", me);
	if (!objectp(zhou))
		zhou = present("zhou", me);
	if (!objectp(zhou)) return 1;

	if ((int)me->query("food") >= (int)me->max_food_capacity() - 5)
		me->set("food", (int)me->max_food_capacity() - 40);
	me->force_me("eat laba zhou");

	zhou = present("laba zhou", me);
	if (!objectp(zhou))
		zhou = present("zhou", me);
	if (objectp(zhou)) {
		destruct(zhou);
		tell_object(me, "你把冷掉的腊八粥倒掉了，好继续赶路。\n");
	}
	return !present("laba zhou", me) && !present("zhou", me);
}

/*
 * 已激发内功且有内力时运功回气（yun recover）。
 * 1=气已高于 need_pct；0=未激发/内力不足/已贴受伤上限/仍低于阈值。
 */
int grind_try_yun_recover(object me, int need_pct)
{
	int max_qi, qi, eff_qi;
	string force;

	if (!objectp(me) || !living(me)) return 0;
	max_qi = (int)me->query("max_qi");
	if (max_qi < 1) max_qi = 1;
	qi = (int)me->query("qi");
	if (qi * 100 / max_qi > need_pct) return 1;

	force = me->query_skill_mapped("force");
	if (!stringp(force) || force == "") return 0;
	if ((int)me->query("neili") < 20) return 0;

	eff_qi = (int)me->query("eff_qi");
	/* 当前气已贴受伤上限时 recover 无效，应撤回休整/疗伤 */
	if (qi >= eff_qi - 2) return 0;
	if (me->is_busy()) return 0;

	me->force_me("yun recover");
	qi = (int)me->query("qi");
	return qi * 100 / max_qi > need_pct;
}

/* 赶路耗尽精力时：吃粥/果，或触发 heal_up 调息。1=已够走路，0=仍不足 */
int grind_try_recover_jingli(object me)
{
	int max, need, cost;

	if (!objectp(me) || !living(me)) return 0;
	if (!grind_jingli_too_low(me)) return 1;

	grind_dispose_zhou(me);
	if (present("laba zhou", me) || present("zhou", me)) {
		me->force_me("eat laba zhou");
		if (!grind_jingli_too_low(me)) return 1;
	}
	if ((int)me->query("combat_exp") <= 250
	 && (present("ye guo", me) || present("guo", me))) {
		me->force_me("eat guo");
		if (!grind_jingli_too_low(me)) return 1;
	}

	/* 心跳调息：赶路中途无法 tuna（部分房 no_fight），靠 heal_up */
	catch(me->heal_up());
	if (!grind_jingli_too_low(me)) return 1;

	/*
	 * 切勿只抬到 max/10+1：go 过关后还会扣 env cost*2，
	 * 下一间会立刻再精疲力尽，表现为「走到野林就卡住」。
	 */
	max = (int)me->query("max_jingli");
	if (max < 1) return 1;
	need = max * 60 / 100;
	if (need < max / 10 + 20)
		need = max / 10 + 20;
	if (need > max) need = max;
	if (objectp(environment(me))) {
		cost = (int)environment(me)->query("cost") * 2;
		if (need < cost + max / 10 + 5)
			need = cost + max / 10 + 5;
		if (need > max) need = max;
	}
	if ((int)me->query("jingli") < need)
		me->set("jingli", need);
	return !grind_jingli_too_low(me);
}

/* 沿路径迈一步。1=已走动或到站，-1=精力不足，-2=busy，0=其它原因未动 */
int grind_step_or_rest(object me, mapping cfg)
{
	string before;

	if (!objectp(me) || !mapp(cfg) || !environment(me)) return 0;
	if (!living(me)) return -2;
	if (me->is_busy() && !me->is_fighting()) {
		/* 打坐/吐纳中开挂机：先停手再赶路，否则会一直「无反应」 */
		me->force_me("halt");
		if (me->is_busy()) return -2;
	}
	/* 持粥卡在大洞：先处理再走，否则会无限「改道」 */
	if (!grind_dispose_zhou(me)
	 && PATHD->room_path(environment(me)) == "/d/xiakedao/dadong") {
		WEBD->send_assist_status(me, 1, "挂机中 · 请先喝掉腊八粥再出门");
		return -2;
	}
	/* 先补精力再走：否则 go 失败后手动出口也同样失灵 */
	if (arrayp(cfg["path"]) && sizeof(cfg["path"]) && grind_jingli_too_low(me)) {
		if (!grind_try_recover_jingli(me))
			return -1;
	}
	before = PATHD->room_path(environment(me));
	grind_follow_path(me, cfg);
	if (PATHD->room_path(environment(me)) != before) {
		cfg["stuck"] = 0;
		return 1;
	}
	if (arrayp(cfg["path"]) && sizeof(cfg["path"]) && grind_jingli_too_low(me)) {
		grind_try_recover_jingli(me);
		return -1;
	}
	return 0;
}

/*
 * kill 后目标昏迷时，玩家仍 is_killing，remove_enemy 不会清敌，
 * is_fighting() 一直为真，挂机会卡在「交手中」。丢掉昏迷/不在场的仇敌，
 * 以便 hunt 阶段找下一只活怪。
 */
void grind_drop_invalid_foes(object me)
{
	object *enemies, ob;
	int i;

	if (!objectp(me)) return;
	enemies = me->query_enemy();
	if (!arrayp(enemies) || !sizeof(enemies)) return;
	enemies = enemies + ({});
	for (i = 0; i < sizeof(enemies); i++) {
		ob = enemies[i];
		if (!objectp(ob)
		 || !living(ob)
		 || environment(ob) != environment(me))
			me->remove_killer(ob);
	}
}

/* 对已找到的活怪开战（避免 present(id) 先命中同名昏迷体） */
void grind_engage(object me, object target)
{
	if (!objectp(me) || !objectp(target)) return;
	if (!living(target) || environment(target) != environment(me)) return;
	message_vision("\n$N对著$n喝道：「今日不是你死就是我活！」\n\n", me, target);
	me->kill_ob(target);
	if (!userp(target)) {
		catch(call_other(target, "accept_kill", me));
		if (!function_exists("is_grpfight", target) || !target->is_grpfight())
			target->kill_ob(me);
	}
}

void grind_tick(string id)
{
	mixed err;

	if (undefinedp(sessions[id])) return;
	err = catch(do_grind_tick(id));
	if (err) {
		/* 单次动作异常（加载失败等）勿掐断整个挂机心跳 */
		if (!undefinedp(sessions[id])) {
			object me;
			me = find_player(id);
			if (objectp(me))
				WEBD->send_assist_status(me, 1, "挂机中 · 动作受阻，重试中");
			call_out("grind_tick", 3, id);
		}
	}
}

void do_grind_tick(string id)
{
	object me, env, target, dadong, foe;
	object *enemies;
	mapping cfg, my;
	string phase, target_key, home, dest;
	int pct, max_qi, max_jing, eff_pct, ei, keep_fight;
	string *path;

	if (undefinedp(sessions[id])) return;
	me = find_player(id);
	if (!objectp(me)) {
		map_delete(sessions, id);
		return;
	}

	cfg = sessions[id];
	if (cfg["kind"] != "grind") return;

	cfg["ticks"]++;
	if (cfg["ticks"] > MAX_GRIND_TICKS) {
		stop_assist(me, "挂机时长已达上限");
		return;
	}

	phase = cfg["phase"];
	if (!living(me)) {
		/* 睡觉中 living 一般仍为真；若驱动判定不同，休整睡觉时不要当昏迷停挂机 */
		if (phase == "recover_sleep" || assist_is_sleeping(me)) {
			cfg["slept"] = 1;
			sessions[id] = cfg;
			WEBD->send_assist_status(me, 1, "挂机中 · 休息室睡觉中");
			call_out("grind_tick", 4, id);
			return;
		}
		stop_assist(me, "挂机停止 · 你已力尽昏迷，请先恢复再挂机");
		return;
	}

	env = environment(me);
	if (!objectp(env) || !PATHD->is_xiakedao(env)) {
		stop_assist(me, "已离开侠客岛，练级停止");
		return;
	}

	target_key = cfg["target_key"];
	my = me->query_entire_dbase();
	max_qi = my["max_qi"];
	max_jing = my["max_jing"];
	if (max_qi < 1) max_qi = 1;
	if (max_jing < 1) max_jing = 1;
	pct = my["qi"] * 100 / max_qi;

	switch (phase) {
	case "hunt":
		grind_drop_invalid_foes(me);
		if (me->is_fighting()) {
			/* 赶路途中误入战斗（如野林乌鸦）勿卡死在「交手中」，清掉非目标继续走 */
			if (!PATHD->is_spawn_room(env, target_key)) {
				keep_fight = 0;
				enemies = me->query_enemy();
				if (arrayp(enemies)) {
					enemies = enemies + ({});
					for (ei = 0; ei < sizeof(enemies); ei++) {
						foe = enemies[ei];
						if (objectp(foe)
						 && living(foe)
						 && environment(foe) == env
						 && PATHD->grind_target_match(foe, target_key))
							keep_fight = 1;
						else if (objectp(foe))
							me->remove_killer(foe);
					}
				}
				if (!keep_fight && !me->is_fighting()) {
					/* fall through to path walking */
				} else 				if (keep_fight) {
					if (pct <= cfg["low_hp"]) {
						if (grind_try_yun_recover(me, cfg["low_hp"])) {
							sessions[id] = cfg;
							WEBD->send_assist_status(me, 1, "挂机中 · 运功回气");
							WEBD->notify_vitals(me);
							call_out("grind_tick", 1, id);
							return;
						}
						grind_begin_retreat(me, cfg);
						sessions[id] = cfg;
						WEBD->notify_vitals(me);
						call_out("grind_tick", 1, id);
						return;
					}
					cfg["phase"] = "fight";
					if (!stringp(cfg["home"]) || cfg["home"] == "")
						cfg["home"] = PATHD->room_path(env);
					sessions[id] = cfg;
					WEBD->send_assist_status(me, 1, "挂机中 · 交手中");
					call_out("grind_tick", 1, id);
					return;
				}
			} else {
				if (pct <= cfg["low_hp"]) {
					if (grind_try_yun_recover(me, cfg["low_hp"])) {
						sessions[id] = cfg;
						WEBD->send_assist_status(me, 1, "挂机中 · 运功回气");
						WEBD->notify_vitals(me);
						call_out("grind_tick", 1, id);
						return;
					}
					grind_begin_retreat(me, cfg);
					sessions[id] = cfg;
					WEBD->notify_vitals(me);
					call_out("grind_tick", 1, id);
					return;
				}
				cfg["phase"] = "fight";
				if (!stringp(cfg["home"]) || cfg["home"] == "")
					cfg["home"] = PATHD->room_path(env);
				sessions[id] = cfg;
				WEBD->send_assist_status(me, 1, "挂机中 · 交手中");
				call_out("grind_tick", 1, id);
				return;
			}
		}
		if (!PATHD->is_spawn_room(env, target_key)) {
			path = cfg["path"];
			if (!arrayp(path) || cfg["path_dest"] != "spawn")
				grind_set_spawn_path(cfg, me, target_key);
			if (!arrayp(cfg["path"]) || !sizeof(cfg["path"])) {
				stop_assist(me, grind_unreachable_spawn_msg(me, target_key));
				return;
			}
			WEBD->send_assist_status(
				me, 1,
				"挂机中 · 前往" + grind_target_label(target_key)
			);
			switch (grind_step_or_rest(me, cfg)) {
			case -1:
				sessions[id] = cfg;
				WEBD->send_assist_status(me, 1, "挂机中 · 精力不足，正在调息");
				WEBD->notify_vitals(me);
				call_out("grind_tick", 3, id);
				return;
			case -2:
				sessions[id] = cfg;
				WEBD->send_assist_status(me, 1, "挂机中 · 忙碌中，稍候赶路");
				call_out("grind_tick", 2, id);
				return;
			case 0:
				/* 同一步走不动：累计后重算路径，避免僵死在「挂机中」 */
				cfg["stuck"] = (int)cfg["stuck"] + 1;
				if (cfg["stuck"] >= 3) {
					grind_set_spawn_path(cfg, me, target_key);
					cfg["stuck"] = 0;
					if (!arrayp(cfg["path"]) || !sizeof(cfg["path"])) {
						stop_assist(me, grind_unreachable_spawn_msg(me, target_key));
						return;
					}
					WEBD->send_assist_status(me, 1, "挂机中 · 改道前往刷怪点");
				}
				sessions[id] = cfg;
				call_out("grind_tick", 2, id);
				return;
			}
			sessions[id] = cfg;
			call_out("grind_tick", 2, id);
			return;
		}
		cfg["home"] = PATHD->room_path(env);
		cfg["path"] = ({});
		target = PATHD->find_grind_target(env, target_key);
		if (objectp(target)) {
			grind_engage(me, target);
			cfg["phase"] = "fight";
			WEBD->send_assist_status(me, 1, "挂机中 · 开战");
			sessions[id] = cfg;
			WEBD->notify_vitals(me);
			call_out("grind_tick", 1, id);
			return;
		}
		/* 本地打光：若其它刷怪点还有同类活怪，换点寻找，不原地干等 */
		path = PATHD->path_to_spawn_with_target(me, target_key, 1);
		if (arrayp(path) && sizeof(path)) {
			cfg["path"] = path;
			cfg["path_dest"] = "spawn";
			WEBD->send_assist_status(me, 1, "挂机中 · 另寻刷怪点");
			if (grind_step_or_rest(me, cfg) == -1) {
				sessions[id] = cfg;
				WEBD->send_assist_status(me, 1, "挂机中 · 精力不足，正在调息");
				WEBD->notify_vitals(me);
				call_out("grind_tick", 4, id);
				return;
			}
			if (me->is_busy()) {
				sessions[id] = cfg;
				WEBD->send_assist_status(me, 1, "挂机中 · 忙碌中，稍候赶路");
				call_out("grind_tick", 2, id);
				return;
			}
			sessions[id] = cfg;
			call_out("grind_tick", 2, id);
			return;
		}
		WEBD->send_assist_status(
			me, 1,
			"挂机中 · 等候" + grind_target_label(target_key) + "刷新"
		);
		sessions[id] = cfg;
		call_out("grind_tick", 3, id);
		return;

	case "fight":
		/* 打晕/打死：清掉无效仇敌后立刻 hunt 下一只 */
		grind_drop_invalid_foes(me);
		if (!me->is_fighting()) {
			cfg["phase"] = "hunt";
			WEBD->send_assist_status(me, 1, "挂机中 · 寻找下一目标");
			sessions[id] = cfg;
			call_out("grind_tick", 1, id);
			return;
		}
		if (pct <= cfg["low_hp"]) {
			if (grind_try_yun_recover(me, cfg["low_hp"])) {
				sessions[id] = cfg;
				WEBD->send_assist_status(me, 1, "挂机中 · 运功回气");
				WEBD->notify_vitals(me);
				call_out("grind_tick", 1, id);
				return;
			}
			grind_begin_retreat(me, cfg);
			sessions[id] = cfg;
			WEBD->notify_vitals(me);
			call_out("grind_tick", 1, id);
			return;
		}
		/* 普攻由 heart_beat/COMBAT_D 推进；此处仅维持 vitals 推送 */
		sessions[id] = cfg;
		WEBD->notify_vitals(me);
		call_out("grind_tick", 1, id);
		return;

	case "retreat":
		if (me->is_fighting()) {
			me->remove_all_killer();
			me->force_me("halt");
		}
		if (me->is_busy()) {
			sessions[id] = cfg;
			call_out("grind_tick", 1, id);
			return;
		}
		if (me->is_fighting()) {
			catch(call_other(GO_CMD, "do_flee", me));
			sessions[id] = cfg;
			call_out("grind_tick", 1, id);
			return;
		}
		dest = grind_recover_dest(me);
		if (PATHD->room_path(env) == dest) {
			if (dest == "/d/xiakedao/xiuxi") {
				cfg["phase"] = "recover_sleep";
				cfg["slept"] = 0;
			} else
				cfg["phase"] = "recover_zhou";
			cfg["path"] = ({});
			sessions[id] = cfg;
			call_out("grind_tick", 1, id);
			return;
		}
		if (!arrayp(cfg["path"]) || cfg["path_dest"] != dest)
			grind_set_path(cfg, me, dest);
		if (!arrayp(cfg["path"]) || !sizeof(cfg["path"])) {
			stop_assist(me, "无法撤回休整处");
			return;
		}
		WEBD->send_assist_status(me, 1, "挂机中 · 撤回休整");
		if (grind_step_or_rest(me, cfg) == -1) {
			sessions[id] = cfg;
			WEBD->send_assist_status(me, 1, "挂机中 · 精力不足，正在调息");
			WEBD->notify_vitals(me);
			call_out("grind_tick", 4, id);
			return;
		}
		sessions[id] = cfg;
		call_out("grind_tick", 2, id);
		return;

	case "recover_zhou":
		if (PATHD->room_path(env) != "/d/xiakedao/dadong") {
			cfg["phase"] = "retreat";
			sessions[id] = cfg;
			call_out("grind_tick", 1, id);
			return;
		}
		if (present("laba zhou", me) || present("zhou", me)) {
			me->force_me("eat laba zhou");
			if (!present("laba zhou", me) && !present("zhou", me)) {
				cfg["phase"] = "return";
				cfg["path"] = ({});
				WEBD->send_assist_status(me, 1, "挂机中 · 体力已恢复");
				sessions[id] = cfg;
				WEBD->notify_vitals(me);
				call_out("grind_tick", 2, id);
				return;
			}
		}
		dadong = env;
		if ((int)dadong->query("food_count") < 1) {
			cfg["phase"] = "recover_sleep";
			cfg["slept"] = 0;
			cfg["path"] = ({});
			WEBD->send_assist_status(me, 1, "挂机中 · 粥已罄尽，改去休息");
			sessions[id] = cfg;
			call_out("grind_tick", 1, id);
			return;
		}
		me->force_me("ask si pu about 腊八粥");
		if (present("laba zhou", me) || present("zhou", me)) {
			me->force_me("eat laba zhou");
			cfg["phase"] = "return";
			cfg["path"] = ({});
			WEBD->send_assist_status(me, 1, "挂机中 · 喝粥恢复");
			sessions[id] = cfg;
			WEBD->notify_vitals(me);
			call_out("grind_tick", 2, id);
			return;
		}
		/* 要粥失败（喝光/已有地上碗等）→ 睡觉 */
		cfg["phase"] = "recover_sleep";
		cfg["slept"] = 0;
		cfg["path"] = ({});
		WEBD->send_assist_status(me, 1, "挂机中 · 改去休息室");
		sessions[id] = cfg;
		call_out("grind_tick", 1, id);
		return;

	case "recover_sleep":
		eff_pct = my["eff_qi"] * 100 / max_qi;
		if (eff_pct < GRIND_WOUND_MIN_PCT) {
			stop_assist(me, "外伤过重，粥已不可用，请先疗伤");
			return;
		}
		if (PATHD->room_path(env) != "/d/xiakedao/xiuxi") {
			if (!arrayp(cfg["path"]) || cfg["path_dest"] != "/d/xiakedao/xiuxi")
				grind_set_path(cfg, me, "/d/xiakedao/xiuxi");
			if (!arrayp(cfg["path"]) || !sizeof(cfg["path"])) {
				stop_assist(me, "无法前往休息室");
				return;
			}
			WEBD->send_assist_status(me, 1, "挂机中 · 前往休息室");
			if (grind_step_or_rest(me, cfg) == -1) {
				sessions[id] = cfg;
				WEBD->send_assist_status(me, 1, "挂机中 · 精力不足，正在调息");
				WEBD->notify_vitals(me);
				call_out("grind_tick", 4, id);
				return;
			}
			sessions[id] = cfg;
			call_out("grind_tick", 2, id);
			return;
		}
		/*
		 * 赶路途中 heal_up 可能已把气/精抬过阈值；仍须真睡一次，
		 * 否则「到休息室立刻回场」完全没恢复。
		 * 先看睡醒恢复，再等睡觉中——wakeup 可能残留 block_msg。
		 */
		if (cfg["slept"]
		 && my["qi"] * 100 / max_qi >= GRIND_RESUME_PCT
		 && my["jing"] * 100 / max_jing >= GRIND_RESUME_PCT) {
			assist_finish_sleep(me);
			cfg["phase"] = "return";
			cfg["path"] = ({});
			cfg["slept"] = 0;
			WEBD->send_assist_status(me, 1, "挂机中 · 睡醒回场");
			sessions[id] = cfg;
			WEBD->notify_vitals(me);
			call_out("grind_tick", 2, id);
			return;
		}
		if (assist_is_sleeping(me)) {
			cfg["slept"] = 1;
			WEBD->send_assist_status(me, 1, "挂机中 · 休息室睡觉中");
			sessions[id] = cfg;
			WEBD->notify_vitals(me);
			call_out("grind_tick", 4, id);
			return;
		}
		if (me->is_busy() || me->is_fighting()) {
			sessions[id] = cfg;
			call_out("grind_tick", 2, id);
			return;
		}
		me->force_me("sleep");
		if (assist_is_sleeping(me))
			cfg["slept"] = 1;
		WEBD->send_assist_status(me, 1, "挂机中 · 休息室睡觉恢复");
		sessions[id] = cfg;
		WEBD->notify_vitals(me);
		call_out("grind_tick", 4, id);
		return;

	case "return":
		if (me->is_fighting()) {
			cfg["phase"] = "fight";
			sessions[id] = cfg;
			call_out("grind_tick", 1, id);
			return;
		}
		if (PATHD->is_spawn_room(env, target_key)) {
			cfg["home"] = PATHD->room_path(env);
			cfg["phase"] = "hunt";
			cfg["path"] = ({});
			sessions[id] = cfg;
			call_out("grind_tick", 1, id);
			return;
		}
		home = cfg["home"];
		if (stringp(home) && home != "" && PATHD->room_path(env) != home) {
			if (!arrayp(cfg["path"]) || cfg["path_dest"] != home)
				grind_set_path(cfg, me, home);
		}
		if (!arrayp(cfg["path"]) || !sizeof(cfg["path"])) {
			grind_set_spawn_path(cfg, me, target_key);
			if (!arrayp(cfg["path"]) || !sizeof(cfg["path"])) {
				stop_assist(me, "无法返回刷怪点");
				return;
			}
		}
		WEBD->send_assist_status(me, 1, "挂机中 · 返回刷怪点");
		if (grind_step_or_rest(me, cfg) == -1) {
			sessions[id] = cfg;
			WEBD->send_assist_status(me, 1, "挂机中 · 精力不足，正在调息");
			WEBD->notify_vitals(me);
			call_out("grind_tick", 4, id);
			return;
		}
		sessions[id] = cfg;
		call_out("grind_tick", 2, id);
		return;

	default:
		stop_assist(me, "挂机状态异常");
		return;
	}
}

int start_grind(object me, string target_key, int low_hp)
{
	string id, why, *spawns, *path;
	mapping cfg;
	object env;

	if (!objectp(me)) return 0;
	env = environment(me);
	if (!objectp(env) || !PATHD->is_xiakedao(env)) {
		WEBD->send_assist_status(me, 0, "仅可在侠客岛挂机");
		return 0;
	}
	if (member_array(target_key, ({
		"monkey", "haigui_s", "haigui", "maque", "wuya",
		"haidao_w", "haidao_s", "haidao_o"
	})) == -1) {
		WEBD->send_assist_status(me, 0, "暂不支持该练级目标");
		return 0;
	}
	spawns = PATHD->spawn_rooms(target_key);
	if (!sizeof(spawns)) {
		WEBD->send_assist_status(me, 0, "没有可用的刷怪点");
		return 0;
	}
	/* 用最近刷怪点校验可达，避免只检查 spawns[0] 误判 */
	path = 0;
	catch(path = PATHD->path_to_nearest_spawn(me, target_key));
	if (!arrayp(path)) {
		why = assist_unreachable_hint(me, spawns[0]);
		WEBD->send_assist_status(me, 0, stringp(why) ? why : grind_unreachable_spawn_msg(me, target_key));
		return 0;
	}
	if (low_hp < 5) low_hp = 5;
	if (low_hp > 80) low_hp = 80;

	id = me->query("id");
	stop_assist(me, 0);

	cfg = ([
		"kind": "grind",
		"phase": "hunt",
		"target_key": target_key,
		"low_hp": low_hp,
		"saved_wimpy": (int)me->query("env/wimpy"),
		"home": "",
		"path": ({}),
		"path_dest": "",
		"stuck": 0,
		"ticks": 0,
	]);
	if (!PATHD->is_spawn_room(env, target_key)) {
		grind_set_spawn_path(cfg, me, target_key);
		if (!arrayp(cfg["path"]) || !sizeof(cfg["path"])) {
			WEBD->send_assist_status(me, 0, grind_unreachable_spawn_msg(me, target_key));
			return 0;
		}
	}
	sessions[id] = cfg;
	/* 心跳层 wimpy：比 grind_tick 更及时地落荒而逃 */
	me->set("env/wimpy", low_hp);
	me->set_temp("web_assist", 1);
	WEBD->mark_web_client(me);
	if (arrayp(cfg["path"]) && sizeof(cfg["path"]))
		WEBD->send_assist_status(me, 1, "挂机中 · 前往" + grind_target_label(target_key));
	else
		WEBD->send_assist_status(me, 1, "挂机中");
	call_out("grind_tick", 1, id);
	return 1;
}

/* 石壁领悟预检：0=可学，1=精不足，其它字符串原因表示应停止 */
mixed study_precheck(object me, string skill)
{
	string bskill;
	int exp, lv, check, learn_basic;

	if (!objectp(me) || !stringp(skill) || skill == "")
		return "领悟目标无效";
	bskill = PATHD->study_bskill(skill);
	if (bskill == "")
		return "暂不支持该石壁武功";

	exp = (int)me->query("combat_exp");
	learn_basic = (exp < 250) || ((int)me->query_skill(bskill, 1) < 10);

	if (learn_basic) {
		lv = (int)me->query_skill(bskill, 1);
		if (lv > 20)
			return "已无法从石壁再领悟";
		check = lv * lv * lv;
		if (check > exp * 10)
			return "实战经验不足，无法领悟";
	} else {
		if ((int)me->query_skill("literate", 1) < 1)
			return "一字不识，看不懂墙上的注解";
		lv = (int)me->query_skill(skill, 1);
		if (lv > 20)
			return "已无法从石壁再领悟";
		check = lv * lv * lv;
		if (check > exp * 10)
			return "实战经验不足，无法领悟";
	}

	if ((int)me->query("jing") < STUDY_MIN_JING)
		return 1;
	return 0;
}

void study_set_path(mapping cfg, object me, string dest)
{
	string *path;

	path = PATHD->path_to_room(me, dest);
	if (!arrayp(path)) path = ({});
	cfg["path"] = path;
	cfg["path_dest"] = dest;
}

int study_follow_path(object me, mapping cfg)
{
	string *path;

	path = cfg["path"];
	if (!arrayp(path) || !sizeof(path)) return 0;
	path = PATHD->advance_path(me, path);
	cfg["path"] = path;
	return sizeof(path) == 0;
}

void study_tick(string id)
{
	object me, env, dadong, guo;
	mapping cfg;
	string phase, skill, wall, dest, why;
	mixed check;
	int jing_before;

	if (undefinedp(sessions[id])) return;
	me = find_player(id);
	if (!objectp(me)) {
		map_delete(sessions, id);
		return;
	}

	cfg = sessions[id];
	if (cfg["kind"] != "study") return;

	cfg["ticks"]++;
	if (cfg["ticks"] > MAX_STUDY_TICKS) {
		stop_assist(me, "挂机时长已达上限");
		return;
	}

	env = environment(me);
	if (!objectp(env) || !PATHD->is_xiakedao(env)) {
		stop_assist(me, "已离开侠客岛，挂机停止");
		return;
	}

	if (me->is_busy() || me->is_fighting()) {
		sessions[id] = cfg;
		call_out("study_tick", 2, id);
		return;
	}
	/* 非休整阶段若残留睡觉屏蔽，清掉以免无法行动 */
	if (assist_is_sleeping(me) && cfg["phase"] != "recover_sleep")
		assist_finish_sleep(me);

	phase = cfg["phase"];
	skill = cfg["skill"];
	wall = cfg["wall"];

	switch (phase) {
	case "go_wall":
		if (PATHD->room_path(env) == wall) {
			cfg["phase"] = "study";
			cfg["path"] = ({});
			sessions[id] = cfg;
			WEBD->send_assist_status(me, 1, "挂机中 · 石壁领悟");
			call_out("study_tick", 1, id);
			return;
		}
		if (!arrayp(cfg["path"]) || cfg["path_dest"] != wall)
			study_set_path(cfg, me, wall);
		if (!arrayp(cfg["path"]) || !sizeof(cfg["path"])) {
			why = assist_unreachable_hint(me, wall);
			stop_assist(me, stringp(why) ? why : "无法前往石室");
			return;
		}
		WEBD->send_assist_status(me, 1, "挂机中 · 前往石室");
		study_follow_path(me, cfg);
		sessions[id] = cfg;
		call_out("study_tick", 2, id);
		return;

	case "study":
		if (PATHD->room_path(env) != wall) {
			cfg["phase"] = "go_wall";
			cfg["path"] = ({});
			sessions[id] = cfg;
			call_out("study_tick", 1, id);
			return;
		}
		check = study_precheck(me, skill);
		if (stringp(check)) {
			stop_assist(me, "挂机停止 · " + check);
			return;
		}
		if (check == 1) {
			if ((int)me->query("combat_exp") > FRUIT_MAX_EXP) {
				cfg["phase"] = "recover_sleep";
				cfg["slept"] = 0;
			} else
				cfg["phase"] = "recover_zhou";
			cfg["path"] = ({});
			sessions[id] = cfg;
			WEBD->send_assist_status(
				me, 1,
				(int)me->query("combat_exp") > FRUIT_MAX_EXP
					? "挂机中 · 精神不足，去休息室睡觉"
					: "挂机中 · 精神不足，去恢复"
			);
			call_out("study_tick", 1, id);
			return;
		}
		/* study wall 经 call_out 异步扣精，下一 tick 再预检 */
		me->force_me("study wall");
		WEBD->notify_vitals(me);
		WEBD->send_assist_status(me, 1, "挂机中 · 石壁领悟");
		sessions[id] = cfg;
		call_out("study_tick", 2, id);
		return;

	case "recover_zhou":
		dest = "/d/xiakedao/dadong";
		if ((int)me->query("combat_exp") > FRUIT_MAX_EXP) {
			cfg["phase"] = "recover_sleep";
			cfg["slept"] = 0;
			cfg["path"] = ({});
			sessions[id] = cfg;
			WEBD->send_assist_status(me, 1, "挂机中 · 改去休息室睡觉");
			call_out("study_tick", 1, id);
			return;
		}
		if (PATHD->room_path(env) != dest) {
			if (!arrayp(cfg["path"]) || cfg["path_dest"] != dest)
				study_set_path(cfg, me, dest);
			if (!arrayp(cfg["path"]) || !sizeof(cfg["path"])) {
				cfg["phase"] = "recover_fruit";
				cfg["path"] = ({});
				sessions[id] = cfg;
				WEBD->send_assist_status(me, 1, "挂机中 · 无法取粥，改摘野果");
				call_out("study_tick", 1, id);
				return;
			}
			WEBD->send_assist_status(me, 1, "挂机中 · 前往大洞取粥");
			study_follow_path(me, cfg);
			sessions[id] = cfg;
			call_out("study_tick", 2, id);
			return;
		}
		if (present("laba zhou", me) || present("zhou", me)) {
			me->force_me("eat laba zhou");
			if (!present("laba zhou", me) && !present("zhou", me)
			 && (int)me->query("jing") >= STUDY_MIN_JING) {
				cfg["phase"] = "go_wall";
				cfg["path"] = ({});
				sessions[id] = cfg;
				WEBD->send_assist_status(me, 1, "挂机中 · 喝粥恢复");
				WEBD->notify_vitals(me);
				call_out("study_tick", 2, id);
				return;
			}
		}
		dadong = env;
		if ((int)dadong->query("food_count") < 1) {
			cfg["phase"] = "recover_fruit";
			cfg["path"] = ({});
			sessions[id] = cfg;
			WEBD->send_assist_status(me, 1, "挂机中 · 粥已罄尽，改摘野果");
			call_out("study_tick", 1, id);
			return;
		}
		me->force_me("ask si pu about 腊八粥");
		if (present("laba zhou", me) || present("zhou", me)) {
			me->force_me("eat laba zhou");
			if (!present("laba zhou", me) && !present("zhou", me)
			 && (int)me->query("jing") >= STUDY_MIN_JING) {
				cfg["phase"] = "go_wall";
				cfg["path"] = ({});
				sessions[id] = cfg;
				WEBD->send_assist_status(me, 1, "挂机中 · 喝粥恢复");
				WEBD->notify_vitals(me);
				call_out("study_tick", 2, id);
				return;
			}
		}
		cfg["phase"] = "recover_fruit";
		cfg["path"] = ({});
		sessions[id] = cfg;
		WEBD->send_assist_status(me, 1, "挂机中 · 要粥失败，改摘野果");
		call_out("study_tick", 1, id);
		return;

	case "recover_fruit":
		if ((int)me->query("combat_exp") > FRUIT_MAX_EXP) {
			cfg["phase"] = "recover_sleep";
			cfg["slept"] = 0;
			cfg["path"] = ({});
			sessions[id] = cfg;
			WEBD->send_assist_status(me, 1, "挂机中 · 改去休息室睡觉");
			call_out("study_tick", 1, id);
			return;
		}
		/* 已在树上或身上有果 */
		if (PATHD->room_path(env) == "/d/xiakedao/tree1") {
			if (!present("ye guo", me) && !present("guo", me))
				me->force_me("zhai");
			guo = present("ye guo", me);
			if (!objectp(guo)) guo = present("guo", me);
			if (!objectp(guo)) {
				stop_assist(me, "挂机停止 · 摘不到野果");
				return;
			}
			jing_before = (int)me->query("jing");
			me->force_me("eat guo");
			if ((int)me->query("jing") <= jing_before) {
				stop_assist(me, "挂机停止 · 无法靠野果恢复");
				return;
			}
			me->force_me("pa down");
			cfg["phase"] = "go_wall";
			cfg["path"] = ({});
			sessions[id] = cfg;
			WEBD->send_assist_status(me, 1, "挂机中 · 吃果恢复");
			WEBD->notify_vitals(me);
			call_out("study_tick", 2, id);
			return;
		}
		if (present("ye guo", me) || present("guo", me)) {
			jing_before = (int)me->query("jing");
			me->force_me("eat guo");
			if ((int)me->query("jing") <= jing_before) {
				stop_assist(me, "挂机停止 · 无法靠野果恢复");
				return;
			}
			cfg["phase"] = "go_wall";
			cfg["path"] = ({});
			sessions[id] = cfg;
			WEBD->send_assist_status(me, 1, "挂机中 · 吃果恢复");
			WEBD->notify_vitals(me);
			call_out("study_tick", 2, id);
			return;
		}
		dest = "/d/xiakedao/tree1";
		if (!arrayp(cfg["path"]) || cfg["path_dest"] != dest)
			study_set_path(cfg, me, dest);
		if (!arrayp(cfg["path"]) || !sizeof(cfg["path"])) {
			stop_assist(me, "挂机停止 · 无法前往山顶摘果");
			return;
		}
		WEBD->send_assist_status(me, 1, "挂机中 · 上山摘野果");
		study_follow_path(me, cfg);
		sessions[id] = cfg;
		call_out("study_tick", 2, id);
		return;

	case "recover_sleep":
		dest = "/d/xiakedao/xiuxi";
		if (PATHD->room_path(env) != dest) {
			if (!arrayp(cfg["path"]) || cfg["path_dest"] != dest)
				study_set_path(cfg, me, dest);
			if (!arrayp(cfg["path"]) || !sizeof(cfg["path"])) {
				stop_assist(me, "挂机停止 · 无法前往休息室");
				return;
			}
			WEBD->send_assist_status(me, 1, "挂机中 · 前往休息室睡觉");
			study_follow_path(me, cfg);
			sessions[id] = cfg;
			call_out("study_tick", 2, id);
			return;
		}
		/*
		 * 赶路途中精神可能已自然回升到 STUDY_MIN_JING；仍须真睡，
		 * 否则「到休息室立刻回石室」几乎没恢复。
		 * 注意：先看睡醒恢复，再等睡觉中——wakeup 可能残留 block_msg。
		 */
		if (cfg["slept"] && (int)me->query("jing") >= study_resume_jing(me)) {
			assist_finish_sleep(me);
			cfg["phase"] = "go_wall";
			cfg["path"] = ({});
			cfg["slept"] = 0;
			sessions[id] = cfg;
			WEBD->send_assist_status(me, 1, "挂机中 · 睡醒返回石室");
			WEBD->notify_vitals(me);
			call_out("study_tick", 2, id);
			return;
		}
		if (assist_is_sleeping(me)) {
			cfg["slept"] = 1;
			WEBD->send_assist_status(me, 1, "挂机中 · 休息室睡觉中");
			sessions[id] = cfg;
			WEBD->notify_vitals(me);
			call_out("study_tick", 4, id);
			return;
		}
		me->force_me("sleep");
		if (assist_is_sleeping(me))
			cfg["slept"] = 1;
		WEBD->send_assist_status(me, 1, "挂机中 · 休息室睡觉恢复");
		sessions[id] = cfg;
		WEBD->notify_vitals(me);
		call_out("study_tick", 4, id);
		return;

	default:
		stop_assist(me, "挂机状态异常");
		return;
	}
}

/* 落点沙滩等无出口房间：寻路不可达，启动前给出明确提示 */
string assist_unreachable_hint(object me, string dest)
{
	string here, *path;
	mapping exits;

	if (!objectp(me) || !environment(me) || !stringp(dest) || dest == "")
		return "当前位置无法挂机寻路";
	here = PATHD->room_path(environment(me));
	if (here == dest) return 0;
	path = 0;
	catch(path = PATHD->path_to_room(me, dest));
	if (arrayp(path)) return 0;
	if ((int)me->query("block")
	 || here == "/d/xiakedao/shatan1"
	 || here == "/d/xiakedao/shatan3")
		return "请先跟随张三或李四离开落点沙滩";
	exits = environment(me)->query("exits");
	if (!mapp(exits) || !sizeof(exits))
		return "请先跟随张三或李四离开落点沙滩";
	return "无法前往目标地点";
}

int start_study(object me, string skill)
{
	string id, wall, why;
	mapping cfg;
	object env;
	string *path;

	if (!objectp(me)) return 0;
	env = environment(me);
	if (!objectp(env) || !PATHD->is_xiakedao(env)) {
		WEBD->send_assist_status(me, 0, "仅可在侠客岛挂机");
		return 0;
	}
	wall = PATHD->study_wall_room(skill);
	if (!stringp(wall) || wall == "") {
		WEBD->send_assist_status(me, 0, "暂不支持该石壁武功");
		return 0;
	}
	why = assist_unreachable_hint(me, wall);
	if (stringp(why)) {
		WEBD->send_assist_status(me, 0, why);
		return 0;
	}

	id = me->query("id");
	stop_assist(me, 0);

	path = PATHD->path_to_room(me, wall);
	if (!arrayp(path)) path = ({});
	cfg = ([
		"kind": "study",
		"phase": "go_wall",
		"skill": skill,
		"wall": wall,
		"path": path,
		"path_dest": wall,
		"ticks": 0,
	]);
	sessions[id] = cfg;
	me->set_temp("web_assist", 1);
	WEBD->mark_web_client(me);
	WEBD->send_assist_status(me, 1, "挂机中 · 前往石室");
	call_out("study_tick", 1, id);
	return 1;
}

void player_quit(object me)
{
	if (objectp(me)) stop_assist(me, 0);
}

// P1: heal/eat when low — stub for phase 4
int try_survival(object me)
{
	object ob;
	if (!objectp(me)) return 0;
	if (me->query("qi") * 100 / me->query("max_qi") > 40) return 0;
	ob = present("jin chuang yao", me);
	if (!ob) ob = present("金创药", me);
	if (objectp(ob)) {
		me->force_me("eat " + file_name(ob));
		return 1;
	}
	WEBD->send_assist_status(me, 0, "无药品可用，已停止");
	stop_assist(me, 0);
	return 0;
}
