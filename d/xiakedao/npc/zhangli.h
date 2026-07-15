//Cracked by Roath
void escort_to_register(object me);
void watch_follow(object me, int n);

void init()
{
	object me = this_player();
	::init();
	if (interactive(me)) {
		remove_call_out("greeting");
		call_out("greeting", 1, me);
		// 问候可能落在 Web 登录静默期；监视 follow，一点就传送
		remove_call_out("watch_follow");
		call_out("watch_follow", 2, me, 0);
	}
}

void greeting(object me)
{
	if (!objectp(me) || !interactive(me)) return;
	if (query_temp("met") == 0) {
		if (me->query_temp("greeted") <= 0) {
			set_temp("met", 1);
			set_temp("xkd/guest", me->query("id"));
			me->set_temp("greeted", 1);
			command("bow " + me->query("id"));
			command("say 侠客岛" + query("nickname")+"，奉岛主之命，恭迎" + me->query("name") + "，请跟我来。\n"+
			"    "+HBRED+HIW"(follow " + query("id") +")"NOR);
			// 再 tell 一次，避免 say 在 Web 登录窗口被吞掉
			tell_object(me, "请跟我来。(follow " + query("id") + ")\n");
			remove_call_out("check_follow");
			call_out("check_follow", 5, me, 0);
		}
	} else {
		if (me->query_temp("greeted") == 0) {
			me->set_temp("greeted", -1);
			command("sorry " + me->query("id"));
			command("say 现在宾客太多，请等一下。");
		}
		remove_call_out("greeting");
		call_out("greeting", 1, me);
	}
}

void escort_to_register(object me)
{
	if (!objectp(me) || environment(me) != environment()) return;
	command("tell " + me->query("id") + " 请这边来");
	message_vision("$N拉起$n的手，身形一闪就不知去向了。\n", this_object(), me);
	move("/d/xiakedao/register");
	me->move("/d/xiakedao/register");
	message_vision("$N拉着$n的手闪了进来。\n", this_object(), me);
	command("say " + RANK_D->query_respect(me) + "你先要在这登记下。");
	command("bye " + me->query("id"));
	message_vision("$N说玩转身走了出去。\n", this_object());
	me->set_leader(0);
	move("/d/xiakedao/shatan1");
	set_temp("met", 0);
	remove_call_out("watch_follow");
	remove_call_out("check_follow");
}

void watch_follow(object me, int n)
{
	if (!objectp(me) || !environment(me)) return;
	if (environment(me) != environment()) return;
	if (me->query_leader() == this_object()) {
		escort_to_register(me);
		return;
	}
	if (n < 30) call_out("watch_follow", 2, me, n + 1);
}

int check_follow(object me, int count)
{
	string curguest;
	curguest = query_temp("xkd/guest");
	if (!(present(curguest, environment(this_object())))) {
		move("/d/xiakedao/shatan1");
		set_temp("met", 0);
		return 1;
	}
	if ((me->query_leader() == this_object()) || (count > 0)) {
		escort_to_register(me);
	} else {
		command("tell " + me->query("id") + " 请快跟我来。(请键入"+HBRED+HIW"follow " + query("id") + NOR")");
		call_out("check_follow", 10, me, 1);
	}
	return 1;
}
