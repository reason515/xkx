//D:\xkx\d\liuxiu-shanzhuang\newbie_village.h
//labaz 2012/10/23
#ifndef __NEWBIE_H__
#define __NEWBIE_H__
#include <ansi.h>

#define NEWBIE_VILLAGE_INDEX "newbie_village/quest_index"
#define __DOMAIN_DIR__ "/d/newbie_lxsz/"
#define WEBD "/adm/daemons/webd"

string *quest_newbie = ({
"你来到这个陌生的地方，前途未卜，请先点击顶部姓名区域打开角色面板，查看自己的身体情况",
"使用场景中的「查看」按钮观察溪流(river)，点击地上的葫芦或野果拾取并食用/饮用",
"点击 east、west、south 等出口方向按钮来探索未明谷周围的三块地方，并回到未明谷",
"点击山坡(path)的「查看」，再点击「攀爬」离开未明谷",
"拿着刻有「柳秀山庄」的葫芦去柳秀山庄一问究竟",
"点击丫鬟，选择「打听」询问有关「葫芦」的事情",
"点击大门，选择「敲门」去见山庄庄主",
// "跟随丫环去见山庄庄主",
"点击游鲲翼，选择「给予」，把葫芦交给他",
"点击游鲲翼，依次选择「打听」：here、name、葫芦、闯荡江湖",
"点击阿姝，选择「跟随」，她会带你熟悉一下山庄",
"点击「脱下布衣」，再点击浴桶选择「洗澡」",
"洗完穿上衣服，向游鲲翼打听闯荡江湖",
//"洗完穿上衣服，到厢房睡一觉",
//"向游鲲翼打听闯荡江湖",
"前往尚武堂，点击武师选择「切磋」",
"回到厢房点击「睡觉」补充体力",
"向游鲲翼打听闯荡江湖！",
"查看任务面板提示，前往票号取钱",
"点击柳住钱，选择「取款」",
"前往药铺买药(buy yao)，在行囊中点击药物选择「服用」治好伤势",
"向游鲲翼打听闯荡江湖！！",
"找武师拜师学艺，点击武师选择「拜师」",
"帮武师去铁匠铺买一把钢剑，去酒铺买一壶烧刀子酒，回来交给武师",
"再去酒铺买个鸡腿，去杂货铺买个食盒，把鸡腿放到食盒里交给武师",
"点击武师选择「查看技能」，了解他会哪些武功",
"点击武师选择「请教」，学习所有基本功夫到5级，所有高级功夫到5级",
"打开角色面板，在武功页激发内功、轻功、掌法、剑法和招架",
"在武功页指定空手技能为太乙掌法",
"前往尚武堂找武师再次切磋",
"练习一级太乙剑法，学会使用绝招",
"向游鲲翼打听闯荡江湖！！！",
"前往未明谷的树林除掉老虎",
"向游鲲翼打听闯荡江湖！！！！",
"前往藏书阁点击书架，取书并阅读",
"向游鲲翼打听闯荡江湖！！！！！",
"前往杏子林和游鲲翼道别",
"到车马行雇车(gu yangzhou)去扬州",
});

int show_quest()
{
	object me;
	int index;

	me=this_player();
	index=(int)me->query(NEWBIE_VILLAGE_INDEX);

	if (( index>=1 ) && ( index<=(sizeof(quest_newbie)) ))
	{
		write(HIG+quest_newbie[index-1]+"\n"NOR);
	}
	else
	{
		write(HIW"你的新手村数据异常。\n"NOR);
	}
	
	// Web 客户端同步任务状态
	if (me->query_temp("web_client"))
		WEBD->send_quest_status(me);
	
	return 1;
}

int get_questindex(string job_secr)
{
	int i;
	for (i=0;i<sizeof(quest_newbie);i++) 
	{
		if (job_secr == quest_newbie[i])
		{
			return i+1;
		}
	}
	return 0;
}

int check_questindex(object me, string cur_quest)
{
	if (me->query(NEWBIE_VILLAGE_INDEX)==get_questindex(cur_quest))
	{
		return 1;
	}
	else if (me->query(NEWBIE_VILLAGE_INDEX)>get_questindex(cur_quest))
	{
		return 2;
	}
	else
	{
		return 0;
	}
}

void quest_gain(object me, int exp, int pot, string hint)
{
    int rpot;

	if (objectp(me))
	{
		me->add("combat_exp", exp);
        rpot = pot+random(10);
		me->add("potential", rpot);
        me->add("pot/lxsz", rpot);
		tell_object(me,HIC"\n干的不错，你被奖励了"+chinese_number(exp)+"点经验，"+chinese_number(pot)+"点潜能！\n\n"NOR+hint+"\n"NOR);
        CHANNEL_D->do_channel(load_object(__DOMAIN_DIR__"npc/youkunyi"), "sys_misc", sprintf("%s在柳秀山庄第%d步任务中获得经验：%d、潜能：%d。", me->name(), me->query(NEWBIE_VILLAGE_INDEX), exp, pot));
		me->add(NEWBIE_VILLAGE_INDEX, 1);
		
		// Web 客户端同步最新任务状态
		if (me->query_temp("web_client"))
			WEBD->send_quest_status(me);
	}
	else
	{
		write("参数一不是对象物件\n");
	}
}

string quest_desc(string text)
{
	string desc;
	desc=HIG+text+NOR+"\n"+GRN"你可以用"NOR+HIY"quest"NOR+GRN"命令了解你现在应该做些什么。\n\n"NOR;
	return desc;
}

int set_nextquest(object me, string cur_quest, string next_desc, int add_exp, int add_pot)
{
	string text;
	
	if (!objectp(me)) return 0;
	
	if (get_questindex(cur_quest) == me->query(NEWBIE_VILLAGE_INDEX))
	{
		text=quest_desc(next_desc);
		quest_gain(me, add_exp, add_pot, text);
		return 1;
	}
	else
	{
		return 0;
	}
}

#endif
