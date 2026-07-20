//Cracked by Roath
#include <armor.h>

inherit CLOTH;
#include <ansi.h>

void create()
{
        set_name(CYN"青布衣"NOR, ({ "cloth" }) );
        set("long", "这是一件物品。");
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

