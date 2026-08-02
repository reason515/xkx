// escort.c — 护镖公共文件（xkx2001 精简版）
// 移植自 pkuxkx feature/escort.c (seagate@pkuxkx 2012/01/03)
// 精简说明：移除 pkuxkx 专属依赖（combatgrade/REWARD_D/SPEWEEK_D/antirobot/
// 百晓生/神尼/铜雀台/escort_board 任务栏/密信附加任务/title 头衔），
// 保留核心闭环：接镖 → 推镖车 → 打劫匪 → 送抵 → 领赏/失败赔偿。
// 校验改用 combat_exp 门槛与时间戳间隔，condition 用时间戳替代。
//
// 镖局难度：5-7 新手镖局（劫匪≤2人）、8-12 普通镖局（≤3人）、13-15 长途（3-4人）
// 相关对象：/quest/escort/cart_target 收镖伙计、/quest/escort/obj/cart 镖车、
//           /quest/escort/cart_robber 劫匪

#include <ansi.h>
#include <localtime.h>

//镖局信息：city 为镖局所在城市 id，存放镖局名称、总镖头、难度、行镖时间(秒)
mapping escort_info =
([
"city" : (["escort":"扬州福威镖局", "boss" : "林震南", "bossid" : "lin zhennan", "diff" : 6, "time" : 720]),
"dali" : (["escort":"大理天龙镖局", "boss" : "段正淳", "bossid" : "duan zhengchun", "diff" : 8, "time" : 900]),
"beijing" : (["escort":"北京武胜镖局", "boss" : "王武通", "bossid" : "wang wutong", "diff" : 10, "time" : 1200]),
"hangzhou" : (["escort":"杭州昌隆镖局", "boss" : "左二把", "bossid" : "zuo erba", "diff" : 10, "time" : 1200]),
]);

mapping get_escort_info(string escort_id);
int query_escort_level(int level);
protected int get_escort_lvlexp(object me, int eslvl);
string quest_fail(object ppl);
void destobj(object ob);

//玩家从总镖头接镖。escort_id 为镖局 id，dart_info 为目的地参数数组
string get_dart(string escort_id, object ob, mapping *dart_info)
{
	int index, level, eslvl, exp, lowexp;
	object cart, target;
	mapping esinfo;

	if (arrayp(dart_info) && sizeof(dart_info) > 0 && mapp(dart_info[0]))
		index = random(sizeof(dart_info));
	else
		return "运镖参数有误！\n";

	if (!objectp(ob))
		return "未知的押镖人！\n";

	if (ob->is_busy())
		return "你正忙着呢！";

	if (!escort_id || !stringp(escort_id))
		return "镖局ID传入有误！\n";

	esinfo = get_escort_info(escort_id);
	level = esinfo["diff"];
	eslvl = query_escort_level(level);
	exp = get_escort_lvlexp(ob, eslvl);
	if (eslvl)
		lowexp = get_escort_lvlexp(ob, eslvl - 1);
	else
		lowexp = 0;

	if (level < 5 || level > 15)
		return "难度系数需在5-15之间。\n";

	// 任务进行中
	if (ob->query("in_dart"))
	{
		if (!ob->query_temp("over_dart") &&
			(!ob->query_temp("dart_timeout") || ob->query_temp("dart_timeout") < time()))
		{
			if (ob->query("combat_exp") < 100000)
			{
				ob->delete("in_dart");
				ob->delete("yunbiao/last_reward");
				return "你没有领过什么任务吧？";
			}
			return quest_fail(ob);
		}
		else
		{
			ob->start_busy(10);
			return "你不是才要了任务吗？";
		}
	}

	// 时间戳间隔：新手镖局120秒，普通180秒，长途240秒
	if (ob->query_temp("dart_timeout") && ob->query_temp("dart_timeout") > time())
		return "你上次运镖太辛苦了，下去休息休息吧。";

	// 门槛：新手镖局 combat_exp 上限（防止老玩家刷新手镖），过低不可接
	if (level < 10 && ob->query("combat_exp") > 2000000)
		return "你已经在新手镖局获得足够经验了，快到大城市去闯荡一番吧。\n";
	if (ob->query("combat_exp") < 10000)
		return "护镖是件危险工作，我看" + RANK_D->query_respect(ob) + "还是先练练基本功再来吧（至少一万经验）。";
	if (eslvl >= 1 && ob->query("combat_exp") < 100000)
		return "你需要在低一级镖局积累经验后，才能护送如此贵重的镖银。\n";

	if ((int)ob->query("repute") < -400000)
		return RANK_D->query_respect(ob) + "在江湖上混得灰头土脸，我怎么放心将镖交给你呢？";

	if ((int)ob->query_skill("force", 1) < 30)
		return "护镖是件危险工作，我看" + RANK_D->query_respect(ob) + "的基本内功不足！";

	// 生成收镖伙计，派往目的地
	target = new("/quest/escort/cart_target");
	target->start_leave(esinfo["time"]);
	target->move(dart_info[index]["area"]);
	target->set("dart_id", ob->query("id"));
	target->set("dart_name", ob->query("name"));
	target->set("gender", ob->query("gender"));
	target->set("from_id", this_object()->query("id"));
	target->random_move();
	target->random_move();
	target->random_move();
	target->random_move();

	// 记录任务状态
	ob->set("in_dart", 2);
	ob->set_temp("dart_area", dart_info[index]["area"]);
	ob->set_temp("dart_id", dart_info[index]["id"]);
	ob->set_temp("dart_name", dart_info[index]["name"]);
	ob->set_temp("dart_value", 2);
	ob->set_temp("yunbiao/bonus", 2);
	ob->set_temp("yunbiao/killed_num", 0);
	ob->set_temp("dart_target", target);
	ob->set_temp("huoji_name", target->name());
	ob->set_temp("yunbiao/from_id", this_object()->query("id"));
	ob->set_temp("yunbiao/escort_id", escort_id);
	ob->set_temp("huoji_where", environment(target)->query("short"));
	ob->set_temp("pfm_skip", 1);
	ob->set_temp("dart_timeout", time() + esinfo["time"]);
	ob->set_temp("yunbiao/can_go", 1);
	ob->set_temp("yunbiao/high_value", level);

	// 生成镖车
	cart = new("/quest/escort/obj/cart");
	cart->set("master", ob->query("name"));
	cart->set("masterid", ob->query("id"));
	cart->set("from_id", this_object()->query("id"));
	cart->set("long", replace_string(cart->query("long"), "镖旗", "镖旗，上书一个「" + ob->query("name")[0..0] + "」字"));
	cart->move(environment());
	command("nod");
	message_vision(CYN "几个伙计将镖推了出来。\n" NOR, ob);
	ob->set_temp("yunbiao/cart_ob", cart);

	return ob->query("name") + "把这批红货送到" + dart_info[index]["short"] + dart_info[index]["name"] +
		"那里，他已经派了个伙计名叫" + target->name() + "到" + environment(target)->query("short") +
		"附近接你，把镖车送到他那里就行了。\n";
}

