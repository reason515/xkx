// xkxe2e.c — gated helpers for automated leave-island tests
// Enabled only when /adm/etc/xkd_e2e exists (deploy creates it for e2e).

#define WEBD "/adm/daemons/webd"

inherit F_CLEAN_UP;

int main(object me, string arg)
{
	if (file_size("/adm/etc/xkd_e2e") < 0)
		return notify_fail("什么？\n");
	if (!objectp(me) || !me->query_temp("web_client"))
		return notify_fail("什么？\n");

	if (!arg || arg == "")
		return notify_fail("用法：xkxe2e grantleave\n");

	if (arg == "grantleave") {
		me->set_temp("marks/离", 1);
		tell_object(me, "（测试）岛主已准你离岛。\n");
		return 1;
	}

	return notify_fail("未知子命令。\n");
}

int help(object me)
{
	write(@HELP
指令格式：xkxe2e grantleave

仅在服务器开启 e2e 开关（/adm/etc/xkd_e2e）时可用，供自动化测试模拟岛主放行。
HELP
	);
	return 1;
}
