//Cracked by Roath
// void.c (re-created after Elon screwed it up on 07-24-95)
#include <login.h>
#include <ansi.h>

inherit ROOM;

string rescue_startroom(object me);

void create()
{
	set("short","最後乐园");
	set("long",@LONG	
这里就是传说中的 VOID -- 大神和巫师的最後乐园。你看到四周一片
白茫茫的，不一会从虚无中冒出一只企鹅，递给你一罐「可口可乐」(tm)，
然後站在一旁很邪恶地笑著。又过了一会，一只北极熊走了过来，一掌拍扁
了那只企鹅并从你手上抢走那瓶可乐，大笑三声後就从你眼前消失了。
你摇摇头，这种地方还是不要待太久的好。
LONG
	);

	set("exits", ([
		"down" : "/d/city/zuixianlou",
	]));
	/* 房间被销毁/重启时玩家会落到此处；禁止存成下次登录点。 */
	set("invalid_startroom", 1);
	set("no_clean_up", 1);
	set("no_fight",1);
	setup();
}

string rescue_startroom(object me)
{
	string sr;

	if (!objectp(me)) return START_ROOM;
	sr = me->query("startroom");
	if (stringp(sr)
	 && strsrch(sr, "void") < 0
	 && strsrch(sr, "/d/death/") < 0
	 && !catch(load_object(sr)))
		return sr;
	/* 侠客岛新人（未拜师、低经验）仍回岛上沙滩，勿丢到扬州客店 */
	if (!me->query("family") && (int)me->query("combat_exp") < 10000)
		return "/d/xiakedao/shatan";
	return START_ROOM;
}

void do_rescue(object me)
{
	string dest;

	if (!objectp(me) || !userp(me)) return;
	if (!environment(me) || base_name(environment(me)) != base_name(this_object()))
		return;
	if (wizardp(me)) return;
	if (me->query("startroom") == "/d/death/blkbot") {
		me->move("/d/death/blkbot");
		me->set("startroom", "/d/death/blkbot");
		return;
	}
	dest = rescue_startroom(me);
	me->set("startroom", dest);
	tell_object(me, HIW "时空乱流散去，你回到了安全的地方。\n" NOR);
	me->move(dest);
	if (me->query_temp("web_client") && objectp(environment(me)))
		"/adm/daemons/webd"->send_room(me, environment(me));
}

void init()
{       
	object me = this_player();
	if (!objectp(me) || !userp(me)) return;
	if (me->query("startroom") == "/d/death/blkbot") {
		write(HIW "\n天网恢恢，疏而不漏，你还是等巫师放你把！\n\n" NOR);
		me->move("/d/death/blkbot");
		me->set("startroom", "/d/death/blkbot");
		return;
	}
	/* 普通玩家不应停在 VOID；推迟一回合再送走，避免 init 中 move 出问题 */
	if (!wizardp(me))
		call_out("do_rescue", 0, me);
}
