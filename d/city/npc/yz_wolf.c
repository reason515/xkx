// 扬州城南练级路：野狼（2000）

inherit NPC;

void create()
{
	set_name("野狼", ({ "yz wolf", "wolf", "lang" }));
	set("gender", "无性");
	set("race", "野兽");
	set("age", 10);
	set("long", "一头灰狼伏在草丛中，目光始终没有离开你。\n");
	set("attitude", "peaceful");
	set("str", 32);
	set("dex", 28);
	set("combat_exp", 2000);
	set_temp("apply/attack", 24);
	set_temp("apply/defense", 20);
	set_temp("apply/damage", 16);
	set_temp("apply/armor", 12);
	setup();
}
