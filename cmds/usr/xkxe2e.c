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
		return notify_fail("用法：xkxe2e grantleave | givearmor | giveweapon | gate | closedoor | hurt | grindprep | yongdao2 | bingqi\n");

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

	if (arg == "hurt") {
		int before, after;
		before = (int)me->query("qi");
		if (before < 20)
			me->set("qi", 80);
		before = (int)me->query("qi");
		me->receive_damage("qi", 15, "e2e");
		after = (int)me->query("qi");
		tell_object(me, sprintf("（测试）气血 %d → %d。\n", before, after));
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
		me->set_temp("marks/离", 1);
		tell_object(me, "（测试）岛主已准你离岛。\n");
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

	return notify_fail("未知子命令。\n");
}

int help(object me)
{
	write(@HELP
指令格式：xkxe2e grantleave | givearmor | giveweapon | gate | closedoor | hurt | grindprep | yongdao2 | bingqi

仅在服务器开启 e2e 开关（/adm/etc/xkd_e2e）时可用，供自动化测试：
  grantleave  — 模拟岛主放行
  givearmor   — 发放同槽护具（油布雨衣）供换装测试
  giveweapon  — 发放钢刀供换装测试
  gate        — 传送到侠客岛石门
  closedoor   — 关闭当前房间 enter 方向的门（石门）
  hurt        — 造成少量气血伤害并触发 player.vitals 推送
  grindprep   — 传送到小海龟刷怪沙滩（shatans2）
  yongdao2    — 传送到迎宾馆西侧甬道（洞/钻场景解析回归）
  bingqi      — 传送到兵器房（取用器械回归）
HELP
	);
	return 1;
}
