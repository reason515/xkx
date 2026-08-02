//wuguan_damen.c
//by 诸葛不亮
//2009.8.15
//adapted for xkx2001: 入口从扬州东大街(northwest)进入

#include <ansi.h>
inherit ROOM;

void create()
{
	set("short", "太乙武馆大门");
	set("long", @LONG
这是扬州东城的一座院落，大门上挂着一块匾(bian)，上书“太乙武馆”四个
大字。门口立着两根石柱，柱上刻着一副对联(duilian)。进得门来，隐约能听到
院内传来的呼喝练武之声。
LONG );
	set("item_desc", ([
		"bian":"  ==================================\n‖                                  ‖\n‖          太  乙  武  馆          ‖\n‖                                  ‖\n  ==================================\n",
		"duilian":"\n          精    身\n          气    心\n          神    意\n          由    是\n          我    谁\n          抟    分\n          为    作\n          一    两\n          处    家\n          ！    ？\n                  ——诸葛不亮手书\n",
	]));
	set("exits",  ([
		"south"  : __DIR__"wuguan_dating",
		"southeast"  :  "/d/city/dongdajie1",
	]));
	set("objects",([
		__DIR__"npc/dizi.c":2,
	]));
	setup();
}
