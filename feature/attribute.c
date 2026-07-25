//Cracked by Roath
// attribute.c
// From ES2
// Modified by Xiang for XKX (12/15/95)
// Extended with pkuxkx vital formulas (2025)

#include <dbase.h>
#include <skill.h>

int query_str()
{
	int temp;
	int improve = 0;

	if ( query_skill("unarmed",1) 
	||   query_skill("cuff",   1)
	||   query_skill("strike", 1)
	||   query_skill("hand",   1)
	||   query_skill("claw",   1)
	||   query_skill("finger", 1) )
	{
		if( query_skill("unarmed",1) >= temp ) temp = query_skill("unarmed",1);
		if( query_skill("cuff",   1) >= temp ) temp = query_skill("cuff",   1);
		if( query_skill("strike", 1) >= temp ) temp = query_skill("strike", 1);
		if( query_skill("hand",   1) >= temp ) temp = query_skill("hand",   1);
		if( query_skill("claw",   1) >= temp ) temp = query_skill("claw",   1);
		if( query_skill("finger", 1) >= temp ) temp = query_skill("finger",1);
		
		improve = temp / 10;
	}

	return (int)query("str") + // (int)query("jiali") +
		query_temp("apply/strength") + improve;
}

int query_encum_str()
{
        int temp;
        int improve = 0;

        if ( query_skill("unarmed",1) 
        ||   query_skill("cuff",   1)
        ||   query_skill("strike", 1)
        ||   query_skill("hand",   1)
        ||   query_skill("claw",   1)
        ||   query_skill("finger", 1) )
        {
                if( query_skill("unarmed",1) >= temp ) temp = query_skill("unarmed",1);
                if( query_skill("cuff",   1) >= temp ) temp = query_skill("cuff",1);
                if( query_skill("strike", 1) >= temp ) temp = query_skill("strike",1);
                if( query_skill("hand",   1) >= temp ) temp = query_skill("hand",1);
                if( query_skill("claw",   1) >= temp ) temp = query_skill("claw",1);
                if( query_skill("finger", 1) >= temp ) temp = query_skill("finger",1);
                improve = temp / 10;
        }

        return (int)query("str") + improve;
}




int query_int()
{
	return (int)query("int") + query_temp("apply/intelligence") +
		(int)query_skill("literate", 1) / 10;
}

int query_con()
{
	return (int)query("con") + query_temp("apply/constitution") +
		(int)query_skill("force", 1) / 10;
}

int query_dex()
{
	return (int)query("dex") + query_temp("apply/dexerity") +
		(int)query_skill("dodge", 1) / 10;
}

int query_kar()
{
	return (int)query("kar") + query_temp("apply/karma");
}

int query_per()
{
	return (int)query("per") + query_temp("apply/personality") +
		(int)query_skill("beauty", 1) / 10;
}

// === 以下移植自 pkuxkx feature/attribute.c，对齐气血/精神/内力/精力计算 ===

/* 玩家的最大气血：受年龄、内功等级、内力上限、特殊技能加成影响。
   NPC 沿用 xkx2001 原有简化逻辑（race/human.c 中设定）。 */
int query_max_qi()
{
	mapping my;
	int maxhp, sep_force, huashan_skill, xism_age, tai_skill;
	string force;
	object ob = this_object();

	my = ob->query_entire_dbase();

	if (!userp(ob)) {
		// NPC 保持现有逻辑不变
		if (my["age"] <= 14)
			return 1000 + (int)ob->query_skill("force", 1) * 5;
		else
			return 1000 + (my["age"] - 14) * my["con"] * 2
				+ (int)ob->query_skill("force", 1) * 5;
	}

	// 玩家公式（移植自 pkuxkx）
	force = ob->query_skill_mapped("force");
	sep_force = stringp(force) ? (int)ob->query_skill(force, 1)
		: (int)ob->query_skill("force", 1);

	if (my["age"] <= 14)
		maxhp = 100 + sep_force * 2;
	else if (my["age"] <= 30)
		maxhp = 100 + (my["age"] - 14) * my["con"] + sep_force * 2;
	else if (my["age"] > 60) {
		// 身负道家养生/禅宗心法/大乘涅磐功 ≥120 则不受年龄衰减
		if ((int)ob->query_skill("guangming-shenghuogong", 1) >= 120 ||
		    (int)ob->query_skill("taoism", 1) >= 120 ||
		    (int)ob->query_skill("buddhism", 1) >= 120 ||
		    (int)ob->query_skill("mahayana", 1) >= 120)
			maxhp = my["con"] * 16 + 100 + sep_force * 2;
		else
			maxhp = my["con"] * 16 + 100
				- (my["age"] - 60) * (6 + (my["age"] - 60) / 7)
				+ sep_force * 2;
	} else
		maxhp = my["con"] * 16 + 100 + sep_force * 2;

	// 内力加成
	if (my["max_neili"] > 0)
		maxhp += my["max_neili"] / 4;

	my["base_hp"] = maxhp;

	// 道家练气：30 岁前补气，30 岁后长气
	tai_skill = (int)ob->query_skill("taiji-shengong", 1) / 30;
	if ((xism_age = (int)ob->query_skill("taoism", 1)) > 39) {
		xism_age = xism_age / 2;
		xism_age -= (my["age"] <= 30) ? my["age"] : 30;
		if (xism_age > 0 && xism_age * tai_skill > 0)
			maxhp += xism_age * tai_skill;
	}

	// 华山气宗养吾剑法（有条件加成）
	huashan_skill = (int)ob->query_skill("yangwu-jian", 1);
	if (huashan_skill > 1200 && ob->query("huashan_newskills/qizong")) {
		xism_age = to_int(pow(to_float(my["combat_exp"]) / 100.0, 1.0 / 3) * 10);
		if (huashan_skill > xism_age * 4 / 5) {
			int bonus = 7 * (huashan_skill - 1200) / (xism_age - 1200);
			if (bonus > 7) bonus = 7;
			maxhp += maxhp * bonus / 100;
		}
	}

	// 上限保护
	if (maxhp > 300000) maxhp = 300000;

	if (ob->query_temp("apply/max_qi"))
		maxhp += ob->query_temp("apply/max_qi");

	return maxhp;
}

