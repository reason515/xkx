// 扬州城南练级路：2000 野狼

inherit ROOM;

void create()
{
	set("short", "狼嚎谷");
	set("long", "两侧山壁将风声压成低啸，碎石间不时传来狼嚎。这里离扬州已不远，却已有几分荒野险意。\n");
	set("outdoors", "city");
	set("no_sleep_room", 1);
	set("objects", ([ __DIR__"npc/yz_wolf" : 1 ]));
	set("exits", ([ "north" : __DIR__"yangzhou_grind5", "south" : __DIR__"yangzhou_grind7" ]));
	set("cost", 3);
	setup();
	replace_program(ROOM);
}
