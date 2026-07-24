// localmaps.c

#include <ansi.h>
inherit F_CLEAN_UP;

int main(object me, string arg)
{
    string area, file, *parts;
    object env = environment(me);

    if (!env) {
        write("No environment.\n");
        return 1;
    }

    write(HIC "\n  You are here\n" NOR);
    write(sprintf("  %s\n", env->query("short") || "Unknown"));
    file = base_name(env);
    parts = explode(file, "/");
    if (sizeof(parts) >= 2 && parts[0] == "d")
        area = parts[1];

    if (area == "newbie_lxsz") {
        write(HIG "\nLiuxiu Shanzhuang:\n" NOR);
        write("        Xingzilin\n");
        write("           |\n");
        write("     Chemahang\n");
        write("           |\n");
        write("  Shanzhuang Damen ---- Liuxiu Dangpu\n");
        write("     |     |    \\           Liuxiu Piaohao\n");
        write("     |     |  Jizhen Xiaodao\n");
        write("  Shangwutang |\n");
        write("     |     Zhengting\n");
        write("     |   (You Kunyi)\n");
        write("  Cangshuge\n");
        write("\n  Weiminggu:\n");
        write("     Huanpo -- Luanshizhen\n");
        write("       |\n");
        write("     Shulin\n");
        write("\nDirections: north/south/east/west/enter/out\n");
    } else if (area == "city") {
        write(HIG "\nYangzhou:\n" NOR);
        write("Use map_yangzhou for full map.\n");
    } else if (area == "xiakedao") {
        write(HIG "\nXiakedao:\n" NOR);
        write("Use map_xiakedao for full map.\n");
    } else {
        write("Nearby exits: ");
        mapping exits = env->query("exits");
        if (mapp(exits)) {
            string *dirs = keys(exits);
            write(implode(dirs, ", ") + "\n");
        } else {
            write("none\n");
        }
    }

    return 1;
}

int help(object me)
{
    write(@HELP
localmaps - show simplified local map

Syntax: localmaps
HELP
    );
    return 1;
}
