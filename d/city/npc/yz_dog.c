// 扬州城南练级路：野狗（1000）

inherit NPC;

void create()
{
	set_name("野狗", ({ "yz dog", "dog", "gou" }));
	set("gender", "无性");
	set("race", "野兽");
	set("age", 4);
	set("long", "一条瘦削的野狗来回踱步，不时露出尖牙低吼。\n");
	set("attitude", "peaceful");
	set("combat_exp", 1000);
	set_temp("apply/attack", 16);
	set_temp("apply/defense", 14);
	set_temp("apply/damage", 8);
	set_temp("apply/armor", 5);
	setup();
}
