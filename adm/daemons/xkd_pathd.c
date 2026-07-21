// xkd_pathd.c — 侠客岛挂机练级用小图寻路（白名单 BFS）

#include <room.h>

inherit F_DBASE;

#define PREFIX "/d/xiakedao/"
#define YZ_PREFIX "/d/city/yangzhou_grind"
#define YZ_REST "/d/city/minwu1"
#define YZ_NPC_PREFIX "/d/city/npc/"
#define CITY_PREFIX "/d/city/"

void create()
{
	seteuid(getuid());
}

/* 挂机可通行房间：侠客岛白名单，以及扬州 /d/city/ 内的正常房间。 */
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
		PREFIX + "shanlu4",
		PREFIX + "shanxia",
		PREFIX + "xiaolu3",
		PREFIX + "caodi",
		PREFIX + "tulu",
		PREFIX + "shanding",
		PREFIX + "tree1",
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
		PREFIX + "yongdao10",
		PREFIX + "shibi",
		PREFIX + "dadong",
		PREFIX + "xiuxi",
		PREFIX + "yingbin",
		PREFIX + "bingqi",
		PREFIX + "liangong",
		PREFIX + "yangxinju",
		PREFIX + "xianliao",
		PREFIX + "shufang",
		PREFIX + "gate",
		PREFIX + "xiakexing1",
		PREFIX + "xiakexing2",
		PREFIX + "xiakexing3",
		PREFIX + "xkx1",
		PREFIX + "xkx3",
		PREFIX + "xkx5",
		PREFIX + "xkx9",
		YZ_REST,
		YZ_PREFIX + "1",
		YZ_PREFIX + "2",
		YZ_PREFIX + "3",
		YZ_PREFIX + "4",
		YZ_PREFIX + "5",
		YZ_PREFIX + "6",
		YZ_PREFIX + "7",
		YZ_PREFIX + "8",
	});
}

/* 扬州城内的稳定主干道；任意城市房间可先接入这些节点再寻路。 */
string *city_whitelist()
{
	return ({
		CITY_PREFIX + "guangchang",
		CITY_PREFIX + "beidajie1", CITY_PREFIX + "beidajie2",
		CITY_PREFIX + "nandajie1", CITY_PREFIX + "nandajie2", CITY_PREFIX + "nandajie3",
		CITY_PREFIX + "dongdajie1", CITY_PREFIX + "dongdajie2", CITY_PREFIX + "dongdajie3",
		CITY_PREFIX + "xidajie1", CITY_PREFIX + "xidajie2", CITY_PREFIX + "xidajie3",
		CITY_PREFIX + "dongnanjie", CITY_PREFIX + "xiangnanjie", YZ_REST,
		CITY_PREFIX + "beimen", CITY_PREFIX + "nanmen",
		CITY_PREFIX + "dongmen", CITY_PREFIX + "ximen",
		CITY_PREFIX + "beijiao1", CITY_PREFIX + "beijiao2", CITY_PREFIX + "beijiao3", CITY_PREFIX + "beijiao4",
		CITY_PREFIX + "nanjiao1", CITY_PREFIX + "nanjiao2", CITY_PREFIX + "nanjiao3", CITY_PREFIX + "nanjiao4",
		CITY_PREFIX + "dongjiao1", CITY_PREFIX + "dongjiao2", CITY_PREFIX + "dongjiao3", CITY_PREFIX + "dongjiao4",
		CITY_PREFIX + "xijiao1", CITY_PREFIX + "xijiao2", CITY_PREFIX + "xijiao3", CITY_PREFIX + "xijiao4",
		YZ_PREFIX + "1", YZ_PREFIX + "2", YZ_PREFIX + "3", YZ_PREFIX + "4",
		YZ_PREFIX + "5", YZ_PREFIX + "6", YZ_PREFIX + "7", YZ_PREFIX + "8",
	});
}

int is_city_room_path(string path)
{
	return stringp(path) && strsrch(path, CITY_PREFIX) == 0;
}

/* 石壁领悟：技能 id → 默认石室 */
string study_wall_room(string skill)
{
	if (skill == "taixuan-gong") return PREFIX + "xkx1";
	if (skill == "liuxing-bu") return PREFIX + "xkx3";
	if (skill == "wugou-jianfa") return PREFIX + "xkx5";
	if (skill == "wuyu-zhangfa") return PREFIX + "xkx9";
	return "";
}

string study_bskill(string skill)
{
	if (skill == "taixuan-gong") return "force";
	if (skill == "liuxing-bu") return "dodge";
	if (skill == "wugou-jianfa") return "sword";
	if (skill == "wuyu-zhangfa") return "strike";
	return "";
}

