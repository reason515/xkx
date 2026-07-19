//Cracked by Roath
// 海盗窝
// Ssy

inherit __DIR__"no_pk_room";

void create()
{
    	set("short", "海盗窝");
    	set("long", @LONG
这间草棚破破烂烂，里面只有几张小床和一点干粮，床上还躺了
几个人。
LONG
    	);

    	set("exits", ([
		       "out" : __DIR__"haidaowo",
		       ]));
	/* 三种海盗各一：原先随机抽两种，挂「受伤海盗」时经常进窝就空等刷新 */
        set("objects", ([
			 __DIR__"npc/haidao_w" : 1,
			 __DIR__"npc/haidao_s" : 1,
			 __DIR__"npc/haidao_o" : 1,
			 ]));

    	setup();
}