//玩家完成护镖后总镖头发放奖励
string give_reward(object ob)
{
	int bonus, cost_time, dart_rooms, dart_level;
	int creward, preward, rreward, mreward;
	int eslvl;

	if (!objectp(ob) || !userp(ob))
		return "未知的押镖人！\n";

	if (!ob->query("in_dart"))
		return "我没让你走镖啊？";

	if (!ob->query_temp("over_dart"))
		return "镖车没有送到地头，莫非是你吞了！？";

	if (ob->query_temp("finis_cart") &&
		(!ob->query_temp("yunbiao/from_id") ||
		ob->query_temp("yunbiao/from_id") != this_object()->query("id")))
		return "听说你刚送完镖，但是是我家的镖吗！？";

	if (ob->query_temp("pfm_skip"))
		ob->delete_temp("pfm_skip");

	// 任务难度，默认 10
	if (ob->query_temp("yunbiao/high_value"))
		dart_level = ob->query_temp("yunbiao/high_value");
	else
		dart_level = 10;

	// 经过房间数
	if (arrayp(ob->query_temp("yunbiao/dart_rooms")))
		dart_rooms = sizeof(ob->query_temp("yunbiao/dart_rooms"));
	else
		dart_rooms = 2 + (dart_level - 10);

	if (dart_rooms < (dart_level - 8))
		dart_rooms = dart_level - 8;
	if (dart_rooms <= 0)
		dart_rooms = 1;

	// 低经验玩家（新手镖）奖励加成
	if (ob->query("combat_exp") < 3000000)
	{
		creward = (random(15) + 10) * (dart_rooms + ob->query_temp("yunbiao/bonus"));
		preward = (random(4) + 6) * (dart_rooms + ob->query_temp("yunbiao/bonus"));
		rreward = (2 + random(3)) * (dart_rooms + ob->query_temp("yunbiao/bonus"));
	}
	else
	{
		creward = (random(15) + 5) * (dart_rooms + ob->query_temp("yunbiao/bonus"));
		preward = (random(4) + 3) * (dart_rooms + ob->query_temp("yunbiao/bonus"));
		rreward = (1 + random(2)) * (dart_rooms + ob->query_temp("yunbiao/bonus"));
	}

	// 连续完成加成
	ob->add_temp("yunbiao/lianxu", 1);
	creward = ceil(creward * ob->query_temp("yunbiao/lianxu") * (dart_level * 2.5) / 10);
	preward = ceil(preward * ob->query_temp("yunbiao/lianxu") * (dart_level * 2.5) / 10);
	rreward = ceil(rreward * ob->query_temp("yunbiao/lianxu") * (dart_level * 2.5) / 10);
	// 新手 6/5 加成
	if (ob->query("combat_exp") < 3000000)
	{
		creward = creward * 6 / 5;
		preward = preward * 6 / 5;
		rreward = rreward * 6 / 5;
	}

	// 连续 7 次额外潜能奖励
	if (ob->query_temp("yunbiao/lianxu") > 7)
	{
		message("vision", HIC"由于你的辛勤劳动，你额外获得" + chinese_number(preward) + "潜能的奖励！\n"NOR, ob);
		ob->add("potential", preward);
		preward = preward * 2;
		ob->set_temp("yunbiao/lianxu", 3);
	}

	// 发放奖励
	ob->add("combat_exp", creward);
	ob->add("potential", preward);
	ob->add("repute", rreward);
	ob->add("exp/hubiao", creward);
	ob->add("pot/hubiao", preward);
	ob->add("yunbiao/exp/" + this_object()->query("id"), creward);

	// 金钱奖励：存入钱庄
	eslvl = query_escort_level(dart_level);
	if (!eslvl)
		mreward = random(ob->query_temp("yunbiao/lianxu")) * 10000 + 10000;
	else if (eslvl == 1)
		mreward = random(ob->query_temp("yunbiao/lianxu")) * 20000 + 20000;
	else
		mreward = random(ob->query_temp("yunbiao/lianxu")) * 30000 + 20000;
	ob->add("balance", mreward);

	message("vision", HIW"你一共被奖励了：\n" + chinese_number(creward) + "点经验；\n" +
		chinese_number(preward) + "点潜能；\n" + chinese_number(rreward) + "点江湖声望。\n"NOR, ob);
	message_vision(CYN"$N吩咐了旁边的镖头几句，转头对$n道：「辛苦了，几两银子略表心意，已经吩咐人存入你的钱庄账户。」\n"NOR, this_object(), ob);

	ob->add("jobs/completed/hubiao", 1);
	ob->set("yunbiao/last_reward", creward / 2);
	CHANNEL_D->do_channel(this_object(), "sys_misc", sprintf("%s护镖获得经验%d，潜能%d，声望%d。", ob->name(), creward, preward, rreward));

	// 清理任务状态
	ob->delete("in_dart");
	ob->delete("yunbiao/fail_num");
	ob->delete_temp("over_dart");
	ob->delete_temp("dart_name");
	ob->delete_temp("dart_id");
	ob->delete_temp("dart_area");
	ob->delete_temp("dart_value");
	ob->delete_temp("yunbiao/bonus");
	ob->delete_temp("yunbiao/high_value");
	ob->delete_temp("yunbiao/dart_rooms");
	ob->delete_temp("yunbiao/from_id");
	ob->delete_temp("yunbiao/escort_id");
	ob->delete_temp("finis_cart");
	ob->delete_temp("dart_timeout");
	ob->delete_temp("yunbiao/cart_ob");
	ob->save();
	return RANK_D->query_respect(ob) + "果然是栋梁之才！";
}

