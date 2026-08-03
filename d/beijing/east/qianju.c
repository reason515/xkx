//Cracked by Roath
// Room: /d/beijing/east/qianju.c

inherit ROOM;

void create()
{
	set("short", "宝源钱局");
	set("outdoors", "beijing");
	set("long", @LONG
这是京城最大的一家钱庄，已有几百年的历史，是京城一家
名符其实的老字号钱局子。在全国各地都有分店。它发行的银票
信誉非常好，通行全国。
LONG
	);
	// Web 场景动作声明：钱局业务按钮（查账/存款/取款）由房间显式声明。
	set("web/actions", ([
		"check" : "查账",
		"cun"   : "存款",
		"qu"    : "取款",
	]));

	set("objects", ([
		__DIR__"../npc/bankhuoji" : 1,
	]));

	set("exits", ([ /* sizeof() == 1 */
  "west" : __DIR__"wangfudajie",
]));
	set("no_clean_up", 0);

	set("cost", 1);
	setup();
}

void init()
{
	object npc;

	// 确保钱庄伙计已加载（Web 客户端连接时 reset 可能未触发），
	// 否则 check/cun/qu 等业务命令无 NPC 注册、按钮点击全部失败。
	if (!present("huoji", this_object()))
	{
		npc = new(__DIR__"../npc/bankhuoji");
		if (npc) npc->move(this_object());
	}
}
