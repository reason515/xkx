// 扬州城南练级路：1500 野猪

inherit ROOM;

void create()
{
	set("short", "泥潭边");
	set("long", "浅泥潭被拱得一片狼藉，湿土里留下深深蹄印。灌木忽然一阵晃动，像有沉重野兽潜伏其中。\n");
	set("outdoors", "city");
	set("no_sleep_room", 1);
	set("objects", ([ __DIR__"npc/yz_boar" : 1 ]));
	set("exits", ([ "north" : __DIR__"yangzhou_grind4", "south" : __DIR__"yangzhou_grind6" ]));
	set("cost", 3);
	setup();
	replace_program(ROOM);
}
