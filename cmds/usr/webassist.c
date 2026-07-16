// webassist.c — Web official assist control (players only)

#include <ansi.h>

#define ASSIST_D "/adm/daemons/assistd"
#define WEBD "/adm/daemons/webd"

inherit F_CLEAN_UP;

int main(object me, string arg)
{
	string mode, stop_when, action;
	int count, stop_combat, low_hp;

	if (!arg) return notify_fail("用法：webassist train <dazuo|tuna|lian> <full|count|potential> [次数] [遇战停]\n");

	WEBD->mark_web_client(me);

	if (arg == "stop") {
		ASSIST_D->stop_assist(me, "手动停止");
		return 1;
	}

	if (sscanf(arg, "train %s %s %d %d", mode, stop_when, count, stop_combat) >= 2) {
		if (member_array(mode, ({ "dazuo", "tuna", "lian" })) == -1)
			return notify_fail("修炼模式无效。\n");
		if (member_array(stop_when, ({ "full", "count", "potential" })) == -1)
			stop_when = "full";
		ASSIST_D->start_train(me, mode, stop_when, count, stop_combat);
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

	return notify_fail("参数无法识别。\n");
}

int help(object me)
{
	write(@HELP
Web 挂机助手（官方，非脚本）：

webassist train dazuo full 0 1   — 打坐至近满，遇战停
webassist train lian count 10 1    — 练功 10 次
webassist combat 30 flee         — 自动普攻，低于 30% 逃跑
webassist stop                   — 停止

HELP);
	return 1;
}
