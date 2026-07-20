//Cracked by Roath
// wushifu.c 武士服

#include <armor.h>

inherit CLOTH;

void create()
{
        set_name("武士服", ({ "wushi fu", "fu", "cloth" }) );
        set("long", "这是一件武士服。");
        set_weight(1000);
        if( clonep() )
                set_default_object(__FILE__);
        else {
                set("unit", "件");
                set("value", 1);
                set("material", "cloth");
                set("armor_prop/armor", 5);
        }
        setup();
}

