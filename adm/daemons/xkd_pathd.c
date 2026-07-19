// xkd_pathd.c — 侠客岛挂机练级用小图寻路（白名单 BFS）

inherit F_DBASE;

#define PREFIX "/d/xiakedao/"

void create()
{
	seteuid(getuid());
}

/* 挂机可通行房间（沙滩刷怪 ↔ 瀑布 ↔ 甬道 ↔ 大洞/休息室 ↔ 海盗窝 ↔ 石壁）。 */
string *whitelist()
{
	return ({
		PREFIX + "shatan",
		PREFIX + "shatans2",
		PREFIX + "shatans3",
		PREFIX + "shatann1",
		PREFIX + "shatann2",
		PREFIX + "shatann3",
		PREFIX + "haibian1",
		PREFIX + "haibian2",
		PREFIX + "haibian3",
		PREFIX + "xiaolu",
		PREFIX + "xiaolu2",
		PREFIX + "ybting",
		PREFIX + "shanlu1",
		PREFIX + "shanlu2",
		PREFIX + "shanlu3",
		PREFIX + "shanding",
		PREFIX + "yelin",
		PREFIX + "haidaowo",
		PREFIX + "haidaowo1",
		PREFIX + "wanghait",
		PREFIX + "pubu",
		PREFIX + "yongdao1",
		PREFIX + "yongdao2",
		PREFIX + "yongdao3",
		PREFIX + "yongdao4",
		PREFIX + "yongdao5",
		PREFIX + "shibi",
		PREFIX + "dadong",
		PREFIX + "xiuxi",
	});
}

int is_xiakedao(object env)
{
	string file;

	if (!objectp(env)) return 0;
	file = base_name(env);
	return strsrch(file, PREFIX) == 0;
}

string room_path(object env)
{
	if (!objectp(env)) return "";
	return base_name(env);
}

/* 刷怪房：由弱到强 */
string *spawn_rooms(string target_key)
{
	if (target_key == "monkey")
		return ({ PREFIX + "shibi" });
	if (target_key == "haigui_s")
		return ({ PREFIX + "shatans2", PREFIX + "shatann1" });
	if (target_key == "haigui")
		return ({ PREFIX + "shatans3", PREFIX + "shatann3" });
	if (target_key == "haidao_w"
	 || target_key == "haidao_s"
	 || target_key == "haidao_o")
		return ({ PREFIX + "haidaowo1" });
	return ({});
}

int is_spawn_room(object env, string target_key)
{
	string *spawns, path;
	int i;

	if (!objectp(env)) return 0;
	path = room_path(env);
	spawns = spawn_rooms(target_key);
	for (i = 0; i < sizeof(spawns); i++)
		if (path == spawns[i]) return 1;
	return 0;
}

int grind_target_match(object ob, string target_key)
{
	string file;

	if (!objectp(ob)) return 0;
	file = base_name(ob);
	if (target_key == "monkey")
		return strsrch(file, "/monkey") >= 0 || ob->id("monkey");
	if (target_key == "haigui_s")
		return strsrch(file, "haigui_s") >= 0 || ob->id("small haigui");
	if (target_key == "haigui")
		return strsrch(file, "haigui_s") < 0
		    && (strsrch(file, "/haigui") >= 0 || ob->query("id") == "haigui");
	if (target_key == "haidao_w")
		return strsrch(file, "haidao_w") >= 0 || ob->id("shang haidao");
	if (target_key == "haidao_s")
		return strsrch(file, "haidao_s") >= 0 || ob->id("xiao haidao");
	if (target_key == "haidao_o")
		return strsrch(file, "haidao_o") >= 0 || ob->id("lao haidao");
	return 0;
}

/* 匹配练级目标：只取仍存活的 NPC */
object find_grind_target(object env, string target_key)
{
	object *inv, ob;
	int i;

	if (!objectp(env) || !stringp(target_key) || target_key == "")
		return 0;
	if (!sizeof(spawn_rooms(target_key))) return 0;
	inv = all_inventory(env);
	for (i = 0; i < sizeof(inv); i++) {
		ob = inv[i];
		if (!objectp(ob) || !ob->is_character() || userp(ob)) continue;
		if (!living(ob)) continue;
		if (grind_target_match(ob, target_key)) return ob;
	}
	return 0;
}

int in_whitelist(string path)
{
	return member_array(path, whitelist()) != -1;
}

