// yaofang  平一指的药方（新手配药任务）
// 移植自 pkuxkx d/city/npc/obj/yaofang.c

#include <ansi.h>

inherit ITEM;

void create()
{
	set_name("药方", ({ "yao fang", "yaofang" }));
	set("long", "这是平一指交给你的药方，上面写满了需要的各种药物和剂量。\n");
	set("unit", "张");
	set("no_drop", 1);
	set("no_get", 1);

	setup();
}

void init()
{
	add_action("do_peiyao", "peiyao");
}

int do_peiyao()
{
	object me = this_player();

	if (!me->query_temp("peiyao/in_job"))
	{
		write("你没有领药方，怎么配药？\n");
		return 1;
	}

	if (base_name(environment(me)) != "/d/city/peiyaofang")
	{
		write("这里没有药材，你拿什么配药？\n");
		return 1;
	}

	if (me->is_busy())
		return 0;

	// 配药耗时：原版 random(40) 回合过慢，适配为 2~5 个心跳（约 4~10 秒）
	me->start_busy(2 + random(4));
	write("你对照药方，一味一味地开始配药……\n");
	call_out("end_peiyao", 5, me);
	return 1;
}

void end_peiyao(object me)
{
	object chengyao;

	if (!objectp(me))
		return;

	if (me->is_busy())
	{
		tell_object(me, "你对照药方，一味一味地配药……\n");
		call_out("end_peiyao", 5, me);
		return;
	}

	write("不知过了多久，你终于把药配完。\n");
	write("你直起腰，深深地吸了一口气。\n");
	me->set_temp("peiyao/ok", 1);
	chengyao = new("/d/city/npc/obj/chengyao");
	chengyao->move(me);
	destruct(this_object());
}
