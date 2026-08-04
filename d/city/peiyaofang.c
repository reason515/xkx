// Room: /city/peiyaofang.c   平一指的配药房
// 移植自 pkuxkx d/city/peiyaofang.c（新手配药任务专用房间）
//
// 注意：本房间必须保持「室内房」（不要加 set("outdoors")）。
// 药铺(yaopu)带 day_shop，夜晚 go.c 只锁“从户外临街进入”；
// 若本房间被标成户外，玩家夜晚将困在配药房里回不了药铺。

inherit ROOM;

void create()
{
	set("short", "配药房");
	set("long", @LONG
这是平一指大夫的配药房，里边光线非常暗淡，你仔细一看，四周围墙摆满
了一排排的药柜，屋子里散发着浓重的中药气味。
LONG);

	set("exits", ([
		"south" : __DIR__"yaopu",
	]));

	setup();
	replace_program(ROOM);
}
