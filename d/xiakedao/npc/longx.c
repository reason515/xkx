//Cracked by Roath
// longx.c 侠客岛龙
// Long, 6/13/97

#include <ansi.h>

inherit NPC;
object me;
string* commands = ({
	"north",
	"north",
	"northup",
	"climb tree", 
	"remove cloth",
	"wear coat",
	"jump fall",
	"east",
	"north",
});
string* fname = ({
	" yi"," er", " san", " si", " wu", " liu", " qi", " ba", " jiu",
});

string* wait = ({
	" 岛主在洞中相候，若愿同行可跟随" + RANK_D->query_self(this_object()) + "；不愿跟也不妨，自行前往瀑布进洞即可。",
	" 阁下若暂不跟随，可自行向北去望海亭、瀑布进洞，不必勉强。",
});

int ask_leave();
int ask_food();
int ask_daozhu();
void greeting();
void checking();
void check_follow(object, int);
void move_next(object, int, int);
void create()
{	int i;
	i = random(8) + 1;
	set_name("龙" + chinese_number(i), ({ "long" + fname[i-1]}));
	set("long", "他是侠客岛龙岛主门下的一个弟子。身上穿着洗得发白的锦衣，
头上带着秀才帽，一脸的书呆子气，怎麽看也不象是个武林中人。\n");
	set("nickname", "引路使");
	set("gender", "男性");
	set("age", random(30) + 20);
	set("attitude", "peaceful");
	set("shen_type", 1);
	set("str", 30);
	set("int", 25);
	set("con", 25);
	set("dex", 25);
	set("race", "人类");	
	set("max_qi", 1500);
	set("eff_qi", 1500);
	set("qi", 1500);
	set("max_jing", 1500);
	set("eff_jing", 1500);
	set("jing", 1500);
	set("max_neili", 1500);
	set("eff_neili", 1500);
	set("neili", 1500);
	set("max_jingli", 1500);
	set("eff_jingli", 1500);
	set("jingli", 1500);
	set("combat_exp", 300000 + random(5) * 100000);
	set("score", 1000);
	
	set_skill("force", 150);
	set_skill("dodge", 150);
	set_skill("parry", 150);
	set_skill("strike", 150);
	set_skill("sword", 150);
	set_skill("taiji-shengong", 150);
	set_skill("liuxing-bu", 150);
	set_skill("wugou-jianfa", 150);
	set_skill("wuyu-zhangfa", 150);

      map_skill("force", "taiji-shengong");
	map_skill("sword", "wugou-jianfa");
	map_skill("parry", "wugou-jianfa");
	map_skill("dodge", "liuxing-bu");
	map_skill("strike", "wuyu-zhangfa");
	
	prepare_skill("strike", "wuyu-zhangfa");
	setup();
	carry_object("/clone/weapon/changjian")->wield();
	carry_object(__DIR__"obj/yellowrobe")->wear();

}
void init()
{
      me = this_player();
	::init();
      if( interactive(me) )
      {	//command("say " + query_temp("xkd/guest") + " -- " + me->query("id"));
		if (query_temp("xkd/guest") == me->query("id"))
		{	remove_call_out("greeting");
            	call_out("greeting", 0);
		}
	}
	//remove_call_out("checking");
	//call_out("checking", 5);
}

void greeting()
{	
	me = present(query_temp("xkd/guest"), environment(this_object()));
//	command("say " + me->query("id"));
	if (!(me->query_leader() == this_object()))
	{	command("hi " + query_temp("xkd/guest"));
		command("say " + RANK_D->query_self(this_object()) + query("name") + 
			"奉岛主之命在此恭迎大驾。若愿同行，" + RANK_D->query_respect(me) +
			"可跟随在下；不愿跟也可自行向北去瀑布进洞。\n" +
			"    "+HBRED+HIW"(follow " + query("id") + ")"NOR);	
		remove_call_out("check_follow");
		call_out("check_follow", 20, me, 0);
		return;
	}
}
void check_follow(object me, int count)
{	int i;
	object long = this_object();
    	if( !(find_player(query_temp("xkd/guest"))))
	{	command("say 这人也真是的，一转眼就不知跑哪去了。");
		message_vision("$N说完转身离去了。\n", long);
		remove_call_out("check_follow");
		destruct(long);
		return;
	}
	if (me->query_leader() == this_object())
	{	remove_call_out("move_next");
		call_out("move_next", 1, me, 0, 0);
	}
	else
	{	/* 只提示、绝不强制拖走，避免新手未 follow 却被拽走感到迷惑 */
		if ( count > 2 )
		{	command("say " + RANK_D->query_respect(me) +
				"既有要事，" + RANK_D->query_self(this_object()) +
				"不便强留。自行向北经望海亭至瀑布进洞便可。");
			command("bye " + me->query("id"));
			message_vision("$N拱了拱手，转身离去了。\n", long);
			remove_call_out("check_follow");
			destruct(long);
		}
		else
		{
			i = random(sizeof(wait));
			command("tell " + me->query("id") + wait[i] +
				"\n    " + HBRED + HIW + "(follow " + query("id") + ")" + NOR);
			count = count + 1;
			remove_call_out("check_follow");
			call_out("check_follow", 10, me, count);
		}
	}
	return;
}
void move_next(object me, int count, int miss)
{	object long = this_object();
    	if( !(objectp(me=find_player(query_temp("xkd/guest")))))
	{	command("say 这人也真是的，一转眼就不知跑哪去了。");
		message_vision("$N说完转身离去了。\n", this_object());
		remove_call_out("check_follow");
		destruct(this_object());
		return;
	}
	/* 中途取消跟随：停止引路，不拽人 */
	if (me->query_leader() != this_object())
	{	command("say " + RANK_D->query_respect(me) +
			"既不愿同行，便请自便。瀑布进洞之路向北便是。");
		message_vision("$N拱了拱手，转身离去了。\n", long);
		remove_call_out("move_next");
		destruct(long);
		return;
	}
	if (count >= sizeof(commands))
	{	command("say " + RANK_D->query_respect(me) + "请在这里稍候，岛主一会便到。");
		command("bye " + me->query("id"));
		me->set("xkd/hosted", 1);
		message_vision("$N说完挥了挥手，转身离去了。\n", long);
		destruct(long);
		return;
	}
	command(commands[count]);
	if (!(present(me, environment(long))))
	{	/* 落后未跟上：等待提醒，绝不瞬移玩家 */
		if (miss >= 3)
		{	command("say " + RANK_D->query_respect(me) +
				"似乎另有安排，" + RANK_D->query_self(this_object()) +
				"先行告退。瀑布进洞之路向北便是。");
			message_vision("$N拱了拱手，转身离去了。\n", long);
			remove_call_out("move_next");
			destruct(long);
			return;
		}
		tell_object(me, long->name() + "回头道：请跟上，或取消跟随后自行前往。\n" +
			"    " + HBRED + HIW + "(follow " + query("id") + ")" + NOR + "\n");
		remove_call_out("move_next");
		call_out("move_next", 10, me, count, miss + 1);
		return;
	}
	count = count + 1;
	remove_call_out("move_next");
	call_out("move_next", 10, me, count, 0);
	return;
}
