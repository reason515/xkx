// webassist.c — Web official assist control (players only)

#include <ansi.h>

#define ASSIST_D "/adm/daemons/assistd"
#define WEBD "/adm/daemons/webd"

inherit F_CLEAN_UP;

int main(object me, string arg)
{
	string mode, stop_when, action, teacher, skill;
	int count, stop_combat, low_hp;

	if (!arg) return notify_fail("用法：webassist train|learn|combat|grind|study ...\n");

	WEBD->mark_web_client(me);

	if (arg == "stop") {
		ASSIST_D->stop_assist(me, "手动停止");
		return 1;
	}

	if (sscanf(arg, "train lian count %d %d %s",
		   count, stop_combat, skill) == 3) {
		if (count < 1) count = 1;
		if (count > 999) count = 999;
		ASSIST_D->start_train(me, "lian", "count", count, stop_combat, skill);
		return 1;
	}

	if (sscanf(arg, "train %s %s %d %d", mode, stop_when, count, stop_combat) >= 2) {
		if (member_array(mode, ({ "dazuo", "tuna", "lian" })) == -1)
			return notify_fail("修炼模式无效。\n");
		if (member_array(stop_when, ({ "full", "count", "potential" })) == -1)
			stop_when = "full";
		ASSIST_D->start_train(me, mode, stop_when, count, stop_combat, 0);
		return 1;
	}

	if (sscanf(arg, "learn %s %s %s %d %d",
		   teacher, skill, stop_when, count, stop_combat) == 5) {
		if (stop_when != "count" && stop_when != "potential")
			return notify_fail("学艺停止条件无效。\n");
		if (count < 1) count = 1;
		if (count > 999) count = 999;
		ASSIST_D->start_learn(me, teacher, skill, stop_when, count, stop_combat);
		return 1;
	}

	if (sscanf(arg, "combat %d %s", low_hp, action) == 2) {
		if (member_array(action, ({ "warn", "flee", "stop" })) == -1)
			action = "flee";
		if (low_hp < 5) low_hp = 5;
		if (low_hp > 80) low_hp = 80;
		ASSIST_D->start_combat(me, low_hp, action);
		return 1;
	}

	if (sscanf(arg, "grind %s %d", action, low_hp) == 2) {
		if (low_hp < 5) low_hp = 5;
		if (low_hp > 80) low_hp = 80;
		ASSIST_D->start_grind(me, action, low_hp);
		return 1;
	}

	if (sscanf(arg, "study %s", skill) == 1) {
		ASSIST_D->start_study(me, skill);
		return 1;
	}

	return notify_fail("参数无法识别。\n");
}

int help(object me)
{
	write(@HELP
Web 挂机助手（官方，非脚本）：

webassist train dazuo full 0 1   — 打坐至近满，遇战停
webassist train lian count 10 1    — 练功 10 次
webassist learn dizi strike count 10 1 — 向弟子学掌法 10 次（一次 learn N）
webassist learn shi literate potential 1 1 — 读书至潜能耗尽（按精批量 learn）
webassist combat 30 flee         — 自动普攻，低于 30% 逃跑
webassist grind haigui_s 30      — 挂机打怪（monkey|haigui_s|haigui|maque|wuya|haidao_*）
webassist study taixuan-gong     — 侠客岛石壁领悟太玄功
webassist stop                   — 停止

HELP);
	return 1;
}
