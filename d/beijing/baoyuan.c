//Cracked by Roath
//baoyuan.c 宝源钱庄
// ssy

#include <ansi.h>
inherit ROOM;

void create()
{
        set("short", HIY"宝源钱庄"NOR);
        set("outdoors", "beijing");
        set("long", @LONG
这是京城里最大的一家钱庄，它发行的银票信誉非常好，通行全国。墙上贴
着一张布告(bugao)。钱庄掌柜和伙计忙忙碌碌地工作着。
LONG
        );

        set("item_desc", ([
			   "bugao" : "
钱庄业务：存款(deposit)，取款(withdraw)，兑换(convert)。
\n",
        ]));
        // Web 场景动作声明：钱庄业务按钮（查账/存款/取款）由房间显式声明。
        set("web/actions", ([
            "check" : "查账",
            "cun"   : "存款",
            "qu"    : "取款",
        ]));
        set("objects", ([
	       __DIR__"npc/bankhuoji" : 1,
        ]));

        set("no_drop",1);
        set("exits", ([
               "west" : __DIR__"fuchengdajie_n",
        ]));

        set("day_shop", 1);
        set("cost", 0);
        setup();
}

void init()
{
	object npc;

	// 确保钱庄伙计已加载（Web 客户端连接时 reset 可能未触发），
	// 否则 check/cun/qu 等业务命令无 NPC 注册、按钮点击全部失败。
	if (!present("huoji", this_object()))
	{
		npc = new(__DIR__"npc/bankhuoji");
		if (npc) npc->move(this_object());
	}
}


