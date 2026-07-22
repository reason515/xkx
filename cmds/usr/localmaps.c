// localmaps.c — 简易本地地图

#include <ansi.h>

inherit F_CLEAN_UP;

int main(object me, string arg)
{
	string area, file, *parts;
	object env = environment(me);

	if (!env) {
		write("你目前不在任何地方。\n");
		return 1;
	}

	write(HIC "\n■ 你在这里\n" NOR);
	write(sprintf("  %s\n", env->query("short") || "未知地点"));
	
	file = base_name(env);
	parts = explode(file, "/");
	
	// 根据区域显示不同的地图提示
	if (sizeof(parts) >= 2 && parts[0] == "d")
		area = parts[1];
	
	if (area == "newbie_lxsz") {
		write(HIG "\n柳秀山庄周边：\n" NOR);
		write("  ┌─────────────┐\n");
		write("  │   杏子林    │\n");
		write("  │     │       │\n");
		write("  │  车马行     │\n");
		write("  │     │       │\n");
		write("  │  山庄大门   │\n");
		write("  │   → 正厅   │\n");
		write("  │   → 尚武堂  │\n");
		write("  │   → 藏书阁  │\n");
		write("  └─────────────┘\n");
		write("  方向：north/south/east/west\n");
	} else if (area == "city") {
		write(HIG "\n扬州城简图：\n" NOR);
		write("  ask about here 可了解本地信息。\n");
	} else {
		write("  附近出口：");
		mapping exits = env->query("exits");
		if (mapp(exits)) {
			string *dirs = keys(exits);
			write(implode(dirs, "、") + "\n");
		} else {
			write("无\n");
		}
	}
	
	return 1;
}

int help(object me)
{
	write(@HELP
指令格式：localmaps

显示当前区域的简易地图。
HELP
	);
	return 1;
}
