// webd.c — structured JSON events for Web clients (dual output, Telnet unaffected)

#include <ansi.h>
#include <room.h>

#define WEBD "/adm/daemons/webd"

inherit F_DBASE;

void send_room(object me, object env);

void create()
{
	seteuid(getuid());
}

string json_escape(string s)
{
	if (!stringp(s)) return "";
	s = replace_string(s, "\\", "\\\\");
	s = replace_string(s, "\"", "\\\"");
	s = replace_string(s, "\n", "\\n");
	s = replace_string(s, "\r", "");
	return s;
}

void emit_raw(object me, string json)
{
	if (!objectp(me) || !userp(me)) return;
	if (!me->query_temp("web_client")) return;
	tell_object(me, "@@JSON@@" + json + "@@ENDJSON@@\n");
}

void emit(object me, mapping data)
{
	string *pairs, k, v;

	if (!mapp(data)) return;
	pairs = ({ sprintf("\"v\":1") });
	foreach (k, v in data) {
		if (intp(v))
			pairs += ({ sprintf("\"%s\":%d", k, v) });
		else if (stringp(v))
			pairs += ({ sprintf("\"%s\":\"%s\"", k, json_escape(v)) });
	}
	emit_raw(me, "{" + implode(pairs, ",") + "}");
}

void mark_web(object me)
{
	object env, link;
	string file;

	if (!objectp(me)) return;
	me->set_temp("web_client", 1);

	// Web 客户端跳过沙滩迎宾 → 挂名锁房；旧号卡在锁房时也会脱出
	if (me->query("registered") != "yes") {
		me->set("registered", "yes");
		link = me->query_temp("link_ob");
		if (objectp(link)) {
			link->set("registered", "yes");
			link->save();
		}
		me->save();
	}
	me->delete("block");
	me->delete_temp("xkd/sign");

	env = environment(me);
	if (objectp(env)) {
		file = base_name(env);
		if (file == "/d/xiakedao/shatan1" ||
		    file == "/d/xiakedao/register" ||
		    file == "/adm/register/reg_room") {
			tell_object(me, "已跳过挂名手续，你可以直接在岛上活动了。\n");
			me->move("/d/xiakedao/shatan");
			me->set("startroom", "/d/xiakedao/shatan");
			this_object()->send_room(me, environment(me));
		}
	}
}

void send_room(object me, object env)
{
	mapping exits;
	string *dirs, *elist, dir, dest;
	object *inv, ob;
	mapping event;
	string *npcs, *items;

	if (!objectp(me) || !objectp(env)) return;

	event = ([
		"type": "room.update",
		"title": env->query("short") || "",
		"long": env->query("long") || "",
	]);

	elist = ({});
	if (mapp(exits = env->query("exits"))) {
		dirs = keys(exits);
		foreach (dir in dirs) {
			if ((int)env->query_door(dir, "status") & DOOR_CLOSED) continue;
			dest = exits[dir];
			if (objectp(ob = find_object(dest)))
				elist += ({ sprintf("{\"dir\":\"%s\",\"name\":\"%s\"}", dir, json_escape(ob->query("short") || dir)) });
			else
				elist += ({ sprintf("{\"dir\":\"%s\",\"name\":\"%s\"}", dir, dir) });
		}
	}
	event["exits_json"] = "[" + implode(elist, ",") + "]";

	npcs = ({});
	items = ({});
	inv = all_inventory(env);
	foreach (ob in inv) {
		if (ob == me || !me->visible(ob)) continue;
		if (ob->is_character())
			npcs += ({ sprintf("{\"id\":\"%s\",\"name\":\"%s\",\"kind\":\"npc\"}", json_escape(ob->query("id") || ""), json_escape(ob->name() || "")) });
		else
			items += ({ sprintf("{\"id\":\"%s\",\"name\":\"%s\",\"kind\":\"item\"}", json_escape(ob->query("id") || ""), json_escape(ob->name() || "")) });
	}

	emit_raw(me, sprintf(
		"{\"v\":1,\"type\":\"room.update\",\"title\":\"%s\",\"long\":\"%s\",\"exits\":%s,\"npcs\":[%s],\"items\":[%s]}",
		json_escape(env->query("short") || ""),
		json_escape(env->query("long") || ""),
		event["exits_json"],
		implode(npcs, ","),
		implode(items, ",")
	));
}

void send_vitals(object me)
{
	mapping my;
	if (!objectp(me)) return;
	my = me->query_entire_dbase();
	emit_raw(me, sprintf(
		"{\"v\":1,\"type\":\"player.vitals\",\"vitals\":{\"qi\":%d,\"maxQi\":%d,\"jing\":%d,\"maxJing\":%d,\"jingli\":%d,\"maxJingli\":%d,\"neili\":%d,\"maxNeili\":%d,\"food\":%d,\"maxFood\":%d,\"water\":%d,\"maxWater\":%d,\"potential\":%d,\"exp\":%d}}",
		my["qi"], my["max_qi"], my["jing"], my["max_jing"],
		my["jingli"], my["max_jingli"], my["neili"], my["max_neili"],
		my["food"], me->max_food_capacity(), my["water"], me->max_water_capacity(),
		me->query("potential"), my["combat_exp"]
	));
}

void send_assist_status(object me, int active, string message)
{
	emit_raw(me, sprintf(
		"{\"v\":1,\"type\":\"assist.status\",\"active\":%d,\"message\":\"%s\"}",
		active, json_escape(message || "")
	));
}

void send_train_event(object me, string text)
{
	emit_raw(me, sprintf(
		"{\"v\":1,\"type\":\"train.event\",\"text\":\"%s\"}",
		json_escape(text || "")
	));
}

void send_combat_event(object me, string text)
{
	emit_raw(me, sprintf(
		"{\"v\":1,\"type\":\"combat.event\",\"text\":\"%s\"}",
		json_escape(text || "")
	));
}
