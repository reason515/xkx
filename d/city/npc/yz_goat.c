// 扬州城南练级路：野羊（750）

inherit NPC;

void create()
{
	set_name("野羊", ({ "yz goat", "goat", "yang" }));
	set("gender", "无性");
	set("race", "野兽");
	set("age", 6);
	set("long", "一头野羊低头啃草，粗短的羊角透着一股倔劲。\n");
	set("attitude", "peaceful");
	set("combat_exp", 750);
	set_temp("apply/attack", 13);
	set_temp("apply/defense", 12);
	set_temp("apply/damage", 7);
	set_temp("apply/armor", 4);
	setup();
}
