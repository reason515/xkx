// webd.c — structured JSON events for Web clients (dual output, Telnet unaffected)

#include <ansi.h>
#include <room.h>

#define WEBD "/adm/daemons/webd"

inherit F_DBASE;

void send_room(object me, object env);

/* 房间结构变化（出口/描写）后，通知房内所有 Web 客户端刷新场景。 */
void notify_room(object env)
{
	object *inv, ob;
	int i;

	if (!objectp(env)) return;
	inv = all_inventory(env);
	for (i = 0; i < sizeof(inv); i++) {
		ob = inv[i];
		if (!objectp(ob) || !userp(ob) || !interactive(ob)) continue;
		if (!ob->query_temp("web_client")) continue;
		send_room(ob, env);
	}
}

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

/* 仅标记 Web 客户端，不跳过迎宾/引导。 */
void mark_web_client(object me)
{
	if (!objectp(me)) return;
	me->set_temp("web_client", 1);
}

/* 兼容旧调用：与 mark_web_client 相同，勿再瞬移。 */
void mark_web(object me)
{
	mark_web_client(me);
}

void send_room(object me, object env)
{
	mapping exits, item_desc;
	string *dirs, *elist, *dlist, dir, dest, door_name, door_status;
	object *inv, ob;
	mapping event;
	string *npcs, *items, *command_ids;
	string area, file, *parts, item_desc_text, item_key, command_id, candidate;
	mixed item_value;
	int i, door_st;

	if (!objectp(me) || !objectp(env)) return;

	area = env->query("outdoors");
	if (!stringp(area) || area == "") {
		file = base_name(env);
		parts = explode(file, "/");
		/* /d/<area>/... → take segment after "d" */
		for (i = 0; i < sizeof(parts) - 1; i++) {
			if (parts[i] == "d" && stringp(parts[i + 1]) && parts[i + 1] != "") {
				area = parts[i + 1];
				break;
			}
		}
	}
	if (!stringp(area)) area = "";

	/*
	 * Include static item_desc prose so Web can expose nested scenery:
	 * room long「深涧(stream)」→ item_desc「鱼儿(fish)」.
	 * Only string values are safe; closures/functions remain server-side.
	 */
	item_desc_text = "";
	item_desc = env->query("item_desc");
	if (mapp(item_desc)) {
		foreach (item_key, item_value in item_desc) {
			if (!stringp(item_value) || item_value == "") continue;
			item_desc_text += "@@ITEM:" + item_key + "@@\n" + item_value + "\n";
		}
	}

	/* Room file key for map disambiguation, e.g. "shatan" from /d/xiakedao/shatan */
	file = base_name(env);
	parts = explode(file, "/");
	if (sizeof(parts) > 0)
		file = parts[sizeof(parts) - 1];
	else
		file = "";

	event = ([
		"type": "room.update",
		"title": env->query("short") || "",
		"long": env->query("long") || "",
	]);

	elist = ({});
	dlist = ({});
	if (mapp(exits = env->query("exits"))) {
		dirs = keys(exits);
		foreach (dir in dirs) {
			door_st = (int)env->query_door(dir, "status");
			if (door_st & DOOR_CLOSED) {
				door_name = env->query_door(dir, "name");
				if (!stringp(door_name) || door_name == "")
					door_name = "门";
				door_status = (door_st & DOOR_LOCKED) ? "locked" : "closed";
				dlist += ({ sprintf(
					"{\"dir\":\"%s\",\"name\":\"%s\",\"status\":\"%s\"}",
					dir, json_escape(door_name), door_status
				) });
				continue;
			}
			dest = exits[dir];
			if (objectp(ob = find_object(dest)))
				elist += ({ sprintf("{\"dir\":\"%s\",\"name\":\"%s\"}", dir, json_escape(ob->query("short") || dir)) });
			else
				elist += ({ sprintf("{\"dir\":\"%s\",\"name\":\"%s\"}", dir, dir) });
		}
	}
	event["exits_json"] = "[" + implode(elist, ",") + "]";
	event["doors_json"] = "[" + implode(dlist, ",") + "]";

	npcs = ({});
	items = ({});
	inv = all_inventory(env);
	foreach (ob in inv) {
		if (ob == me || !me->visible(ob)) continue;
		if (ob->is_character()) {
			command_id = ob->query("id") || "";
			if (function_exists("parse_command_id_list", ob)) {
				command_ids = ob->parse_command_id_list();
				foreach (candidate in command_ids) {
					if (stringp(candidate) && candidate != "" && strsrch(candidate, " ") < 0) {
						command_id = candidate;
						break;
					}
				}
			}
			npcs += ({ sprintf(
				"{\"id\":\"%s\",\"commandId\":\"%s\",\"name\":\"%s\",\"kind\":\"npc\",\"canApprentice\":%d,\"canTrade\":%d}",
				json_escape(ob->query("id") || ""),
				json_escape(command_id),
				json_escape(ob->name() || ""),
				(!userp(ob) && mapp(ob->query("family"))) ? 1 : 0,
				arrayp(ob->query("vendor_goods")) ? 1 : 0
			) });
		} else
			items += ({ sprintf("{\"id\":\"%s\",\"name\":\"%s\",\"kind\":\"item\"}", json_escape(ob->query("id") || ""), json_escape(ob->name() || "")) });
	}

	emit_raw(me, sprintf(
		"{\"v\":1,\"type\":\"room.update\",\"title\":\"%s\",\"long\":\"%s\",\"itemDesc\":\"%s\",\"area\":\"%s\",\"path\":\"%s\",\"canSleep\":%d,\"exits\":%s,\"doors\":%s,\"npcs\":[%s],\"items\":[%s]}",
		json_escape(env->query("short") || ""),
		json_escape(env->query("long") || ""),
		json_escape(item_desc_text),
		json_escape(area),
		json_escape(file),
		(env->query("sleep_room") && !env->query("no_sleep_room")) ? 1 : 0,
		event["exits_json"],
		event["doors_json"],
		implode(npcs, ","),
		implode(items, ",")
	));
}

