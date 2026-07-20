//Cracked by Roath
#include <armor.h>

inherit CLOTH;

void create()
{
        set_name("蜡染布衣", ({ "cloth", "ccloth" }) );
        set("long", "这是一件蜡染布衣。");
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

