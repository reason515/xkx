//Cracked by Roath
// yayi.c  官府衙役（挂接新手悬赏任务）
#include <ansi.h>
inherit NPC;
inherit F_QUEST_TASK;

void create()
{
	set_name("衙役", ({ "ya yi", "ya" }));
        set_color("$YEL$");
	set("gender", "男性");
	set("age", 25);

	set("long", "一个高大威猛的汉子，因为久在官府做事，脸上已经磨炼得毫无表情。\n");
	set("combat_exp", 7500);
	set("shen_type", 1);
        set_skill("unarmed", 30);
        set_skill("dodge", 30);
	set("inquiry", ([
		"任务" : (: ask_task :),
		"job" : (: ask_task :),
		"悬赏" : (: ask_task :),
		"完成" : (: do_report :),
		"report" : (: do_report :),
		"领赏" : (: do_report :),
		"放弃" : (: do_giveup :),
	]));
	setup();
	carry_object(__DIR__"obj/yayifu")->wear();
}
	
void init()
{
        object ob;
        ::init();
        if (interactive(ob = this_player()) &&
                (int)ob->query_condition("killer")) {
                remove_call_out("kill_ob");
                call_out("kill_ob", 1, ob);
        }
}

int accept_kill(object me)
{
        command("say 来人啊，有刺客要闯衙门！\n");
        me->apply_condition("killer", 100);
        kill_ob(me);
        return 1;
}

