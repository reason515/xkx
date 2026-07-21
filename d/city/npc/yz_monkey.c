// 扬州城南练级路：野猴（500）

inherit NPC;

void create()
{
	set_name("野猴", ({ "yz monkey", "monkey", "hou" }));
	set("gender", "无性");
	set("race", "野兽");
	set("age", 8);
	set("long", "一只野猴在林间跳跃，见到生人便龇牙咧嘴。\n");
	set("attitude", "peaceful");
	set("combat_exp", 500);
	set_temp("apply/attack", 10);
	set_temp("apply/defense", 12);
	set_temp("apply/damage", 5);
	set_temp("apply/armor", 3);
	setup();
}
