//Cracked by Roath
// learn.c

#include <skill.h>

inherit F_CLEAN_UP;

string *reject_msg = ({
	"说道：您太客气了，这怎么敢当？\n",
	"像是受宠若惊一样，说道：请教？这怎么敢当？\n",
	"笑着说道：您见笑了，我这点雕虫小技怎够资格「指点」您什么？\n",
});

void create() { seteuid(getuid()); }

int main(object me, string arg)
{
	string skill, teacher, master, skill_name, slow_msg;
	object ob;
	int master_skill, my_skill, gin_cost, slow_factor;
  	int i, tmp, learn_times, learned;


        if (me->is_busy())
                return notify_fail("你现在正忙着呢。\n");

	if(!arg)
	    return notify_fail("指令格式：learn|xue <某人> <技能> [次数]\n");

  	if (sscanf(arg, "%s %s %d", teacher, skill, learn_times)!=3 ) {
	    learn_times = 1;
	    if (sscanf(arg, "%s %s", teacher, skill)!=2 )
		return notify_fail("指令格式：learn|xue <某人> <技能> [次数]\n");
	}
	if (learn_times < 1) 
		return notify_fail("指令格式：learn|xue <某人> <技能> [次数]\n");

	if( me->is_fighting() )
		return notify_fail("临阵磨枪？来不及啦。\n");

	if( !(ob = present(teacher, environment(me))) || !ob->is_character())
		return notify_fail("你要向谁求教？\n");

	if( !living(ob) )
		return notify_fail("嗯....你得先把" + ob->name() + "弄醒再说。\n");

	if( (int)me->query("potential") < learn_times )
		return notify_fail("你的潜能不够，没有办法再成长了。\n");

	// HACK: recognize_apprentice takes care of the payment 
	// for literate.  We have to do this learn_times.
	for (i=0; i<learn_times; i++) {
	    if( !me->is_apprentice_of(ob) && !(ob->recognize_apprentice(me))  && !me->is_spouse_of(ob) ) {
		return	notify_fail( ob ->name() + reject_msg[random(sizeof(reject_msg))] );
	    }
	}

	if ( (string)me->query("family/family_name") == "峨嵋派" 
	  && (string)ob->query("family/family_name") == "峨嵋派"
	  && (string)me->query("gender") != "女性" 
	  && (int)me->query_int() < 20 + random(25) ) {
		slow_factor = 2; 
		slow_msg = "想了良久，";
	}
	else {
		slow_factor = 1;
		slow_msg = "";
	}

	if( !master_skill = ob->query_skill(skill, 1) )
	    return notify_fail("这项技能你恐怕必须找别人学了。\n");

	notify_fail(ob->name() + "不愿意教你这项技能。\n");
	if( ob->prevent_learn(me, skill) ) return 0;

	my_skill = me->query_skill(skill, 1);
	if( my_skill >= master_skill )
		return notify_fail("这项技能你的程度已经不输你师父了。\n");

	if (me->is_spouse_of(ob) )
	    if (my_skill >= master_skill - 20*(me->query("married_times")-1))
		return notify_fail(ob->name() + "想到你和以前" 
			+ me->query("spouse/title") 
			+ "在一起的情形，有点不大愿意教你这项技能。\n");
	    else if ( (ob->query("combat_exp") < 10000 
	    	       || me->query("combat_exp") < 10000 )
			&& (string)SKILL_D(skill)->type() == "martial" ) 
		return notify_fail("你们夫妇实战经验还不足，不能互相传授武艺！\n");
		
	notify_fail("依你目前的能力，没有办法学习这种技能。\n");
	if (me->is_spouse_of(ob)) me->add_temp("mark/朱", learn_times);
	if( !SKILL_D(skill)->valid_learn(me) ) return 0;
	if (me->is_spouse_of(ob)) me->add_temp("mark/朱", -learn_times);

	gin_cost = 60 / (int)me->query("int");

	if( !my_skill ) {
	    gin_cost *= 2;
	    me->set_skill(skill,0);
	}

	printf("你向%s请教有关「%s」的疑问。\n", ob->name(), to_chinese(skill));

	if( ob->query("env/no_teach") )
		return notify_fail("但是" + ob->name() + "现在并不准备回答你的问题。\n");

	tell_object(ob, sprintf("%s向你请教有关「%s」的问题。\n", me->name(), to_chinese(skill)));

	/* 逐次学习：精/潜能够几次就学几次，不再整批拒学、
	 * 不再把剩余精气一次性扣光（learn <师父> <技能> 100 时
	 * 精瞬间归零却一次也没学到的缺陷）。 */
	learned = 0;
	tmp = 0;
	for (i=0; i<learn_times; i++) {
		/* 潜能耗尽兜底（每学一次扣一点潜能） */
		if ( (int)me->query("potential") < 1 )
			break;

		my_skill = me->query_skill(skill, 1);
		if( my_skill >= master_skill )
			break;

		/* 授业者精力不足：停下，不再消耗自己的精气 */
		if( (int)ob->query("jing") <= gin_cost/5 + 1 ) {
			write("但是" + ob->name() + "显然太累了，没有办法教你什么。\n");
			tell_object(ob, "但是你太累了，没有办法教" + me->name() + "。\n");
			break;
		}
		if( userp(ob) ) ob->receive_damage("jing", gin_cost/5 + 1);

		/* 自己精力不足：学到哪算哪，剩余精气保留 */
		if( (int)me->query("jing") <= gin_cost*3/2 ) {
			write("你今天太累了，暂时学不动了。\n");
			break;
		}

		if( (string)SKILL_D(skill)->type()=="martial"
		&&	my_skill * my_skill * my_skill / 10 > (int)me->query("combat_exp") ) {
			printf("也许是缺乏实战经验，你对%s的回答总是无法领会。\n", ob->name() );
			break;
		}

		me->add("potential", -1);
		tmp += random(me->query_int());
		me->receive_damage("jing", gin_cost*3/2);
		learned++;
	}

	if( learned > 0 ) {
		me->improve_skill(skill, tmp/slow_factor);
		if(skill_name = SKILL_D(skill)->query_skill_name(me->query_skill(skill, 1))) {
		    if ( skill=="linji-zhuang" )
			printf("你听了%s的指导，%s对「%s」的修养似乎有所提高。\n", 
				ob->name(), slow_msg, skill_name);
		    else
			printf("你听了%s的指导，%s对「%s」这一招似乎有些心得。\n", 
				ob->name(), slow_msg, skill_name);
		}
		else
		    printf("你听了%s的指导，%s似乎有些心得。\n", ob->name(), slow_msg);
	}

	return 1;
}

int help(object me)
{
        write(@HELP
指令格式：learn|xue <某人> <技能> [次数]
 
这个指令可以让你向别人请教有关某一种技能的疑难问题，当然，你请教的
对象在这项技能上的造诣必须比你高，而你经由这种方式学习得来的技能也
不可能高于你所请教的人，然而因为这种学习方式相当于一种「经验的传承」，
因此学习可以说是熟悉一种新技能最快的方法。

此外学习也需要消耗一些精力，而消耗的精力跟你自己、与你学习对象的悟
性有关。

其他相关指令 : apprentice, practice, skills, study, marry
HELP
        );
        return 1;
}
