// webclient.c — mark Web client for structured room/vitals (no skip-intro side effects)

#define WEBD "/adm/daemons/webd"

inherit F_CLEAN_UP;

int main(object me, string arg)
{
	object env;

	if (!objectp(me)) return 0;
	WEBD->mark_web_client(me);
	if (arg == "skills" || arg == "enable") {
		WEBD->send_skills_enable(me);
		return 1;
	}
	env = environment(me);
	if (objectp(env))
		WEBD->send_room(me, env);
	WEBD->send_vitals(me);
	/*
	 * 勿在进游戏默认路径同步扫全部武功 valid_enable：
	 * 技能多时会长时间占住指令队列，表现为「一进来就动不了」。
	 * 角色卡刷新会发 webclient skills 再拉。
	 */
	return 1;
}

int help(object me)
{
	write(@HELP
指令格式：webclient [skills]

标记当前会话为 Web 客户端，以便接收结构化场景与气血推送。
附加 skills 时仅推送各武功可激发门类（valid_enable）。
HELP
	);
	return 1;
}
