//Cracked by Roath
// xiakedao/gate.c
// modified by aln 5 / 98

inherit __DIR__"no_pk_room";

#include <room.h>

void check_reclose();

void create()
{
        set("short", "石门");
        set("long", @LONG
这里已是甬道尽头，面前一道厚重的石门。门上刻着三个斗大的
古篆：「侠客行」。年深日久，那笔划的凹下之处都积满了青苔，越
发显得沧桑，你心中的敬意油然而生。
LONG );

        set("exits", ([
		"enter" : __DIR__"xiakexing1",
		"south" : __DIR__"yongdao10",
        ]));

        set("objects", ([
                __DIR__ +"npc/shaolin" : 1,
        ]));

	create_door("enter", "石门", "out", DOOR_CLOSED);
	set("indoors", "xiakedao" );
	set("cost", 0);
	setup();
}

// 人走光后自动关回：避免 Web e2e / 先前玩家把石门留在打开态，
// 后来者看不到「打开石门」却不知道该点「进」。
void check_reclose()
{
	mapping d;
	if (usr_in()) return;
	d = query_doors();
	if (!mapp(d) || undefinedp(d["enter"])) return;
	// 打开时 status==0，不能用 !query_door(...,"status") 判断「无门」
	if (query_door("enter", "status") & DOOR_CLOSED) return;
	close_door("enter");
	"/adm/daemons/webd"->notify_room(this_object());
}

int valid_leave(object me, string dir)
{
	int r = ::valid_leave(me, dir);
	if (r) {
		remove_call_out("check_reclose");
		call_out("check_reclose", 1);
	}
	return r;
}
