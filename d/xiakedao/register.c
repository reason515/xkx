//Cracked by Roath
// Room: /adm/register/reg_room.c

inherit ROOM;

void create()
{
        set("short", "侠客岛挂名处");
        set("outdoors", "xiakedao");
        set("long", @LONG
这是一个大厅，厅的中央是一张大桌子，桌上摆着一个厚厚的本
子。桌子後面，靠墙立着一排书架，架子上排满了和桌上差不多的本
子。一个人正坐在桌子後翻看着那大本子，还不时拿起笔在上面修改
什麽。
LONG);

        set("objects", ([
                "/d/xiakedao/npc/mux" : 1,
        ]));

        // 空 exits 让 look 打出「没有任何明显的出路」，便于 Web 文本解析锚定本房间
        set("exits", ([
        ]));
        set("invalid_startroom", 1);
        set("no_fight", "1");
        setup();
//      load_object("/daemon/board/wizard");
//      replace_program(ROOM);
}
void init()
{
        object ob = this_player();

        if (!wizardp(ob)) {
                add_action("block_cmd","",1);
//                ob->set("startroom", "/d/death/death");
                ob->set("block", 1);
        }
}

int block_cmd()
{
        string cmd;
        cmd = query_verb();
        // webclient/hp：Web 端结构化房间/气血；面板指令放行，避免静默无响应
        if ( cmd == "quit" || cmd == "goto" || cmd == "suicide" || cmd == "register"
          || cmd == "tell" || cmd == "say" || cmd == "reply" || cmd == "look"
          || cmd == "webassist" || cmd == "webclient" || cmd == "hp" || cmd == "follow"
          || cmd == "score" || cmd == "inventory" || cmd == "i"
          || cmd == "skills" || cmd == "enable" || cmd == "prepare" || cmd == "wimpy"
          || cmd == "help" || cmd == "xkxe2e" )
                return 0;
        write("请先在此办理挂名手续，或跟随迎宾弟子离开。\n");
        return 1;
}

