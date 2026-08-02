// cart_target.c — 押镖收镖伙计（xkx2001 适配版）
// 移植自 pkuxkx quest/escort/cart_target.c
// 适配：NAME_D->create_name()（xkx2001 无）改为 set_random_name()

inherit NPC;
#include <ansi.h>

int leave();

void set_rnd_name()
{
	string l_c, l_e, f_c, f_e;
	mapping *lastnamelist = ({
		({"赵", "zhao"}), ({"钱", "qian"}), ({"孙", "sun"}), ({"李", "li"}),
		({"周", "zhou"}), ({"吴", "wu"}), ({"郑", "zheng"}), ({"王", "wang"}),
		({"冯", "feng"}), ({"陈", "chen"}), ({"卫", "wei"}), ({"高", "gao"}),
		({"云", "yun"}), ({"张", "zhang"}), ({"刘", "liu"}), ({"马", "ma"}),
		({"岳", "yue"}), ({"程", "cheng"}), ({"何", "he"}), ({"林", "lin"}),
		({"潘", "pan"}), ({"白", "bai"}), ({"向", "xiang"}), ({"严", "yan"}),
		({"方", "fang"}), ({"余", "yu"}), ({"陆", "lu"}), ({"贺", "he"}),
		({"孟", "meng"}), ({"谢", "xie"}), ({"徐", "xu"}), ({"杨", "yang"}),
		({"韩", "han"}), ({"彭", "peng"}), ({"仇", "qiu"}), ({"任", "ren"}),
		({"熊", "xiong"}), ({"司马", "sima"}), ({"桑", "sang"}), ({"泉", "quan"}),
		({"金", "jin"}), ({"丁", "ding"}), ({"田", "tian"}), ({"上官", "shangguan"}),
		({"莫", "mo"}), ({"秦", "qin"}),
	});
	mapping *firstnamelist = ({
		({"金鳌", "jinao"}), ({"吼", "hou"}), ({"克", "ke"}), ({"国梁", "guoliang"}),
		({"光杰", "guangjie"}), ({"领军", "lingjun"}), ({"玄", "xuan"}), ({"望海", "wanghai"}),
		({"千灵", "qianling"}), ({"青", "qing"}), ({"伯山", "boshan"}), ({"广义", "guangyi"}),
		({"大雄", "daxiong"}), ({"鹤", "he"}), ({"九佳", "jiujia"}), ({"天恒", "tianheng"}),
		({"文亮", "wenliang"}), ({"金鹏", "jinpeng"}), ({"涛", "tao"}), ({"则成", "zecheng"}),
		({"石坚", "shijian"}), ({"评", "ping"}), ({"建男", "jiannan"}), ({"正鸿", "zhenghong"}),
		({"天彪", "tianbiao"}), ({"一邙", "yimang"}), ({"泰", "tai"}), ({"智远", "zhiyuan"}),
		({"松年", "songnian"}), ({"迅", "xun"}), ({"三星", "sanxing"}), ({"孤桐", "gutong"}),
		({"柏英", "boying"}), ({"百童", "baitong"}), ({"莲亭", "lianting"}), ({"勉", "mian"}),
		({"伯光", "boguang"}), ({"云", "yun"}), ({"南扬", "nanyang"}),
	});
	int i, j;

	i = random(sizeof(lastnamelist));
	j = random(sizeof(firstnamelist));
	l_c = lastnamelist[i][0];
	l_e = lastnamelist[i][1];
	f_c = firstnamelist[j][0];
	f_e = firstnamelist[j][1];
	set_name(l_c + f_c, ({ l_e + " " + f_e, l_e }));
	set("id_long", l_e + " " + f_e);
	set("id_short", l_e);
}

void create()
{
	set("chat_chance", 10);
	set("chat_msg", ({
		(: random_move :),
	}));
	set_rnd_name();
	set("nickname", HIC"店铺伙计"NOR);
	set("gender", random(3) > 0 ? "男性" : "女性");
	set("no_get", 1);
	set("uni_target", 1);
	set("age", 20);
	set("is_huoji", 1);
	setup();
}

void start_leave(int leave_time)
{
	if (!leave_time || leave_time <= 240)
		call_out("leave", 900);
	else
		call_out("leave", leave_time);
}

void die()
{
	object me, killer;

	me = this_object();
	if (objectp(killer = me->get_damage_origin_object()))
		CHANNEL_D->do_channel(this_object(), "rumor",
			sprintf(me->name() + "被" + killer->name() + "杀死了。"));
	else
		CHANNEL_D->do_channel(this_object(), "rumor",
			sprintf(me->name() + "莫名其妙地死了。"));
	::die();
}

int random_move()
{
	mapping default_dirs = ([
		"north": "北", "south": "南", "east": "东", "west": "西",
		"northup": "北边", "southup": "南边", "eastup": "东边", "westup": "西边",
		"northdown": "北边", "southdown": "南边", "eastdown": "东边", "westdown": "西边",
		"northeast": "东北", "northwest": "西北", "southeast": "东南", "southwest": "西南",
		"up": "上", "down": "下", "out": "外",
	]);
	mapping exits;
	string *dirs;
	int i;

	if (!environment()) return 0;
	if (sizeof(environment()->query("exits")) == 0) return 0;
	if (!mapp(exits = environment()->query("exits"))) return 0;
	dirs = keys(exits);
	i = random(sizeof(dirs));
	if (!environment()->valid_leave(this_object(), dirs[i])) return 0;
	message_vision(this_object()->name() + "向" + default_dirs[dirs[i]] + "离开。\n", this_object());
	dirs = values(exits);
	this_object()->move(dirs[i]);
	message_vision(this_object()->name() + "身穿布衣走了过来。\n", this_object());
}

void unconcious()
{
	die();
}

int leave()
{
	if (!this_object()) return 1;
	CHANNEL_D->do_channel(this_object(), "qy", "唉！看来" + this_object()->query("dart_name") + "这镖是运不来了，我还是先回去吧！");
	if (environment(this_object()))
		message_vision("$N转身走了。\n", this_object());
	destruct(this_object());
	return 1;
}
