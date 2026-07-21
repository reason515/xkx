// 扬州城南练级路：3000 山贼头目

inherit ROOM;

void create()
{
	set("short", "寨口");
	set("long", "乱石垒成的寨门半掩着，门上挂着褪色破旗。一个山贼头目堵在前方，身后便是更深的山岭。\n");
	set("outdoors", "city");
	set("no_sleep_room", 1);
	set("objects", ([ __DIR__"npc/yz_bandit_leader" : 1 ]));
	set("exits", ([ "north" : __DIR__"yangzhou_grind7" ]));
	set("cost", 4);
	setup();
	replace_program(ROOM);
}
