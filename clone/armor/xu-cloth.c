//Cracked by Roath
// xu-cloth.c
//

#include <ansi.h>
#include <armor.h>

inherit CLOTH;

void create()
{
        set_name("黄布袈裟", ({ "jia sha", "cloth" }) );
        set("long", "这是一件黄布袈裟。");
        set_color("$HIY$");
        set_weight(5000);
        if( clonep() )
                set_default_object(__FILE__);
        else {
                set("unit", "件");
                set("value", 1);
                set("material", "cloth");
                set("armor_prop/armor", 2);
        }
        setup();
}

