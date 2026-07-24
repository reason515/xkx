// newbietest.c — 新手村 e2e 测试辅助命令
// 用法：newbietest skip <1-35>  跳到指定任务
//       newbietest gold <amount>  设置存款（归零自动推进 Q17）
//       newbietest advance        直接推进到下一步

#include <ansi.h>
#define WEBD "/adm/daemons/webd"
#define NEWBIE_VILLAGE_INDEX "newbie_village/quest_index"

inherit F_CLEAN_UP;

string *quest_rooms = ({
    "/d/newbie_lxsz/weiminggu","/d/newbie_lxsz/weiminggu","/d/newbie_lxsz/weiminggu",
    "/d/newbie_lxsz/weiminggu","/d/newbie_lxsz/shanzhuang-damen","/d/newbie_lxsz/shanzhuang-damen",
    "/d/newbie_lxsz/zhengting","/d/newbie_lxsz/zhengting","/d/newbie_lxsz/zhengting",
    "/d/newbie_lxsz/zhengting","/d/newbie_lxsz/nanyushi","/d/newbie_lxsz/zhengting",
    "/d/newbie_lxsz/shangwutang","/d/newbie_lxsz/wxiangfang","/d/newbie_lxsz/zhengting",
    "/d/newbie_lxsz/zhengting","/d/newbie_lxsz/liuxiu-piaohao","/d/newbie_lxsz/yaopu",
    "/d/newbie_lxsz/zhengting","/d/newbie_lxsz/shangwutang","/d/newbie_lxsz/shangwutang",
    "/d/newbie_lxsz/shangwutang","/d/newbie_lxsz/shangwutang","/d/newbie_lxsz/shangwutang",
    "/d/newbie_lxsz/shangwutang","/d/newbie_lxsz/shangwutang","/d/newbie_lxsz/shangwutang",
    "/d/newbie_lxsz/shangwutang","/d/newbie_lxsz/zhengting","/d/newbie_lxsz/weiminggu",
    "/d/newbie_lxsz/zhengting","/d/newbie_lxsz/cangshuge","/d/newbie_lxsz/zhengting",
    "/d/newbie_lxsz/xingzilin_fb","/d/newbie_lxsz/chemahang",
});

int main(object me, string arg)
{
    string cmd, param;
    int n, idx;

    if (!me->query_temp("web_client") && !wizardp(me)) {
        write("仅 Web 客户端可用。\n"); return 1;
    }
    if (!arg || sscanf(arg, "%s %s", cmd, param) < 1) {
        write("用法：newbietest skip <1-35> | gold <amount> | advance\n");
        return 1;
    }

    if (cmd == "skip") {
        if (!param || sscanf(param, "%d", n) != 1 || n < 1 || n > 35)
        { write("任务编号需在 1-35 之间。\n"); return 1; }
        me->set(NEWBIE_VILLAGE_INDEX, n);
        if (n >= 5) { me->set("food",me->max_food_capacity()); me->set("water",me->max_food_capacity()); }
        if (n >= 15) me->set("balance", 10000);
        if (n >= 20) {
            me->set_skill("force",5); me->set_skill("dodge",5); me->set_skill("parry",5);
            me->set_skill("strike",5); me->set_skill("sword",5);
            me->set_skill("taiyi-shengong",5); me->set_skill("taiyi-you",5);
            me->set_skill("taiyi-zhang",5); me->set_skill("taiyi-jian",5);
            me->set("newbie_village/master",1);
        }
        if (n >= 21) me->set("balance", 0);
        me->move(quest_rooms[n-1]);
        WEBD->send_quest_status(me);
        write(sprintf("已跳到任务 %d/35\n", n));
        return 1;
    }

    if (cmd == "gold") {
        if (!param || sscanf(param, "%d", n) != 1 || n < 0)
        { write("金额需为非负整数。\n"); return 1; }
        me->set("balance", n);
        if (n == 0 && me->query(NEWBIE_VILLAGE_INDEX) == 17) {
            me->add(NEWBIE_VILLAGE_INDEX, 1);
            WEBD->send_quest_status(me);
        }
        write(sprintf("存款=%d\n", n));
        return 1;
    }

    if (cmd == "advance") {
        idx = me->query(NEWBIE_VILLAGE_INDEX);
        if (idx < 35) {
            me->set(NEWBIE_VILLAGE_INDEX, idx + 1);
            WEBD->send_quest_status(me);
            write(sprintf("任务 %d → %d\n", idx, idx+1));
        } else {
            write("已是最后一步。\n");
        }
        return 1;
    }

    write("未知子命令：" + cmd + "\n");
    return 1;
}