/* 邻接：({ dest_path, action }) action 为 "go east" 或 "jump fall" */
mixed *neighbors(string path)
{
	object room, dest;
	mapping exits;
	string *dirs, dir, dest_path;
	mixed *out;

	out = ({});
	if (!in_whitelist(path)) return out;

	room = find_object(path);
	if (!objectp(room)) room = load_object(path);
	if (!objectp(room)) return out;

	if (mapp(exits = room->query("exits"))) {
		dirs = keys(exits);
		foreach (dir in dirs) {
			if (!stringp(exits[dir]) && !objectp(exits[dir])) continue;
			if (objectp(exits[dir]))
				dest_path = base_name(exits[dir]);
			else {
				dest_path = exits[dir];
				if (strsrch(dest_path, ".c") > 0)
					dest_path = replace_string(dest_path, ".c", "");
				if (objectp(dest = find_object(dest_path)))
					dest_path = base_name(dest);
				else if (objectp(dest = load_object(dest_path)))
					dest_path = base_name(dest);
			}
			if (!in_whitelist(dest_path)) continue;
			out += ({ ({ dest_path, "go " + dir }) });
		}
	}

	/* 瀑布进洞：普通 exits 只有 out，进洞靠 jump fall */
	if (path == PREFIX + "pubu")
		out += ({ ({ PREFIX + "yongdao1", "jump fall" }) });
	/* 甬道 ↔ 石壁：靠 zuan hole */
	if (path == PREFIX + "yongdao2")
		out += ({ ({ PREFIX + "shibi", "zuan hole" }) });
	if (path == PREFIX + "shibi")
		out += ({ ({ PREFIX + "yongdao2", "zuan hole" }) });

	return out;
}

/* BFS：返回从 from 到 to 的动作序列（string *），不可达返回 0 */
string *find_path(string from, string to)
{
	string *queue, *path_acts, *seen;
	mapping prev_act, prev_node;
	string cur, nxt, act;
	mixed *nbs, pair;
	int head, i;

	if (!stringp(from) || !stringp(to) || from == "" || to == "")
		return 0;
	if (from == to) return ({});
	if (!in_whitelist(from) || !in_whitelist(to)) return 0;

	queue = ({ from });
	seen = ({ from });
	prev_act = ([]);
	prev_node = ([]);
	head = 0;

	while (head < sizeof(queue)) {
		cur = queue[head++];
		nbs = neighbors(cur);
		for (i = 0; i < sizeof(nbs); i++) {
			pair = nbs[i];
			nxt = pair[0];
			act = pair[1];
			if (member_array(nxt, seen) != -1) continue;
			seen += ({ nxt });
			prev_act[nxt] = act;
			prev_node[nxt] = cur;
			if (nxt == to) {
				path_acts = ({});
				while (nxt != from) {
					path_acts = ({ prev_act[nxt] }) + path_acts;
					nxt = prev_node[nxt];
				}
				return path_acts;
			}
			queue += ({ nxt });
		}
	}
	return 0;
}

/* 最近刷怪房路径 */
string *path_to_nearest_spawn(object me, string target_key)
{
	string from, *spawns, *path, *try_path;
	int i, best_len;

	if (!objectp(me) || !environment(me)) return 0;
	from = room_path(environment(me));
	spawns = spawn_rooms(target_key);
	if (!sizeof(spawns)) return 0;

	best_len = 9999;
	path = 0;
	for (i = 0; i < sizeof(spawns); i++) {
		try_path = find_path(from, spawns[i]);
		if (!arrayp(try_path)) continue;
		if (sizeof(try_path) < best_len) {
			best_len = sizeof(try_path);
			path = try_path;
		}
	}
	return path;
}

string *path_to_room(object me, string dest)
{
	string from;

	if (!objectp(me) || !environment(me) || !stringp(dest))
		return 0;
	from = room_path(environment(me));
	return find_path(from, dest);
}

int ensure_rain_coat(object me)
{
	object coat;

	if (!objectp(me)) return 0;
	coat = present("rain coat", me);
	if (!objectp(coat)) {
		me->force_me("climb tree");
		coat = present("rain coat", me);
	}
	if (!objectp(coat)) return 0;
	if (coat->query("equipped") != "worn")
		me->force_me("wear rain coat");
	return coat->query("equipped") == "worn";
}

/* 执行一步；成功返回 1 */
int take_step(object me, string action)
{
	if (!objectp(me) || !stringp(action) || action == "") return 0;
	if (me->is_busy() || me->is_fighting()) return 0;

	if (action == "jump fall") {
		if (room_path(environment(me)) != PREFIX + "pubu")
			return 0;
		if (!ensure_rain_coat(me)) return 0;
		me->force_me("jump fall");
		return room_path(environment(me)) == PREFIX + "yongdao1";
	}

	{
		string dir;
		if (sscanf(action, "go %s", dir) == 1)
			return me->force_me("go " + dir);
	}
	return me->force_me(action);
}

/* 沿 path 走一步，返回剩余路径（可能缩短）；走不动则原样返回 */
string *advance_path(object me, string *path)
{
	string act;

	if (!arrayp(path) || !sizeof(path)) return path;
	act = path[0];
	if (take_step(me, act))
		return path[1..];
	return path;
}