/* 玩家的最大精神：受年龄、悟性、内力上限、佛学技能影响。 */
int query_max_jing()
{
	mapping my;
	int maxmp, xism_age, hun_skill;
	object ob = this_object();

	my = ob->query_entire_dbase();

	if (!userp(ob)) {
		if (my["age"] <= 14)
			return 1000;
		else
			return 1000 + (my["age"] - 14) * my["int"] * 4;
	}

	if (my["age"] <= 14)
		maxmp = 100;
	else if (my["age"] <= 30)
		maxmp = 100 + (my["age"] - 14) * my["int"];
	else if (my["age"] > 60) {
		if ((int)ob->query_skill("guangming-shenghuogong", 1) >= 120 ||
		    (int)ob->query_skill("taoism", 1) >= 120 ||
		    (int)ob->query_skill("buddhism", 1) >= 120 ||
		    (int)ob->query_skill("mahayana", 1) >= 120)
			maxmp = my["int"] * 16 + 100;
		else
			maxmp = my["int"] * 16 + 100
				- (my["age"] - 60) * (6 + (my["age"] - 60) / 7);
	} else
		maxmp = my["int"] * 16 + 100;

	if (my["max_jingli"] > 0)
		maxmp += my["max_jingli"] / 4;

	my["base_mp"] = maxmp;

	// 佛家养精：30 岁前补精，30 岁后长精
	hun_skill = (int)ob->query_skill("hunyuan-yiqi", 1) / 45;
	if ((xism_age = (int)ob->query_skill("buddhism", 1)) > 39) {
		xism_age = xism_age / 2;
		xism_age -= (my["age"] <= 30) ? my["age"] : 30;
		if (xism_age > 0 && xism_age * hun_skill * 2 > 0)
			maxmp += xism_age * hun_skill * 2;
	}

	if ((xism_age = (int)ob->query_skill("mahayana", 1)) > 39) {
		xism_age = xism_age / 2;
		xism_age -= (my["age"] <= 30) ? my["age"] : 30;
		if (xism_age > 0)
			maxmp += xism_age * ((int)ob->query_skill("linji-zhuang", 1) / 30);
	}

	if (maxmp > 300000) maxmp = 300000;

	if (ob->query_temp("apply/max_jing"))
		maxmp += ob->query_temp("apply/max_jing");

	return maxmp;
}

/* 最大内力：对齐 pkuxkx 的动态计算方式。
   保留对 force_character 的调用兼容——如果各内功 skill 有定义该方法
   则使用其系数，否则使用默认值 10。 */
varargs int query_max_neili(int flag)
{
	mapping my;
	int maxneili, nlimit, neili_times, pot;
	string force;
	object ob = this_object();

	my = ob->query_entire_dbase();
	force = ob->query_skill_mapped("force");

	if (stringp(force)) {
		neili_times = call_other(SKILL_D(force), "force_character", "TYPE_NEILI");
		if (!intp(neili_times) || neili_times < 1)
			neili_times = 10;
	} else {
		neili_times = 10;
	}

	nlimit = (int)ob->query_skill("force");
	pot = nlimit * neili_times;

	if (flag > 0)
		return pot;

	if (my["max_neili"] > pot && my["max_neili"] > 100)
		maxneili = pot;
	else
		maxneili = my["max_neili"];

	return maxneili;
}

/* 最大精力：对齐 pkuxkx 的动态计算方式。 */
int query_max_jingli()
{
	mapping my;
	int maxjingli, nlimit, jingli_times;
	string force;
	object ob = this_object();

	my = ob->query_entire_dbase();
	force = ob->query_skill_mapped("force");

	if (stringp(force)) {
		jingli_times = call_other(SKILL_D(force), "force_character", "TYPE_JINGLI");
		if (!intp(jingli_times) || jingli_times < 1)
			jingli_times = 10;
	} else {
		jingli_times = 10;
	}

	nlimit = (int)ob->query_skill("force");

	if (my["max_jingli"] > nlimit * jingli_times && my["max_jingli"] > 100)
		maxjingli = nlimit * jingli_times;
	else
		maxjingli = my["max_jingli"];

	return maxjingli;
}
