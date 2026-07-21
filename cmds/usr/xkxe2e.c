// xkxe2e.c — gated helpers for automated leave-island tests
// Enabled only when /adm/etc/xkd_e2e exists (deploy creates it for e2e).

#define WEBD "/adm/daemons/webd"

inherit F_CLEAN_UP;

int main(object me, string arg)
{
	object ob;

	if (file_size("/adm/etc/xkd_e2e") < 0)
		return notify_fail("什么？\n");
	if (!objectp(me) || !me->query_temp("web_client"))
		return notify_fail("什么？\n");

	if (!arg || arg == "")
		return notify_fail("用法：xkxe2e grantleave | givearmor | giveweapon | gate | closedoor | hurt | wound | lowqi | lowjingli | grindprep | yanzhougrind | studyrecoverprep | haidaowo | dadong | yingbin | yongdao2 | bingqi | shanding | shanxia | tovoid | zuixianlou | dangpu | givemoney | givesellitem | givesellrabbit | grantskills | grantforce\n");

	if (arg == "dadong") {
		ob = load_object("/d/xiakedao/dadong");
		if (!objectp(ob))
			return notify_fail("（测试）无法加载大山洞。\n");
		me->move(ob);
		tell_object(me, "（测试）你来到大山洞。\n");
		WEBD->mark_web_client(me);
		WEBD->send_room(me, ob);
		return 1;
	}

	if (arg == "yingbin") {
		ob = load_object("/d/xiakedao/yingbin");
		if (!objectp(ob))
			return notify_fail("（测试）无法加载迎宾馆。\n");
		me->move(ob);
		tell_object(me, "（测试）你来到迎宾馆。\n");
		WEBD->mark_web_client(me);
		WEBD->send_room(me, ob);
		return 1;
	}

	if (arg == "haidaowo") {
		ob = load_object("/d/xiakedao/haidaowo1");
		if (!objectp(ob))
			return notify_fail("（测试）无法加载海盗窝。\n");
		me->move(ob);
		tell_object(me, "（测试）你来到海盗窝。\n");
		WEBD->mark_web_client(me);
		WEBD->send_room(me, ob);
		return 1;
	}

	if (arg == "shanding") {
		ob = load_object("/d/xiakedao/shanding");
		if (!objectp(ob))
			return notify_fail("（测试）无法加载山顶。\n");
		me->move(ob);
		tell_object(me, "（测试）你来到山顶。\n");
		WEBD->mark_web_client(me);
		WEBD->send_room(me, ob);
		return 1;
	}

	if (arg == "shanxia") {
		ob = load_object("/d/xiakedao/shanxia");
		if (!objectp(ob))
			return notify_fail("（测试）无法加载山脚下。\n");
		me->move(ob);
		tell_object(me, "（测试）你来到山脚下。\n");
		WEBD->mark_web_client(me);
		WEBD->send_room(me, ob);
		return 1;
	}

	if (arg == "yongdao2") {
		ob = load_object("/d/xiakedao/yongdao2");
		if (!objectp(ob))
			return notify_fail("（测试）无法加载甬道。\n");
		me->move(ob);
		tell_object(me, "（测试）你来到迎宾馆西侧甬道。\n");
		WEBD->mark_web_client(me);
		WEBD->send_room(me, ob);
		return 1;
	}

	if (arg == "bingqi") {
		ob = load_object("/d/xiakedao/bingqi");
		if (!objectp(ob))
			return notify_fail("（测试）无法加载兵器房。\n");
		me->move(ob);
		tell_object(me, "（测试）你来到兵器房。\n");
		WEBD->mark_web_client(me);
		WEBD->send_room(me, ob);
		return 1;
	}

	if (arg == "grindprep") {
		ob = load_object("/d/xiakedao/shatans2");
		if (!objectp(ob))
			return notify_fail("（测试）无法加载沙滩刷怪点。\n");
		me->move(ob);
		tell_object(me, "（测试）你来到小海龟出没的沙滩。\n");
		WEBD->mark_web_client(me);
		WEBD->send_room(me, ob);
		WEBD->send_vitals(me);
		return 1;
	}

	if (arg == "studyrecoverprep") {
		ob = load_object("/d/xiakedao/xkx1");
		if (!objectp(ob))
			return notify_fail("（测试）无法加载太玄功石室。\n");
		me->move(ob);
		me->set("combat_exp", 251);
		me->set_skill("force", 1);
		me->set("jing", 10);
		tell_object(me, "（测试）经验已超过二百五十，精神不足。\n");
		WEBD->mark_web_client(me);
		WEBD->send_room(me, ob);
		WEBD->send_vitals(me);
		return 1;
	}

	if (arg == "hurt") {
		int before, after;
		before = (int)me->query("qi");
		if (before < 20)
			me->set("qi", 80);
		before = (int)me->query("qi");
		me->receive_damage("qi", 15, "e2e");
		after = (int)me->query("qi");
		tell_object(me, sprintf("（测试）气血 %d → %d。\n", before, after));
		WEBD->send_vitals(me);
		return 1;
	}

	if (arg == "wound") {
		int max_qi, before_eff, after_eff, dmg;
		max_qi = (int)me->query("max_qi");
		if (max_qi < 1) max_qi = 1;
		/* 恢复到满上限再受伤，保证 e2e 能看到 eff < max */
		me->set("eff_qi", max_qi);
		me->set("qi", max_qi);
		before_eff = max_qi;
		dmg = max_qi / 5;
		if (dmg < 10) dmg = 10;
		if (dmg >= max_qi) dmg = max_qi / 2;
		if (dmg < 1) dmg = 1;
		me->receive_wound("qi", dmg, "e2e");
		after_eff = (int)me->query("eff_qi");
		tell_object(me, sprintf(
			"（测试）气上限受伤 %d → %d（先天 %d）。\n",
			before_eff, after_eff, max_qi
		));
		WEBD->send_vitals(me);
		return 1;
	}

	if (arg == "tovoid") {
		ob = load_object("/clone/misc/void");
		if (!objectp(ob))
			return notify_fail("（测试）无法加载 VOID。\n");
		/* 故意写成 void，模拟重启误存后的档案 */
		me->set("startroom", "/clone/misc/void");
		me->move(ob);
		tell_object(me, "（测试）你被送入最後乐园。\n");
		WEBD->mark_web_client(me);
		WEBD->send_room(me, ob);
		return 1;
	}

	if (arg == "zuixianlou") {
		ob = load_object("/d/city/zuixianlou");
		if (!objectp(ob))
			return notify_fail("（测试）无法加载醉仙楼。\n");
		me->move(ob);
		tell_object(me, "（测试）你来到醉仙楼。\n");
		WEBD->mark_web_client(me);
		WEBD->send_room(me, ob);
		return 1;
	}

	if (arg == "dangpu") {
		ob = load_object("/d/city/dangpu");
		if (!objectp(ob))
			return notify_fail("（测试）无法加载扬州当铺。\n");
		me->move(ob);
		tell_object(me, "（测试）你来到扬州当铺。\n");
		WEBD->mark_web_client(me);
		WEBD->send_room(me, ob);
		return 1;
	}

	if (arg == "yanzhougrind") {
		ob = load_object("/d/city/minwu1");
		if (!objectp(ob))
			return notify_fail("（测试）无法加载扬州民屋。\n");
		me->move(ob);
		tell_object(me, "（测试）你来到扬州城南练级路的免费歇脚民屋。\n");
		WEBD->mark_web_client(me);
		WEBD->send_room(me, ob);
		WEBD->send_vitals(me);
		return 1;
	}

	if (arg == "givesellitem") {
		ob = new("/clone/weapon/changjian");
		if (!objectp(ob))
			return notify_fail("（测试）无法发放出售物品。\n");
		ob->move(me);
		tell_object(me, "（测试）你得到一柄长剑，可在当铺出售。\n");
		return 1;
	}

	if (arg == "givesellrabbit") {
		ob = new("/clone/beast/turou");
		if (!objectp(ob))
			return notify_fail("（测试）无法发放兔肉。\n");
		ob->move(me);
		tell_object(me, "（测试）你得到一块兔肉，供当铺物品识别回归。\n");
		return 1;
	}

	if (arg == "givemoney") {
		ob = new("/clone/money/silver");
		if (!objectp(ob))
			return notify_fail("（测试）无法发放银两。\n");
		ob->set_amount(20);
		ob->move(me);
		tell_object(me, "（测试）你得到二十两白银。\n");
		return 1;
	}

	if (arg == "lowqi") {
		int max_qi, after;
		max_qi = (int)me->query("max_qi");
		if (max_qi < 1) max_qi = 1;
		me->set("qi", max_qi * 15 / 100);
		if ((int)me->query("qi") < 1) me->set("qi", 1);
		after = (int)me->query("qi");
		tell_object(me, sprintf("（测试）气血降至 %d/%d。\n", after, max_qi));
		WEBD->send_vitals(me);
		return 1;
	}

	if (arg == "lowjingli") {
		int max_jl, after;
		max_jl = (int)me->query("max_jingli");
		if (max_jl < 20) {
			me->set("max_jingli", 100);
			me->set("eff_jingli", 100);
			max_jl = 100;
		}
		me->set("jingli", max_jl / 20);
		if ((int)me->query("jingli") < 1) me->set("jingli", 1);
		after = (int)me->query("jingli");
		tell_object(me, sprintf("（测试）精力降至 %d/%d。\n", after, max_jl));
		WEBD->send_vitals(me);
		return 1;
	}

	if (arg == "gate") {
		ob = load_object("/d/xiakedao/gate");
		if (!objectp(ob))
			return notify_fail("（测试）无法加载石门。\n");
		me->move(ob);
		tell_object(me, "（测试）你来到石门。\n");
		WEBD->mark_web_client(me);
		WEBD->send_room(me, ob);
		return 1;
	}

	if (arg == "closedoor") {
		ob = environment(me);
		if (!objectp(ob))
			return notify_fail("（测试）你不在任何房间。\n");
		if (ob->query_door("enter", "status") & 1)
			tell_object(me, "（测试）石门已是关闭状态。\n");
		else if (ob->close_door("enter"))
			tell_object(me, "（测试）已关闭石门。\n");
		else
			return notify_fail("（测试）无法关闭石门。\n");
		WEBD->notify_room(ob);
		return 1;
	}

	if (arg == "grantleave") {
		object env;
		me->set_temp("marks/离", 1);
		tell_object(me, "（测试）岛主已准你离岛。\n");
		env = environment(me);
		if (objectp(env) && base_name(env) == "/d/xiakedao/shatan")
			env->check_trigger();
		return 1;
	}

	if (arg == "givearmor") {
		ob = new("/d/xiakedao/obj/coat");
		if (!objectp(ob))
			return notify_fail("（测试）无法生成雨衣。\n");
		ob->move(me);
		tell_object(me, "（测试）你得到一件油布雨衣。\n");
		return 1;
	}

	if (arg == "giveweapon") {
		ob = new("/clone/weapon/gangdao");
		if (!objectp(ob))
			return notify_fail("（测试）无法生成钢刀。\n");
		ob->move(me);
		tell_object(me, "（测试）你得到一把钢刀。\n");
		return 1;
	}

	if (arg == "grantskills") {
		/* Web 激发选项 e2e：太玄功仅内功，五狱掌法=掌法+招架 */
		me->set_skill("force", 40);
		me->set_skill("strike", 40);
		me->set_skill("parry", 40);
		me->set_skill("taixuan-gong", 30);
		me->set_skill("wuyu-zhangfa", 30);
		tell_object(me, "（测试）已学会太玄功与五狱掌法。\n");
		WEBD->mark_web_client(me);
		WEBD->send_skills_enable(me);
		return 1;
	}

	if (arg == "grantforce") {
		/* Web 运功入口 e2e：激发太玄功并给足内力 */
		me->set_skill("force", 50);
		me->set_skill("taixuan-gong", 30);
		me->set("max_neili", 220);
		me->set("neili", 220);
		me->map_skill("force", "taixuan-gong");
		tell_object(me, "（测试）已激发太玄功，可运功回气疗伤。\n");
		WEBD->mark_web_client(me);
		WEBD->send_skills_enable(me);
		WEBD->send_vitals(me);
		return 1;
	}

	return notify_fail("未知子命令。\n");
}

