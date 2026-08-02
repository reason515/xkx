// linzhennan.c 林震南 — 扬州福威镖局总镖头（押镖任务）
// 移植自 pkuxkx d/fuzhou/npc/linzhennan.c，接镖/领赏/放弃走 F_ESCORT 公共逻辑
// 目的地按 xkx2001 现有城市配置

#include <ansi.h>
inherit NPC;
inherit F_ESCORT;

mapping *escort_info =
({
	(["area" : "/d/foshan/dlroad1", "short" : "佛山林间道", "id" : "shang ren", "name" : "商人"]),
	(["area" : "/d/hangzhou/road12", "short" : "临安青石大道", "id" : "huoji", "name" : "伙计"]),
	(["area" : "/d/wudang/guangchang", "short" : "武当广场", "id" : "dao ren", "name" : "道人"]),
	(["area" : "/d/dali/dalicheng1", "short" : "大理太和街口", "id" : "shang ren", "name" : "商人"]),
	(["area" : "/d/taishan/dongtian", "short" : "泰山东天门", "id" : "xiang ke", "name" : "香客"]),
});

string do_escort();
string do_give();
string do_fail();

int ask_fuwei();

void create()
{
	set_name("林震南", ({ "lin zhennan", "lin", "zhennan" }));
	set("gender", "男性");
	set("age", 45);
	set("long", "他就是「福威镖局」的总镖头——林震南。\n");
	set("no_get", 1);

	set("combat_exp", 30000);
	set("shen_type", 1);

	set("max_neili", 500);
	set("neili", 500);
	set("jiali", 10);

	set_skill("force", 40);
	set_skill("sword", 50);
	set_skill("unarmed", 50);
	set_skill("dodge", 50);
	set_skill("parry", 50);

	set("inquiry", ([
		"福威镖局" : (: ask_fuwei :),
		"押镖" : (: do_escort :),
		"job" : (: do_escort :),
		"完成" : (: do_give :),
		"finish" : (: do_give :),
		"放弃" : (: do_fail :),
		"fail" : (: do_fail :),
		"报酬" : (: do_give :),
		"领赏" : (: do_give :),
	]));

	set_temp("apply/attack", 50);
	set_temp("apply/defense", 50);
	set_temp("apply/damage", 15);

	setup();
	carry_object("/clone/weapon/changjian")->wield();
}

string do_escort()
{
	return get_dart("city", this_player(), escort_info);
}

string do_give()
{
	return give_reward(this_player());
}

string do_fail()
{
	return quest_fail(this_player());
}

int ask_fuwei()
{
	command("say 福威镖局世代经营，走南闯北，童叟无欺。你若想赚些盘缠，可以来帮我押镖(ask lin zhennan about 押镖)。");
	return 1;
}
