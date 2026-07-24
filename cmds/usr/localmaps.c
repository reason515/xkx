// localmaps.c — 显示当前区域地图
// Adapted from pkuxkx by Zine@pkuxkx 2013/4/28

#include <ansi.h>

inherit F_CLEAN_UP;

string get_area(string area);
string remove_ansi(string str)
{
        int i;
        string *color = ({ BLK, RED, GRN, YEL, BLU, MAG, CYN, WHT,
                        HIR, HIG, HIY, HIB, HIM, HIC, HIW,
                        HBRED, HBGRN, HBYEL, HBBLU, HBMAG, HBCYN, HBWHT,
                        BBLK, BRED, BYEL, BBLU, BMAG, BCYN,
                        NOR, BLINK });
        if( !str || !stringp(str) ) return "";
        i = sizeof(color);
        while( i-- ) {
                str = replace_string(str, color[i], "");
        }
        return str;
}

int main(object me, string arg)
{
        string file, here;
        object room;
        
        room = environment(me);
        if (!room) return notify_fail("你目前不在任何地方。\n");

        // 优先用房间自定义地图
        if (function_exists("Show_Local_Map", room) && room->Show_Local_Map())
                return 1;

        here = file_name(room);
        // xkx2001 地图文件命名格式为 map_<area>（不是 map-<area>）
        file = read_file("doc/help/map_" + get_area(here));
        if (!file || !stringp(file))
                return notify_fail("这里暂时没有地图。\n");

        // 高亮当前位置
        file = replace_string(file, remove_ansi(room->query("short")),
                BBLU + HIY + room->query("short") + NOR);
        if (arg) {
                file = replace_string(file, arg, BBLU + HIR + arg + NOR);
        }

        me->start_more(file);
        write(" ___________________________________________________________\n");
        return 1;
}

string get_area(string area)
{
        string *list = explode(area, "/");
        return list[sizeof(list) - 2];
}

int help(object me)
{
write(@HELP
指令格式 : localmaps [地点]
 
这个指令可以让你知道你所处的环境在地图中的位置。
如果带上指定地点，还会把你想找到地方高亮显示。
HELP
    );
    return 1;
}
