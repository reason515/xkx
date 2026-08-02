// yutang.c — 扬州东郊水塘（钓鱼点，零战斗挣钱）
// 新手可在此钓鱼(diao)钓到鱼，回城卖给醉仙楼换钱
// 挂机：assistd fishing 模式自动循环

#include <ansi.h>
inherit ROOM;

void create()
{
	set("short", "南郊水塘");
	set("long", @LONG
这里是扬州南郊的一处水塘，塘边绿柳成荫，水面波光粼粼。塘边放着
一根破旧的钓竿(yugan)，看起来是哪个渔夫留下的。不少闲人都喜欢在这里
钓(diao)上几竿，钓得的鱼可以拿到城里醉仙楼去卖几个铜钱。
LONG );
	set("item_desc", ([
		"yugan" : "一根破旧的钓竿，可以拿(get yugan)起来去钓鱼。\n",
	]));
	set("exits", ([
		"north" : __DIR__"nanjiao1",
	]));
	set("outdoors", "city");
	set("cost", 2);
	setup();
}

void init()
{
	add_action("do_diao", "diao");
	add_action("do_get", "get");
}

// 免费钓竿：房间固定放一根，拿走再刷新
void reset()
{
	object rod;

	::reset();
	if (!present("yu gan", this_object()))
	{
		rod = new(__DIR__"obj/yugan");
		rod->move(this_object());
	}
}

int do_get(string arg)
{
	if (arg && (arg == "yu gan" || arg == "yugan" || arg == "rod"))
	{
		if (present("yu gan", this_object()))
		{
			object ob = present("yu gan", this_object());
			if (!this_player()->query_temp("fishing_rod"))
				this_player()->set_temp("fishing_rod", 1);
			ob->move(this_player());
			message_vision("$N弯腰捡起了地上的钓竿。\n", this_player());
			return 1;
		}
	}
	return 0;
}

int do_diao(string arg)
{
	object me = this_player();
	object fish;
	int jingli;

	if (me->is_busy() || me->is_fighting())
		return notify_fail("你正忙着呢。\n");

	jingli = me->query("jingli");
	if (jingli < 20)
		return notify_fail("你太累了，先歇息一会儿吧。\n");

	me->add("jingli", -8);
	me->start_busy(1 + random(2));
	message_vision("$N把钓竿甩进水里，静下心来等着鱼儿上钩。\n", me);

	// 钓鱼成功概率：基础 30%，精力越足越高
	if (random(10) < 3)
	{
		fish = new("/clone/obj/fish");
		if (objectp(fish))
		{
			fish->move(me);
			message_vision(HIC "鱼线一沉！$N猛地一提钓竿，钓上来一条" + fish->query("name") + NOR "！\n", me);
			tell_object(me, "你获得了" + fish->query("name") + "。\n");
			// 微末经验/潜能（零战斗成长）
			me->add("combat_exp", 1 + random(2));
			if (random(3) == 0)
				me->add("potential", 1);
		}
	}
	else if (random(10) == 9)
	{
		message_vision("$N用力一扯，鱼线却空空如也——看来鱼儿脱钩了。\n", me);
	}
	return 1;
}
