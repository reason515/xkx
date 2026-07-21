// 扬州城南练级路：山贼喽啰（2500）

inherit NPC;

void create()
{
	set_name("山贼喽啰", ({ "yz bandit", "bandit", "zei" }));
	set("gender", "男性");
	set("age", 26);
	set("long", "一个提着短棍的山贼喽啰，正鬼鬼祟祟地守在路旁。\n");
	set("attitude", "heroism");
	set("shen_type", -1);
	set("combat_exp", 2500);
	set_skill("unarmed", 25);
	set_skill("dodge", 25);
	set_skill("parry", 20);
	set_temp("apply/attack", 25);
	set_temp("apply/defense", 22);
	set_temp("apply/damage", 15);
	set_temp("apply/armor", 10);
	setup();
	carry_object("/clone/misc/cloth")->wear();
}
