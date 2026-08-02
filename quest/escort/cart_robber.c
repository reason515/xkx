// cart_robber.c — 镖车劫匪（xkx2001 精简版）
// 移植自 pkuxkx quest/escort/cart_robber.c
// 精简说明：移除门派技能配置表（依赖大量 pkuxkx 独有技能）与 GEM_D 掉宝/
// antirobot/perform 配置，改为通用基础技能 + xkx2001 已有门派武功，
// 按押镖玩家经验动态调整强度。保留接口：do_change(ob) / checking(me, ob)。

#include <ansi.h>
inherit NPC;

void start_attact(object me);
int checking(object me, object ob);
int dest();

void create()
{
	set_name(HIM"劫匪"NOR, ({ "cart robber", "robber" }));
	set("title", "拦路抢劫");
	set("gender", "男性");
	set("age", random(30) + 14);
	set("long", "这是一个亡命之徒，专干拦路抢劫的勾当。\n");
	set("vendetta/authority", 1);
	set("attitude", "aggressive");
	set("chat_chance_combat", 10);
	set("str", 25);
	set("con", 25);
	set("dex", 20);
	set("int", 10);
	set("max_qi", 2000);
	set("max_jing", 800);
	set("neili", 1000);
	set("max_neili", 1000);
	set("jiali", 50);
	set("combat_exp", 100000);
	set_skill("force", 60);
	set_skill("unarmed", 60);
	set_skill("strike", 60);
	set_skill("dodge", 60);
	set_skill("parry", 60);
	set_skill("sword", 60);
	set_skill("blade", 60);
	set_skill("staff", 60);
	set_skill("literate", 100);
	setup();
	carry_object("/clone/weapon/changjian")->wield();
	carry_object("/clone/armor/tiejia")->wear();
	call_out("start_attact", 5, this_object());
	call_out("dest", 900);
}

void init()
{
	set("no_steal", 1);
	set("random_npc", 1);
}

void start_attact(object me)
{
	if (objectp(me) && environment(me) && living(me))
	{
		message_vision(HIR"劫匪突然从暗处跳了出来，阴笑道：“红货和人命都留下来吧！”\n"NOR, me);
	}
}

//按押镖玩家调整劫匪强度
void do_change(object ob)
{
	object me = this_object();
	int exp, diff, tempskill;
	string sk, sk_weapon;
	// 使用 xkx2001 已确认存在的门派武功
	string *skills = ({ "huashan-jianfa", "dagou-bang", "xianglong-zhang", "xiaoyaoyou", "huntian-qigong" });

	exp = ob->query("combat_exp");
	diff = ob->query_temp("yunbiao/high_value");
	if (!diff)
		diff = 6;

	// 技能等级按玩家经验推算，同 pkuxkx 公式
	tempskill = to_int(pow(exp / 100, 0.333) * 10);
	tempskill = to_int(tempskill * (50 + random(35) + (diff - 10) * 5) / 100);
	if (tempskill < 30)
		tempskill = 30;
	if (tempskill > 400)
		tempskill = 400;

	me->set("combat_exp", exp / 2 + 10000);
	me->set_skill("force", tempskill);
	me->set_skill("unarmed", tempskill);
	me->set_skill("strike", tempskill);
	me->set_skill("sword", tempskill);
	me->set_skill("blade", tempskill);
	me->set_skill("staff", tempskill);
	me->set_skill("dodge", tempskill);
	me->set_skill("parry", tempskill);
	me->set_skill("literate", 100);

	// 随机一个门派武功并激发
	sk = skills[random(sizeof(skills))];
	me->set_skill(sk, tempskill);
	if (sk == "huashan-jianfa")
	{
		map_skill("sword", sk);
		map_skill("parry", sk);
	}
	else if (sk == "dagou-bang")
	{
		map_skill("staff", sk);
		map_skill("parry", sk);
	}
	else if (sk == "xianglong-zhang")
	{
		map_skill("strike", sk);
		prepare_skill("strike", sk);
	}
	else if (sk == "xiaoyaoyou")
	{
		map_skill("dodge", sk);
	}
	else if (sk == "huntian-qigong")
	{
		map_skill("force", sk);
	}

	// 按技能等级设置属性
	me->set("max_qi", 1000 + tempskill * 8);
	me->set("max_jing", 500 + tempskill * 3);
	me->set("max_neili", 500 + tempskill * 5);
	me->set("neili", me->query("max_neili"));
	me->set("qi", me->query("max_qi"));
	me->set("jing", me->query("max_jing"));
	me->set("eff_qi", me->query("max_qi"));
	me->set("eff_jing", me->query("max_jing"));
	me->set("jiali", 30 + tempskill / 4);
}

//战斗检查：低血逃跑 / 持续战斗 / 玩家离开则抢镖车
int checking(object me, object ob)
{
	object cart;

	if (!ob || !me)
		return 1;

	// 血量过低逃跑
	if (me->query("qi") * 100 / me->query("max_qi") <= 15)
	{
		if (!living(me))
			return 1;
		message_vision(CYN"\n$N叫道：点子扎手，扯呼！\n$N个起纵遁入暗里不见了。\n\n"NOR, me);
		destruct(this_object());
		return 1;
	}

	if (me->is_fighting())
	{
		call_out("checking", 2, me, ob);
		return 1;
	}

	// 玩家在场且活着 → 继续战斗
	if (living(ob) && objectp(present(ob->query("id"), environment())))
	{
		me->fight_ob(ob);
		call_out("checking", 2, me, ob);
		return 1;
	}

	// 玩家不在或倒下 → 抢镖车
	if ((!present(ob->query("id"), environment()) || !living(ob)) &&
		objectp(cart = present("biao che", environment())))
	{
		message_vision("$N将镖车推走了。\n", me);
		cart->set("be_robbed", 1);
		CHANNEL_D->do_channel(this_object(), "rumor",
			sprintf("%s护的镖被劫匪劫去了！", ob->query("name")), -1);
		destruct(this_object());
		return 1;
	}

	call_out("checking", 2, me, ob);
	return 1;
}

void unconcious()
{
	die();
}

void die()
{
	object ob;

	message_vision(HIR"$N惨叫一声，倒地身亡。\n"NOR, this_object());
	ob = this_object();
	if (objectp(ob->query("uni_target")))
		ob->query("uni_target")->delete_temp("yunbiao/can_go");
	::die();
}

int dest()
{
	if (environment(this_object()))
		message_vision("$N见势不妙，转身逃走了。\n", this_object());
	destruct(this_object());
	return 1;
}
