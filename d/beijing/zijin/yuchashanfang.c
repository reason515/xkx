//Cracked by Roath
inherit ROOM;

void create()
{
    set("short", "御茶膳房");
    set("outdoors", "beijing");
	set("long",  @LONG
    这是外膳房.
LONG
	);

	set("exits", ([
        "west" : __DIR__"jianting",
	]));

	set("cost", 1);
	setup();
	replace_program(ROOM);
}
