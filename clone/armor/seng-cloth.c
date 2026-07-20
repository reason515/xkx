//Cracked by Roath
// cloth.c
//

#include <ansi.h>
#include <armor.h>

inherit CLOTH;

void create()
{
        set_name("青布僧衣", ({ "cloth" }) );
        set("long", "这是一件青布僧衣。");
        set_color("$HIC$");
        set_weight(3000);
        if( clonep() )
                set_default_object(__FILE__);
        else {
                set("unit", "件");
                set("value", 1);
                set("material", "cloth");
                set("armor_prop/armor", 1);
        }
        setup();
}

