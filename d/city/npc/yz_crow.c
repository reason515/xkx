// 扬州城南练级路：乌鸦（300）

inherit NPC;

void create()
{
	set_name("乌鸦", ({ "yz crow", "crow" }));
	set("gender", "无性");
	set("race", "飞禽");
	set("age", 3);
	set("long", "一只黑羽乌鸦停在枯枝上，警惕地打量着四周。\n");
	set("attitude", "peaceful");
	set("combat_exp", 300);
	set_temp("apply/attack", 5);
	set_temp("apply/defense", 7);
	set_temp("apply/damage", 3);
	set_temp("apply/armor", 1);
	setup();
}
