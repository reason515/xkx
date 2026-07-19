// assistd.c — official AFK assist (no player scripting)

#include <ansi.h>
#include <skill.h>

#define WEBD "/adm/daemons/webd"
#define PATHD "/adm/daemons/xkd_pathd"
#define MAX_TRAIN_TICKS 500
#define MAX_LEARN_TICKS 999
#define MAX_COMBAT_TICKS 2000
#define MAX_GRIND_TICKS 3000
#define MAX_STUDY_TICKS 3000
#define GRIND_RESUME_PCT 80
#define GRIND_WOUND_MIN_PCT 60
#define DADONG_EXP_KICK 10000
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
void study_tick(string id);

void create()
{
	seteuid(getuid());
	sessions = ([]);
}

void stop_assist(object me, string reason)
{
	string id;
	int had;

	if (!objectp(me)) return;
	id = me->query("id");
	had = !undefinedp(sessions[id]);
	if (had) map_delete(sessions, id);
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

string grind_recover_dest(object me)
{
	if (!objectp(me)) return "/d/xiakedao/dadong";
	if ((int)me->query("combat_exp") > DADONG_EXP_KICK)
		return "/d/xiakedao/xiuxi";
	return "/d/xiakedao/dadong";
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

	/* 优先去仍有活怪的刷怪点；都没有再退回最近刷怪房 */
	path = PATHD->path_to_spawn_with_target(me, target_key, 0);
	if (!arrayp(path) || !sizeof(path))
		path = PATHD->path_to_nearest_spawn(me, target_key);
	if (!arrayp(path)) path = ({});
	cfg["path"] = path;
	cfg["path_dest"] = "spawn";
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
	object me, env, target, dadong;
	mapping cfg, my;
	string phase, target_key, home, dest;
	int pct, max_qi, max_jing, eff_pct;
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

	env = environment(me);
	if (!objectp(env) || !PATHD->is_xiakedao(env)) {
		stop_assist(me, "已离开侠客岛，练级停止");
		return;
	}

	phase = cfg["phase"];
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
			cfg["phase"] = "fight";
			if (!stringp(cfg["home"]) || cfg["home"] == "")
				cfg["home"] = PATHD->room_path(env);
			sessions[id] = cfg;
			WEBD->send_assist_status(me, 1, "挂机中 · 交手中");
			call_out("grind_tick", 1, id);
			return;
		}
		if (!PATHD->is_spawn_room(env, target_key)) {
			path = cfg["path"];
			if (!arrayp(path) || cfg["path_dest"] != "spawn")
				grind_set_spawn_path(cfg, me, target_key);
			if (!arrayp(cfg["path"]) || !sizeof(cfg["path"])) {
				stop_assist(me, "无法前往刷怪点");
				return;
			}
			WEBD->send_assist_status(me, 1, "挂机中 · 前往刷怪点");
			grind_follow_path(me, cfg);
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
			grind_follow_path(me, cfg);
			sessions[id] = cfg;
			call_out("grind_tick", 2, id);
			return;
		}
		WEBD->send_assist_status(me, 1, "挂机中 · 等候刷新");
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
			me->force_me("halt");
			if (!stringp(cfg["home"]) || cfg["home"] == "")
				cfg["home"] = PATHD->room_path(env);
			cfg["phase"] = "retreat";
			cfg["path"] = ({});
			WEBD->send_assist_status(me, 1, "挂机中 · 撤回休整");
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
			me->force_me("halt");
			sessions[id] = cfg;
			call_out("grind_tick", 1, id);
			return;
		}
		dest = grind_recover_dest(me);
		if (PATHD->room_path(env) == dest) {
			if (dest == "/d/xiakedao/xiuxi")
				cfg["phase"] = "recover_sleep";
			else
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
		grind_follow_path(me, cfg);
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
			grind_follow_path(me, cfg);
			sessions[id] = cfg;
			call_out("grind_tick", 2, id);
			return;
		}
		if (my["qi"] * 100 / max_qi >= GRIND_RESUME_PCT
		 && my["jing"] * 100 / max_jing >= GRIND_RESUME_PCT) {
			cfg["phase"] = "return";
			cfg["path"] = ({});
			WEBD->send_assist_status(me, 1, "挂机中 · 睡醒回场");
			sessions[id] = cfg;
			WEBD->notify_vitals(me);
			call_out("grind_tick", 2, id);
			return;
		}
		if (!me->is_busy())
			me->force_me("sleep");
		WEBD->send_assist_status(me, 1, "挂机中 · 休息室调息");
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
		grind_follow_path(me, cfg);
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
	string id;
	mapping cfg;
	object env;

	if (!objectp(me)) return 0;
	env = environment(me);
	if (!objectp(env) || !PATHD->is_xiakedao(env)) {
		WEBD->send_assist_status(me, 0, "仅可在侠客岛挂机");
		return 0;
	}
	if (member_array(target_key, ({
		"monkey", "haigui_s", "haigui", "haidao_w", "haidao_s", "haidao_o"
	})) == -1) {
		WEBD->send_assist_status(me, 0, "暂不支持该练级目标");
		return 0;
	}
	if (!sizeof(PATHD->spawn_rooms(target_key))) {
		WEBD->send_assist_status(me, 0, "没有可用的刷怪点");
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
		"home": "",
		"path": ({}),
		"path_dest": "",
		"ticks": 0,
	]);
	sessions[id] = cfg;
	me->set_temp("web_assist", 1);
	WEBD->mark_web_client(me);
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
	string phase, skill, wall, dest;
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
			stop_assist(me, "无法前往石室");
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
			if ((int)me->query("combat_exp") > DADONG_EXP_KICK)
				cfg["phase"] = "recover_fruit";
			else
				cfg["phase"] = "recover_zhou";
			cfg["path"] = ({});
			sessions[id] = cfg;
			WEBD->send_assist_status(me, 1, "挂机中 · 精神不足，去恢复");
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
		if ((int)me->query("combat_exp") > DADONG_EXP_KICK) {
			cfg["phase"] = "recover_fruit";
			cfg["path"] = ({});
			sessions[id] = cfg;
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
			/* 高经验进洞被踢回沙滩 */
			if (PATHD->room_path(environment(me)) != dest
			 && PATHD->room_path(environment(me)) != PATHD->room_path(env)
			 && (int)me->query("combat_exp") > DADONG_EXP_KICK) {
				cfg["phase"] = "recover_fruit";
				cfg["path"] = ({});
			}
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
			stop_assist(me, "挂机停止 · 无法恢复精神（粥不可用且不能吃野果）");
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

	default:
		stop_assist(me, "挂机状态异常");
		return;
	}
}

int start_study(object me, string skill)
{
	string id, wall;
	mapping cfg;
	object env;

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

	id = me->query("id");
	stop_assist(me, 0);

	cfg = ([
		"kind": "study",
		"phase": "go_wall",
		"skill": skill,
		"wall": wall,
		"path": ({}),
		"path_dest": "",
		"ticks": 0,
	]);
	sessions[id] = cfg;
	me->set_temp("web_assist", 1);
	WEBD->mark_web_client(me);
	WEBD->send_assist_status(me, 1, "挂机中 · 石壁领悟");
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
