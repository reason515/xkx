// 当铺内部货箱：保存寄售商品，不向玩家展示。

inherit ITEM;

void create()
{
	set_name("当铺货箱", ({ "treasure box", "shop box" }));
	set("unit", "只");
	set("long", "这是当铺内部存放货物的箱子。\n");
	set("no_get", 1);
	set("no_drop", 1);
	set("no_clean_up", 1);
	set("env/invisibility", 999);
	set_weight(0);
	set_max_encumbrance(100000000000);
	setup();
}
