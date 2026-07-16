// webclient.c — mark Web client for structured room/vitals (no skip-intro side effects)

#define WEBD "/adm/daemons/webd"

inherit F_CLEAN_UP;

int main(object me, string arg)
{
	object env;

	if (!objectp(me)) return 0;
	WEBD->mark_web_client(me);
	env = environment(me);
	if (objectp(env))
		WEBD->send_room(me, env);
	WEBD->send_vitals(me);
	return 1;
}

int help(object me)
{
	write(@HELP
指令格式：webclient

标记当前会话为 Web 客户端，以便接收结构化场景与气血推送。
HELP
	);
	return 1;
}
