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

    // 与 xkxe2e 同款开关：仅 e2e/调试环境开启，防止正式玩家利用测试指令白拿技能/进度
    if (file_size("/adm/etc/xkd_e2e") < 0)
        return notify_fail("什么？\n");
    if (!me->query_temp("web_client") && !wizardp(me)) {
        write("仅 Web 客户端可用。\n"); return 1;
    }
    // FluffOS sscanf 部分匹配返回 0：单 token 子命令（hunger/advance）
    // 需降级为 %s 单格式再解析一次
    if (!arg || sscanf(arg, "%s %s", cmd, param) < 1) {
        if (!arg || sscanf(arg, "%s", cmd) != 1) {
            write("用法：newbietest skip <1-35> | gold <amount> | hunger | advance\n");
            return 1;
        }
    }

    if (cmd == "skip") {
        if (!param || sscanf(param, "%d", n) != 1 || n < 1 || n > 35)
        { write("任务编号需在 1-35 之间。\n"); return 1; }
        me->set(NEWBIE_VILLAGE_INDEX, n);
        if (n >= 5) { me->set("food",me->max_food_capacity()); me->set("water",me->max_food_capacity()); }
        if (n >= 15) me->set("balance", 10000);
        if (n >= 20) {
            // 模拟「学习武师全部功夫到5级」的中间态（任务24要求），否则跳过任务后无法继续
            me->set_skill("force",5); me->set_skill("dodge",5); me->set_skill("parry",5);
            me->set_skill("strike",5); me->set_skill("sword",5);
            me->set_skill("taiyi-shengong",5); me->set_skill("taiyi-you",5);
            me->set_skill("taiyi-zhang",5); me->set_skill("taiyi-jian",5);
            me->set("newbie_village/master",1);
        }
        if (n >= 21) me->set("balance", 0);
        me->move(quest_rooms[n-1]);
        WEBD->send_quest_status(me);
        // 输出延迟到指令结束后再发：FluffOS 会把指令内所有输出与 move 的
        // 房间 look 一起 flush，Web 端房间 look 过滤会吞掉同 chunk 的 write()。
        call_out("skip_feedback", 1, me, n);
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

    if (cmd == "hunger") {
        // 测试辅助：直接构造饥饿/干渴（食物饮水归零），用于验证
        // 「食物为0时精力仍恢复、可走动」等场景（e2e 亦可用）
        me->set("food", 0);
        me->set("water", 0);
        write("已设置食物/饮水为 0（饥饿状态）。\n");
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

// 指令返回后再提示，避免与房间 look 同包被 Web 见闻过滤
void skip_feedback(object me, int n)
{
    if (!objectp(me)) return;
    if (n >= 20) {
        tell_object(me, HIG"（测试数据）已自动授予基本内功/轻功/招架/掌法/剑法与太乙神功/神游/掌法/剑法各5级，\n并视为武师徒弟。这是跳过任务20+的测试模拟数据，并非真实学习所得。\n"NOR);
    }
    tell_object(me, sprintf("已跳到任务 %d/35\n", n));
}
