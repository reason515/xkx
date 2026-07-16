// assistd.c — official AFK assist (no player scripting)

#include <ansi.h>

#define WEBD "/adm/daemons/webd"
#define MAX_TRAIN_TICKS 500
#define MAX_COMBAT_TICKS 2000

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

void train_tick(string id)
{
	object me;
	mapping cfg;
	string cmd;

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

	switch (cfg["mode"]) {
	case "dazuo":
		cmd = "dazuo 30";
		break;
	case "tuna":
		cmd = "tuna 30";
		break;
	case "lian":
		cmd = "lian " + (cfg["skill"] || "force") + " 1";
		break;
	default:
		stop_assist(me, "未知修炼模式");
		return;
	}

	if (cfg["stop_when"] == "count")
		cfg["remaining"]--;

	me->force_me(cmd);
	WEBD->send_vitals(me);
	call_out("train_tick", 2, id);
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

int start_train(object me, string mode, string stop_when, int count, int stop_combat)
{
	string id;
	mapping cfg;

	if (!objectp(me)) return 0;
	id = me->query("id");
	stop_assist(me, 0);

	cfg = ([
		"kind": "train",
		"mode": mode,
		"stop_when": stop_when,
		"remaining": count,
		"stop_combat": stop_combat,
		"ticks": 0,
	]);
	sessions[id] = cfg;
	me->set_temp("web_assist", 1);
	WEBD->mark_web_client(me);
	WEBD->send_assist_status(me, 1, "修炼助手进行中");
	call_out("train_tick", 1, id);
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
