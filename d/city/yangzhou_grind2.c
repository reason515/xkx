// 扬州城南练级路：500 野猴

inherit ROOM;

void create()
{
	set("short", "荒草坡");
	set("long", "坡上荒草没膝，几株歪脖树伸出杂乱枝桠。偶有野猴从枝头掠过，向来人投下好奇目光。\n");
	set("outdoors", "city");
	set("no_sleep_room", 1);
	set("objects", ([ __DIR__"npc/yz_monkey" : 1 ]));
	set("exits", ([ "north" : __DIR__"yangzhou_grind1", "south" : __DIR__"yangzhou_grind3" ]));
	set("cost", 1);
	setup();
	replace_program(ROOM);
}