int is_xiakedao(object env)
{
	string file;

	if (!objectp(env)) return 0;
	file = base_name(env);
	return strsrch(file, PREFIX) == 0;
}

/* 扬州城内任意正常房间均可启动，寻路仅在 /d/city/ 内进行。 */
int is_yangzhou_grind(object env)
{
	string file;

	if (!objectp(env)) return 0;
	file = base_name(env);
	return is_city_room_path(file);
}

int is_grind_area(object env)
{
	return is_xiakedao(env) || is_yangzhou_grind(env);
}

int is_yangzhou_target(string target_key)
{
	return member_array(target_key, ({
		"yz_crow", "yz_monkey", "yz_goat", "yz_dog",
		"yz_boar", "yz_wolf", "yz_bandit", "yz_bandit_leader",
	})) != -1;
}

string room_path(object env)
{
	if (!objectp(env)) return "";
	return base_name(env);
}

/* 刷怪房：由弱到强（combat_exp：猴30→小龟50→龟80→雀100→鸦120→伤盗140→小盗180→老盗230） */
string *spawn_rooms(string target_key)
{
	if (target_key == "monkey")
		return ({ PREFIX + "shibi" });
	if (target_key == "haigui_s")
		return ({ PREFIX + "shatans2", PREFIX + "shatann1" });
	if (target_key == "haigui")
		return ({ PREFIX + "shatans3", PREFIX + "shatann3" });
	if (target_key == "maque")
		return ({ PREFIX + "shanlu3" });
	if (target_key == "wuya")
		return ({ PREFIX + "yelin" });
	if (target_key == "haidao_w"
	 || target_key == "haidao_s"
	 || target_key == "haidao_o")
		return ({ PREFIX + "haidaowo1" });
	if (target_key == "yz_crow") return ({ YZ_PREFIX + "1" });
	if (target_key == "yz_monkey") return ({ YZ_PREFIX + "2" });
	if (target_key == "yz_goat") return ({ YZ_PREFIX + "3" });
	if (target_key == "yz_dog") return ({ YZ_PREFIX + "4" });
	if (target_key == "yz_boar") return ({ YZ_PREFIX + "5" });
	if (target_key == "yz_wolf") return ({ YZ_PREFIX + "6" });
	if (target_key == "yz_bandit") return ({ YZ_PREFIX + "7" });
	if (target_key == "yz_bandit_leader") return ({ YZ_PREFIX + "8" });
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
	if (is_yangzhou_target(target_key))
		return file == YZ_NPC_PREFIX + target_key;
	if (target_key == "monkey")
		return strsrch(file, "/monkey") >= 0 || ob->id("monkey");
	if (target_key == "haigui_s")
		return strsrch(file, "haigui_s") >= 0 || ob->id("small haigui");
	if (target_key == "haigui")
		return strsrch(file, "haigui_s") < 0
		    && (strsrch(file, "/haigui") >= 0 || ob->query("id") == "haigui");
	if (target_key == "maque")
		return strsrch(file, "/maque") >= 0 || ob->id("ma que");
	if (target_key == "wuya")
		return strsrch(file, "/wuya") >= 0 || ob->id("wuya");
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
	if (member_array(path, whitelist()) != -1) return 1;
	return member_array(path, city_whitelist()) != -1;
}

