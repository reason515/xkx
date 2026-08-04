// fuzi.c 夫子 — 扬州书院免费教读书写字（新手学识字的主路径）
// 移植自 pkuxkx d/city/npc/fuzi.c（免费义务教育，recognize_apprentice 无条件认可）
// 适配 xkx2001：朱熹 accept_object 要求 literate≥30 才收学费，新手毕业仅 10 级；
// 夫子无条件免费授学，literate valid_learn 凭 mark/fuzi 放行。
// 前端学艺：拦截 skills/cha 自绘技能面板（标准 skills.c 要求师徒关系，夫子无门派）。

#include <ansi.h>
inherit NPC;

int do_cha(string);

void create()
{
	set_name("夫子", ({ "fu zi", "fuzi", "zi" }));
	set("long", "夫子是扬州城最有学问的人，学生中不少人在朝中为官。\n");
	set("gender", "男性");
	set("age", 55);
	set("attitude", "peaceful");
	set("combat_exp", 10000);
	set("shen_type", 1);

	set_skill("literate", 200);
	set_skill("unarmed", 80);
	set_skill("dodge", 80);
	set_skill("parry", 80);
	set_temp("apply/attack", 10);
	set_temp("apply/defense", 10);
	set_temp("apply/damage", 10);

	setup();
	carry_object("/d/city/obj/cloth")->wear();
}

void init()
{
	add_action("do_cha", "cha");
	add_action("do_cha", "skills");
}

int recognize_apprentice(object ob)
{
	/* 免费义务教育：无条件认可，并打上可学标记（literate valid_learn 放行） */
	if (objectp(ob) && userp(ob))
		ob->set_temp("mark/fuzi", 1);
	return 1;
}

int do_cha(string arg)
{
	object me = this_player();

	/* 无参（查自己）或查别人 → 交回标准 skills 命令 */
	if (!arg || arg == "" || (arg != "fu zi" && arg != "fuzi"))
		return 0;
	if (!present("fu zi", environment(me)))
		return 0;

	write("你目前所学过的技能：（共1项技能）\n\n");
	write("┌──1项知识──────────────────────────┐\n");
	write("│  读书识字 (literate)                  - 心领神会 200/     0│\n");
	write("└────────────────────────────────┘\n");
	write("夫子免费授学，点「学艺」选择读书识字即可，不必缴纳学费。\n");
	return 1;
}
