// 扬州城南练级路：300 乌鸦

inherit ROOM;

void create()
{
	set("short", "城南小径");
	set("long", "民屋北侧有条少有人走的小径，枯枝上停着几只乌鸦。南面草木渐深，正通往城南荒野。\n");
	set("outdoors", "city");
	set("no_sleep_room", 1);
	set("objects", ([ __DIR__"npc/yz_crow" : 1 ]));
	set("exits", ([ "north" : __DIR__"minwu1", "south" : __DIR__"yangzhou_grind2" ]));
	set("cost", 1);
	setup();
	replace_program(ROOM);
}
