// assistd.c — official AFK assist (no player scripting)

#include <ansi.h>
#include <skill.h>

#define WEBD "/adm/daemons/webd"
#define MAX_TRAIN_TICKS 500
#define MAX_LEARN_TICKS 999
#define MAX_COMBAT_TICKS 2000

// Minimum resources to attempt one round (match cmds/skill thresholds).
#define DAZUO_MIN_QI 30
#define TUNA_MIN_JING 30
#define LIAN_MIN_JINGLI 30
#define LIAN_MIN_NEILI 20

inherit F_DBASE;

mapping sessions;

void create()
{
	seteuid(getuid());
	sessions = ([]);
}

void stop_assist(object me, string reason)
{
	string id;

	if (!objectp(me)) return;
	id = me->query("id");
	if (!undefinedp(sessions[id]))
		map_delete(sessions, id);
	me->delete_temp("web_assist");
	WEBD->send_assist_status(me, 0, reason || "已停止");
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

int learn_gin_cost(object me)
{
	int intel, cost;

	intel = me->query_int();
	if (intel < 1) intel = 1;
	cost = 150 / intel;
	if (!me->query_skill(me->query_temp("web_learn_skill"), 1)) cost *= 2;
	cost = cost * 3 / 2;
	if (cost < 1) cost = 1;
	return cost;
}

void learn_tick(string id)
{
	object me, teacher;
	mapping cfg;
	string reason, cmd;
	int cost, result;

	if (undefinedp(sessions[id])) return;
	me = find_player(id);
	if (!objectp(me)) {
		map_delete(sessions, id);
		return;
	}
	cfg = sessions[id];
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

	me->set_temp("web_learn_skill", cfg["skill"]);
	cost = learn_gin_cost(me);
	me->delete_temp("web_learn_skill");
	if ((int)me->query("jing") <= cost
	 || (int)teacher->query("jing") <= cost / 5 + 1) {
		cfg["resting"] = 1;
		sessions[id] = cfg;
		WEBD->send_assist_status(
			me, 1,
			(int)me->query("jing") <= cost
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

	cmd = "learn " + cfg["teacher"] + " " + cfg["skill"] + " 1";
	result = me->force_me(cmd);
	if (!result) {
		stop_assist(me, "当前条件不允许继续学习");
		return;
	}
	cfg["ticks"]++;
	if (cfg["stop_when"] == "count") cfg["remaining"]--;
	sessions[id] = cfg;
	WEBD->send_vitals(me);
	WEBD->send_assist_status(
		me, 1, sprintf("学艺中 · 已学 %d 次", cfg["ticks"])
	);
	if (cfg["ticks"] >= MAX_LEARN_TICKS) {
		stop_assist(me, "学习次数已达上限");
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
	stop_assist(me, "无药品");
	return 0;
}
