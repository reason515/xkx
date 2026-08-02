// yugan.c — 破旧钓竿（免费，东郊水塘放置）
#include <ansi.h>
inherit ITEM;

void create()
{
	set_name(HIY "钓竿" NOR, ({ "yu gan", "yugan", "rod" }));
	set_weight(500);
	set("long", "一根破旧的钓竿，虽然简陋，但还能用。\n");
	set("unit", "根");
	set("value", 0);
	set("no_sell", 1);
	setup();
}
