//Cracked by Roath
// puren.c 侠客岛仆人
// Long, 6/13/97

#include <ansi.h>

inherit NPC;

int ask_leave();
int ask_weapon();
int ask_armor();
void greeting(object);

string* armors = ({
	"/clone/armor/beixin",
	"/clone/armor/goupi",
	"/clone/armor/tie-beixin",
	"/clone/armor/tiejia",
});

string* weapons = ({
	"/clone/weapon/caidao",
	"/clone/weapon/branch1",
	"/clone/weapon/branch2",
	"/clone/weapon/branch3",
	"/clone/weapon/branch4",
	"/clone/weapon/changjian",
	"/clone/weapon/duanjian",
	"/clone/weapon/stick",
	"/clone/weapon/stone",
});

void create()
{
	set_name("黄衣仆人", ({ "pu ren", "pu", "puren"}));
	set("long", "一位身着黄衣的仆人，正在兵器房清点整理各式兵刃。\n");
	set("gender", "男性");
	set("age", 40);
	set("attitude", "peaceful");
	set("shen_type", 1);
	set("str", 30);
	set("int", 25);
	set("con", 25);
	set("dex", 25);
	set("race", "人类");	
	set("max_qi", 200);
	set("eff_qi", 200);
	set("qi", 200);
	set("max_jing", 200);
	set("eff_jing", 200);
	set("jing", 200);
	set("max_neili", 200);
	set("eff_neili", 200);
	set("neili", 200);
	set("max_jingli", 200);
	set("eff_jingli", 200);
	set("jingli", 200);
	set("combat_exp", 50000);
	set("score", 1000);

	set_skill("force", 70);
	set_skill("dodge", 70);
	set_skill("parry", 70);
	set_skill("cuff", 70);
	set_skill("sword", 70);
	
	set("inquiry", ([
			"武器"   :  (: ask_weapon :),
			"兵器"   :  (: ask_weapon :),
			"器械"   :  (: ask_weapon :),
			"防具"   :  (: ask_armor :),
			"中原"   : 	(: ask_leave :),
			"岛主"   : 	"岛主好象在後山\n",
			
		]));
	set("armor_count", 10);
	set("weapon_count", 10);
	setup();
}

void init()
{
        object me = this_player();        

        ::init();

        if( interactive(me) )
        {
                remove_call_out("greeting");
                call_out("greeting", 1, me);
        }
}

void greeting(object me)
{	
	if (!objectp(me) || !interactive(me)) return;
	if (me->query_temp("xkd_puren_greet")) return;
	me->set_temp("xkd_puren_greet", 1);
	command("say 这位" + RANK_D->query_respect(me) +
		"，架上兵刃可随意取用，拿起地上的即可。");
	command("say 若地上没有合用的，告诉我便是" +
		"(ask pu about 武器)。");
}
int ask_leave()
{	
	say("仆人摇了摇头说道：没有岛主同意，你可不能私自离岛。\n");
	return 1;
}
int ask_weapon()
{	int i;
	object you = this_player();
	object weapon;
	if (query("weapon_count") < 1)
	{	say("仆人低头在身上翻了半天，报歉地笑了笑说道，对不起，没了。\n");
		return 1;
	}
	
	for( i = 1; i < sizeof(weapons); i++ )
   	{	if (  present(weapons[i]->query("id"), you) )
		{	say("仆人皱了皱眉头说道：有了还要，你太贪心了吧。\n");
			return 1;
		}
		else if (present(weapons[i]->query("id"), environment(you)))
		{	say("仆人往地上一指：地上不是有吗，你要的话就捡走吧。\n");
			return 1;
		}
	}
	weapon = new(weapons[random(sizeof(weapons))] );
	say("仆人从身上找出一" + weapon->query("unit") + weapon->query("name") + "，递了给你。\n");
	weapon->move(you);
	add("weapon_count", -1);
	return 1;
}
int ask_armor()
{	int i;
	object you = this_player();
	object armor;
	if (query("armor_count") < 1)
	{	say("仆人低头在身上翻了半天，报歉地笑了笑说道，对不起，没了。\n");
		return 1;
	}
	for( i = 1; i < sizeof(armors); i++ )
   	{	if (  present(armors[i]->query("id"), you) )
		{	say("仆人皱了皱眉头说道：有了还要，你太贪心了吧。\n");
			return 1;
		}
		else if (present(armors[i]->query("id"), environment(you)))
		{	say("仆人往地上一指：地上不是有吗，你要的话就捡走吧。\n");
			return 1;
		}
	}
	armor = new( armors[random(sizeof(armors))] );
	say("仆人从身上找出一" + armor->query("unit") + armor->query("name") + "，递了给你。\n");
	armor->move(you);
	add("armor_count", -1);
	return 1;
}