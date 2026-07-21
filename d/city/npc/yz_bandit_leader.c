// 扬州城南练级路：山贼头目（3000）

inherit NPC;

void create()
{
	set_name("山贼头目", ({ "yz bandit leader", "bandit leader", "toumu" }));
	set("gender", "男性");
	set("age", 34);
	set("long", "一个满脸横肉的山贼头目按着刀柄，挡住了去路。\n");
	set("attitude", "heroism");
	set("shen_type", -1);
	set("str", 28);
	set("con", 26);
	set("combat_exp", 3000);
	set_skill("unarmed", 30);
	set_skill("dodge", 30);
	set_skill("parry", 30);
	set_temp("apply/attack", 30);
	set_temp("apply/defense", 28);
	set_temp("apply/damage", 18);
	set_temp("apply/armor", 14);
	setup();
	carry_object("/clone/misc/cloth")->wear();
}
