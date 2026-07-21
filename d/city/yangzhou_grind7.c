// 扬州城南练级路：2500 山贼喽啰

inherit ROOM;

void create()
{
	set("short", "断桥");
	set("long", "一座断桥横在干涸沟壑上，只余几块石板勉强可走。桥头有人影晃动，显然不是善类。\n");
	set("outdoors", "city");
	set("no_sleep_room", 1);
	set("objects", ([ __DIR__"npc/yz_bandit" : 1 ]));
	set("exits", ([ "north" : __DIR__"yangzhou_grind6", "south" : __DIR__"yangzhou_grind8" ]));
	set("cost", 4);
	setup();
	replace_program(ROOM);
}
