// localmaps.c - minimal, frontend handles map display
#include <ansi.h>
inherit F_CLEAN_UP;

int main(object me, string arg)
{
    write("周边地图已显示在上方面板中。\n");
    return 1;
}

int help(object me)
{
    write(@HELP
localmaps - show local map (use the map button in the UI)

Syntax: localmaps
HELP
    );
    return 1;
}