int help(object me)
{
	write(@HELP
指令格式：xkxe2e grantleave | givearmor | giveweapon | gate | closedoor | hurt | wound | lowqi | grindprep | yanzhougrind | haidaowo | dadong | yongdao2 | bingqi | shanding | shanxia

仅在服务器开启 e2e 开关（/adm/etc/xkd_e2e）时可用，供自动化测试：
  grantleave  — 模拟岛主放行
  givearmor   — 发放同槽护具（油布雨衣）供换装测试
  giveweapon  — 发放钢刀供换装测试
  haidaowo    — 传送到海盗窝（受伤/小/老海盗）
  dadong      — 传送到大山洞（挂机寻路途经 yongdao10 回归）
  yingbin     — 传送到迎宾馆（要粥吃喝 / 煎饼）
  gate        — 传送到侠客岛石门
  closedoor   — 关闭当前房间 enter 方向的门（石门）
  hurt        — 造成少量气血伤害并触发 player.vitals 推送
  wound       — 降低气的受伤上限（eff_qi < max_qi）并推送 vitals
  tovoid      — 传送到 VOID（最後乐园）并污染 startroom，供落点救援回归
  zuixianlou  — 传送到扬州醉仙楼（店小二商店）
  dangpu      — 传送到扬州当铺（出售物品回归）
  givemoney   — 发放二十两白银供购买回归
  givesellitem — 发放一柄长剑供当铺出售回归
  givesellrabbit — 发放一块兔肉供多词物品 ID 回归
  lowqi       — 将气血降至约 15%（挂机低血撤回回归）
  lowjingli   — 将精力降至可走动阈值以下（挂机赶路调息回归）
  grindprep   — 传送到小海龟刷怪沙滩（shatans2）
  yanzhougrind — 传送到扬州城南练级路入口民屋（免费休整）
  studyrecoverprep — 经验 251 且精神不足，供石壁领悟睡觉恢复回归
  yongdao2    — 传送到迎宾馆西侧甬道（洞/钻场景解析回归）
  bingqi      — 传送到兵器房（取用器械回归）
  shanding    — 传送到山顶（黄衣弟子/中伯 dizi 歧义回归）
  shanxia     — 传送到山脚下（木桩 strike 回归）
HELP
	);
	return 1;
}
