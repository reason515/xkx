// quest_task.c — 新手任务框架（悬赏类）
// 为 xkx2001 自建：pkuxkx 的 quest.h/new_quest 均为门派任务（需 family），
// quest.c 为 vworld 书本用，均不适合无门派新手。
// 本框架让任意 NPC 发布"杀怪悬赏"任务：ask 任务 → 杀怪 → 完成 → 领奖。
// 宿主 NPC 需在 inquiry 中挂接：任务/job → ask_task；完成/report → do_report；放弃 → do_giveup
// 杀怪完成判定由 combatd.c killer_reward 调用 F_QUEST_TASK->quest_kill() 完成

#include <ansi.h>

// 任务配置：宿主 NPC 可覆盖 quest_list() 提供自定义任务表
mapping *quest_list()
{
	return ({
		(["target" : "liu mang", "name" : "流氓", "area" : "扬州广场", "exp" : 200, "pot" : 20, "money" : 100]),
		(["target" : "yz dog", "name" : "野狗", "area" : "扬州磨坊附近", "exp" : 200, "pot" : 20, "money" : 100]),
		(["target" : "yz boar", "name" : "野猪", "area" : "扬州野猪林", "exp" : 300, "pot" : 30, "money" : 150]),
		(["target" : "yz bandit", "name" : "强盗", "area" : "扬州匪窝", "exp" : 400, "pot" : 40, "money" : 200]),
		(["target" : "liu mang tou", "name" : "流氓头", "area" : "扬州广场", "exp" : 500, "pot" : 50, "money" : 250]),
	});
}

// 玩家接任务
string ask_task()
{
	object me = this_player();
	mapping *qs, q;
	int i, bonus, lianxu;

	if (!userp(me))
		return 0;
	if (me->query_temp("quest_task"))
		return "你不是还有任务没完成吗？先去把事情办妥了再来。";

	qs = quest_list();
	if (!sizeof(qs))
		return "现在没有什么任务，你稍后再来。";

	q = qs[random(sizeof(qs))];
	// 连续完成任务加成
	lianxu = me->query("quest_task/lianxu");
	bonus = 100 + (lianxu > 5 ? 50 : lianxu * 10);
	q["exp"] = q["exp"] * bonus / 100;
	q["pot"] = q["pot"] * bonus / 100;
	q["money"] = q["money"] * bonus / 100;

	q["quest_type"] = "kill";
	me->set_temp("quest_task", q);
	me->set_temp("quest_task/time", time() + 1800); // 30 分钟时限
	return "扬州城外的" + q["area"] + "近来不太平，你去把" + q["name"] +
		"杀了，回来我重重有赏。";
}

// 杀怪完成判定（由 combatd killer_reward 调用）
void quest_kill(object victim, object killer)
{
	object me;

	if (!objectp(killer) || !userp(killer))
		return;
	me = killer;
	if (!me->query_temp("quest_task"))
		return;
	if (me->query_temp("quest_task/quest_type") == "kill" &&
		me->query_temp("quest_task/target") == victim->query("id"))
	{
		me->set_temp("quest_task/done", 1);
		tell_object(me, HIC "你完成了悬赏任务！回去找雇主领赏吧。\n" NOR);
	}
}

// 汇报完成 → 领奖
int do_report()
{
	object me = this_player();
	mapping q;
	int exp, pot, money;

	if (!userp(me))
		return 0;
	q = me->query_temp("quest_task");
	if (!q)
	{
		tell_object(me, "你并没有领取任务吧？\n");
		return 1;
	}

	if (me->query_temp("quest_task/time") < time())
	{
		tell_object(me, "任务时限已过，这次就算了吧。" + this_object()->query("name") + "挥挥手，示意你可以走了。\n");
		me->delete_temp("quest_task");
		return 1;
	}

	if (!me->query_temp("quest_task/done"))
	{
		tell_object(me, "你还没有完成任务呢，快去快回。\n");
		return 1;
	}

	exp = q["exp"];
	pot = q["pot"];
	money = q["money"];

	me->delete_temp("quest_task");
	me->add("quest_task/lianxu", 1);
	me->add("combat_exp", exp);
	me->add("potential", pot);
	me->add("balance", money);
	me->add("exp/quest", exp);
	me->add("pot/quest", pot);
	me->save();

	tell_object(me, HIW "你被奖励了：\n" +
		chinese_number(exp) + "点实战经验；\n" +
		chinese_number(pot) + "点潜能；\n" +
		chinese_number(money) + "文铜钱。\n" NOR);
	message_vision("$N点了点头：干得好，这是你的赏钱，好好练功去吧。\n", this_object());
	return 1;
}

// 放弃任务
int do_giveup()
{
	object me = this_player();
	mapping q;

	if (!userp(me))
		return 0;
	q = me->query_temp("quest_task");
	if (!q)
	{
		tell_object(me, "你并没有领取任务吧？\n");
		return 1;
	}

	me->delete_temp("quest_task");
	me->add("quest_task/lianxu", -1);
	if (me->query("quest_task/lianxu") < 0)
		me->set("quest_task/lianxu", 0);
	tell_object(me, "你放弃了任务。\n");
	command("sigh");
	return 1;
}
