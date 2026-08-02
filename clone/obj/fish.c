// fish.c — 钓到的鱼（可卖给酒楼，零战斗挣钱）
#include <ansi.h>
inherit ITEM;

void create()
{
	string *kinds = ({
		HIW "白条" NOR, HIY "鲫鱼" NOR, HIC "青鱼" NOR,
		HIG "草鱼" NOR, HIY "鳊鱼" NOR, HIW "银鱼" NOR,
	});
	string name = kinds[random(sizeof(kinds))];

	set_name(name, ({ "fresh fish", "yu", "caught" }));
	set_weight(300);
	set("long", "一条刚钓上来的" + name + "，还活蹦乱跳的。可以拿到醉仙楼卖给冼老板换几个铜钱。\n");
	set("unit", "条");
	set("value", 80 + random(220));
	set("no_sell", 0);
	setup();
}