//玩家取消/失败护镖任务的惩罚
string quest_fail(object ppl)
{
	if (!objectp(ppl) || !userp(ppl))
		return "未知的押镖人！\n";

	if (!ppl->query("in_dart"))
		return "你没有领过什么任务吧？";

	if (ppl->query("balance") < 100000)
		return "你弄丢了我的镖，得赔偿我的损失，只是你的存款不够，你想想办法再来吧！";

	ppl->add("yunbiao/fail_num", 1);
	if (ppl->query("yunbiao/fail_num") > 9)
	{
		command("slap " + ppl->query("id"));
		command("say 你已经连续丢了我这么多趟镖，得赔偿我10倍的损失。");
		ppl->add("balance", -500000);
		ppl->add("repute", -10000);
	}
	else
	{
		command("heng");
		command("say 你弄丢了我的镖，得赔偿我的损失，哼！");
		ppl->add("balance", -50000);
		ppl->add("repute", -1000);
	}

	if (objectp(ppl->query_temp("yunbiao/cart_ob")))
		destruct(ppl->query_temp("yunbiao/cart_ob"));

	ppl->set_temp("yunbiao/lianxu", 0);
	ppl->delete("in_dart");
	ppl->delete("yunbiao/last_reward");
	ppl->delete_temp("yunbiao/dart_rooms");
	ppl->delete_temp("yunbiao/from_id");
	ppl->delete_temp("yunbiao/escort_id");
	ppl->delete_temp("finis_cart");
	ppl->delete_temp("dart_timeout");
	ppl->delete_temp("yunbiao/cart_ob");
	ppl->save();
	return "这点小事你都办不好，还能指望你作些什么呢？";
}

//查询镖局级别：0-新手镖局(5-7)，1-普通(8-12)，2-长途(13-15)
int query_escort_level(int level)
{
	if (level <= 7)
		return 0;
	else if (level <= 12)
		return 1;
	else
		return 2;
}

//获取镖局设置
mapping get_escort_info(string escort_id)
{
	if (mapp(escort_info[escort_id]))
		return escort_info[escort_id];
	else
		error("错误的镖局id，请核对输入的镖局编号是否正确。\n");
}

//查询玩家在指定级别镖局的累计经验
protected int get_escort_lvlexp(object me, int eslvl)
{
	string eskey;
	int exp;

	exp = 0;
	foreach(eskey in keys(escort_info))
	{
		if (eslvl != query_escort_level(escort_info[eskey]["diff"]))
			continue;
		exp = exp + me->query("yunbiao/exp/" + escort_info[eskey]["bossid"]);
	}
	return exp;
}

void destobj(object ob)
{
	if (objectp(ob))
		destruct(ob);
}
