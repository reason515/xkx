//Cracked by Roath
// hui-cloth.c
//

#include <armor.h>

inherit CLOTH;

void create()
{
        set_name("青布衣", ({ "bu yi", "cloth" }) );
        set("long", "这是一件青布衣。");
        set_weight(2000);
        if( clonep() )
                set_default_object(__FILE__);
        else {
                set("unit", "件");
                set("value", 1);
                set("material", "cloth");
                set("armor_prop/armor", 8);
        }
        setup();
}

