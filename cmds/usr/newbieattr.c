// newbieattr.c — 毕业属性确认（Web 专用，不直接暴露给文字客户端玩家）
// 调用方式：newbieattr str 18 int 24 con 20 dex 18
// 仅 Web 客户端可用，校验通过后执行毕业结算。

#include <ansi.h>

inherit F_CLEAN_UP;

int main(object me, string arg)
{
	int str, dex, con, intel, sum;

	if (!arg || sscanf(arg, "str %d int %d con %d dex %d", str, intel, con, dex) != 4) {
		write("参数错误。\n");
		return 1;
	}

	// 仅 Web 客户端允许（防文字客户端误用）
	if (!me->query_temp("web_client") && !wizardp(me)) {
		write("该命令仅支持 Web 客户端。\n");
		return 1;
	}

	// 状态校验
	if (me->query("newbie_village/exit_state") != "attr_pending") {
		write("当前不需要设定天赋。\n");
		return 1;
	}
	if (me->query("newbie_village/attr_respec_used")) {
		write("天赋已设定，不可更改。\n");
		return 1;
	}

	// 数值校验
	sum = str + dex + con + intel;
	if (sum != 80) {
		write(sprintf("天赋总和必须为 80，当前为 %d。\n", sum));
		return 1;
	}
	if (str < 10 || str > 30 || intel < 10 || intel > 30
	 || con < 10 || con > 30 || dex < 10 || dex > 30) {
		write("每项天赋必须在 10-30 之间。\n");
		return 1;
	}

	// 写入最终四维
	me->set("str", str);
	me->set("dex", dex);
	me->set("con", con);
	me->set("int", intel);
	me->set("newbie_village/attr_respec_used", 1);
	me->set("newbie_village/exit_state", "graduated");

	// 推 Web 事件：属性已确认
	WEBD->emit_raw(me, sprintf(
		"{\"v\":1,\"type\":\"newbie.attribute_confirmed\",\"attrs\":{\"str\":%d,\"int\":%d,\"con\":%d,\"dex\":%d}}",
		str, intel, con, dex
	));

	// 执行毕业结算
	load_object("/d/newbie_lxsz/mache")->do_graduate(me);

	return 1;
}

int help(object me)
{
	write(@HELP
Web 客户端的毕业属性确认命令。玩家无需手动输入。
HELP
	);
	return 1;
}
