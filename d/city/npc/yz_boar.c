// 扬州城南练级路：野猪（1500）

inherit NPC;

void create()
{
	set_name("野猪", ({ "yz boar", "boar", "zhu" }));
	set("gender", "无性");
	set("race", "野兽");
	set("age", 7);
	set("long", "一头黑背野猪拱开泥土觅食，獠牙上还沾着湿泥。\n");
	set("attitude", "peaceful");
	set("str", 28);
	set("con", 25);
	set("combat_exp", 1500);
	set_temp("apply/attack", 20);
	set_temp("apply/defense", 16);
	set_temp("apply/damage", 12);
	set_temp("apply/armor", 8);
	setup();
}
