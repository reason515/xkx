//Cracked by Roath
// bankhuoji  钱庄伙计
// Ssy
//
// 修复：原先只声明了 web/can_withdraw 却没有任何钱庄业务命令，前端会展示
// 按钮而点击全部失败。现继承 BANKER（check/deposit/withdraw/convert/transfer
// 全套业务），startroom 在 init() 中按所在分号动态设置，保证宝源钱庄、
// 宝源钱局两个分号都能正常办理业务。

inherit BANKER;
inherit NPC;

void create()
{
        set_name("钱庄伙计", ({ "huoji", "keeper" }));
        set("str", 20);
        set("gender", "男性");
        set("age", 25);
        set("long", "他是个勤劳的伙计，肚子里也有些墨水。\n");
        set("combat_exp", 5000);
        set("attitude", "friendly");

        set("web/can_withdraw", 1);
        setup();
}

void init()
{
        /* 银票全国通用：伙计在哪个分号，就为哪个分号办理业务。 */
        set("startroom", base_name(environment()));
        ::init();
}