void send_vitals(object me)
{
	mapping my;
	if (!objectp(me)) return;
	my = me->query_entire_dbase();
	/* maxQi/maxJing = 先天上限；effQi/effJing = 受伤后当前上限（与 hp 第二列一致）。 */
	emit_raw(me, sprintf(
		"{\"v\":1,\"type\":\"player.vitals\",\"vitals\":{\"qi\":%d,\"maxQi\":%d,\"effQi\":%d,\"jing\":%d,\"maxJing\":%d,\"effJing\":%d,\"jingli\":%d,\"maxJingli\":%d,\"neili\":%d,\"maxNeili\":%d,\"food\":%d,\"maxFood\":%d,\"water\":%d,\"maxWater\":%d,\"potential\":%d,\"exp\":%d}}",
		my["qi"], my["max_qi"], my["eff_qi"], my["jing"], my["max_jing"], my["eff_jing"],
		my["jingli"], my["max_jingli"], my["neili"], my["max_neili"],
		my["food"], me->max_food_capacity(), my["water"], me->max_water_capacity(),
		me->query("potential"), my["combat_exp"]
	));
}

/* 战斗连击时合并同轮推送，避免每下都刷 JSON。 */
void flush_vitals(object me)
{
	if (!objectp(me)) return;
	me->delete_temp("web_vitals_pending");
	if (!userp(me) || !me->query_temp("web_client")) return;
	send_vitals(me);
}

void notify_vitals(object me)
{
	if (!objectp(me) || !userp(me)) return;
	if (!me->query_temp("web_client")) return;
	if (me->query_temp("web_vitals_pending")) return;
	me->set_temp("web_vitals_pending", 1);
	call_out("flush_vitals", 0, me);
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
