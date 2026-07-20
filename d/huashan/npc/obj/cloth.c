//Cracked by Roath
#include <armor.h>
#include <ansi.h>
inherit CLOTH;

void create()
{
        set_name("布衣", ({ "cloth" }) );
        set("long", "这是一件布衣。");
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
