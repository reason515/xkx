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
		return notify_fail("用法：xkxe2e grantleave | givearmor | giveweapon\n");

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
指令格式：xkxe2e grantleave | givearmor | giveweapon

仅在服务器开启 e2e 开关（/adm/etc/xkd_e2e）时可用，供自动化测试：
  grantleave  — 模拟岛主放行
  givearmor   — 发放同槽护具（油布雨衣）供换装测试
  giveweapon  — 发放钢刀供换装测试
HELP
	);
	return 1;
}
