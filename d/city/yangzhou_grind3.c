// 扬州城南练级路：750 野羊

inherit ROOM;

void create()
{
	set("short", "野羊坡");
	set("long", "山坡上散落着灰白碎石，低矮灌木间留有成串蹄印。一头野羊正在不远处安静啃草。\n");
	set("outdoors", "city");
	set("no_sleep_room", 1);
	set("objects", ([ __DIR__"npc/yz_goat" : 1 ]));
	set("exits", ([ "north" : __DIR__"yangzhou_grind2", "south" : __DIR__"yangzhou_grind4" ]));
	set("cost", 2);
	setup();
	replace_program(ROOM);
}
