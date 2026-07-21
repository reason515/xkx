// 扬州城南练级路：1000 野狗

inherit ROOM;

void create()
{
	set("short", "枯藤径");
	set("long", "小径两侧枯藤纠缠，泥地上散着零乱骨头。远处传来低沉犬吠，让人不由得握紧兵器。\n");
	set("outdoors", "city");
	set("no_sleep_room", 1);
	set("objects", ([ __DIR__"npc/yz_dog" : 1 ]));
	set("exits", ([ "north" : __DIR__"yangzhou_grind3", "south" : __DIR__"yangzhou_grind5" ]));
	set("cost", 2);
	setup();
	replace_program(ROOM);
}