/* 邻接：({ dest_path, action }) action 为 "go east" 或 "jump fall" */
mixed *neighbors(string path, int allow_city_start)
{
	object room, dest;
	mapping exits;
	string *dirs, dir, dest_path;
	int door_st;
	mixed *out;

	out = ({});
	/* 起点可为扬州任意房间；之后只沿稳定主干道，避免探路加载无关房间。 */
	if (!in_whitelist(path) && !(allow_city_start && is_city_room_path(path)))
		return out;

	room = find_object(path);
	/* catch：房间 reset 刷怪时若某物件编译失败，勿让错误冒泡掐断挂机寻路 */
	if (!objectp(room))
		catch(room = load_object(path));
	if (!objectp(room)) return out;

	if (mapp(exits = room->query("exits"))) {
		dirs = keys(exits);
		foreach (dir in dirs) {
			/* 锁门不能自动绕过；勿把它作为 BFS 的捷径。 */
			door_st = (int)room->query_door(dir, "status");
			if (door_st & DOOR_LOCKED) continue;
			if (!stringp(exits[dir]) && !objectp(exits[dir])) continue;
			if (objectp(exits[dir]))
				dest_path = base_name(exits[dir]);
			else {
				dest_path = exits[dir];
				if (strsrch(dest_path, ".c") > 0)
					dest_path = replace_string(dest_path, ".c", "");
				/* 扬州动态 BFS 只需出口路径；勿为探路加载无关房间。 */
				if (strsrch(path, "/d/city/") != 0) {
					if (objectp(dest = find_object(dest_path)))
						dest_path = base_name(dest);
					else {
						catch(dest = load_object(dest_path));
						if (objectp(dest))
							dest_path = base_name(dest);
					}
				}
			}
			/* 野林 east/west 自环：走了等于没走，勿纳入寻路 */
			if (!stringp(dest_path) || dest_path == "" || dest_path == path)
				continue;
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
	/* 大洞 → 甬道：屏风默认关闭，需 ask 岛主打开 enter */
	if (path == PREFIX + "dadong")
		out += ({ ({ PREFIX + "yongdao10", "enter yongdao" }) });
	/* 山顶 ↔ 树上：靠 pa up / pa down */
	if (path == PREFIX + "shanding")
		out += ({ ({ PREFIX + "tree1", "pa up" }) });
	if (path == PREFIX + "tree1")
		out += ({ ({ PREFIX + "shanding", "pa down" }) });

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
	if ((!in_whitelist(from) && !is_city_room_path(from)) || !in_whitelist(to))
		return 0;

	queue = ({ from });
	seen = ({ from });
	prev_act = ([]);
	prev_node = ([]);
	head = 0;

	while (head < sizeof(queue)) {
		cur = queue[head++];
		nbs = neighbors(cur, cur == from && is_city_room_path(from));
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

/* 最近刷怪房路径（不检查是否有活怪） */
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

/* 该刷怪房是否仍有存活目标 */
int spawn_has_live_target(string room_file, string target_key)
{
	object room;

	if (!stringp(room_file) || room_file == "") return 0;
	room = find_object(room_file);
	if (!objectp(room))
		catch(room = load_object(room_file));
	if (!objectp(room)) return 0;
	return objectp(find_grind_target(room, target_key));
}

/*
 * 前往「仍有活怪」的最近刷怪房。
 * exclude_here=1 时跳过当前房间（用于本地打光后换点，而非原地等刷）。
 * 若其它点也没有活怪，返回 0（由挂机逻辑决定是否等候刷新）。
 */
string *path_to_spawn_with_target(object me, string target_key, int exclude_here)
{
	string from, *spawns, *path, *try_path, dest;
	int i, best_len;

	if (!objectp(me) || !environment(me)) return 0;
	from = room_path(environment(me));
	spawns = spawn_rooms(target_key);
	if (!sizeof(spawns)) return 0;

	best_len = 9999;
	path = 0;
	for (i = 0; i < sizeof(spawns); i++) {
		dest = spawns[i];
		if (exclude_here && dest == from) continue;
		if (!spawn_has_live_target(dest, target_key)) continue;
		try_path = find_path(from, dest);
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

int ensure_door_open(object me, string dir)
{
	object env;
	string dname;
	int st;

	if (!objectp(me) || !stringp(dir) || dir == "") return 0;
	env = environment(me);
	if (!objectp(env)) return 0;
	st = (int)env->query_door(dir, "status");
	if (!(st & DOOR_CLOSED)) return 1;
	dname = env->query_door(dir, "name");
	if (!stringp(dname) || dname == "") dname = "门";
	me->force_me("open " + dname);
	st = (int)env->query_door(dir, "status");
	return !(st & DOOR_CLOSED);
}

/* 执行一步；成功返回 1 */
int take_step(object me, string action)
{
	object env;
	string dir, before;

	if (!objectp(me) || !stringp(action) || action == "") return 0;
	if (me->is_busy() || me->is_fighting()) return 0;
	env = environment(me);
	if (!objectp(env)) return 0;

	if (action == "jump fall") {
		if (room_path(env) != PREFIX + "pubu")
			return 0;
		if (!ensure_rain_coat(me)) return 0;
		me->force_me("jump fall");
		return room_path(environment(me)) == PREFIX + "yongdao1";
	}

	if (action == "enter yongdao") {
		if (room_path(env) != PREFIX + "dadong")
			return 0;
		me->force_me("ask si pu about 岛主");
		me->force_me("go enter");
		return room_path(environment(me)) == PREFIX + "yongdao10";
	}

	if (action == "pa up") {
		if (room_path(env) != PREFIX + "shanding")
			return 0;
		me->force_me("pa up");
		return room_path(environment(me)) == PREFIX + "tree1";
	}

	if (action == "pa down") {
		if (room_path(env) != PREFIX + "tree1")
			return 0;
		me->force_me("pa down");
		return room_path(environment(me)) == PREFIX + "shanding";
	}

	if (sscanf(action, "go %s", dir) == 1) {
		before = room_path(env);
		if (!ensure_door_open(me, dir)) return 0;
		me->force_me("go " + dir);
		return room_path(environment(me)) != before;
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
