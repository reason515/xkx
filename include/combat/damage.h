// calc_damage.h — 战斗伤害计算（移植自 pkuxkx，精简适配 xkx2001）
// 跳过依赖缺失的子系统（choose_attack_skill / combat_msg / special_armor_effect）

#include <ansi.h>

mixed calc_damage(object me, object victim, object weapon, mapping my, mapping your, mapping action)
{
    int damage_bonus, defense_factor, damage;
    int deepj, weekj, defatk;
    string force_skill, martial_skill, attack_skill;
    mixed foo;
    string result = "";

    attack_skill = objectp(weapon) ? (string)weapon->query("skill_type") : "unarmed";

    martial_skill = me->query_skill_mapped(attack_skill);

    // 基础伤害：武器/空手 apply/damage + 单系加成
    if (objectp(weapon))
        damage = (int)me->query_temp("apply/damage")
               + (int)me->query_temp("apply/dmg_map/" + attack_skill);
    else
        damage = (int)me->query_temp("apply/damage")
               + (int)me->query_temp("apply/dmg_map/unarmed");

    if (damage < 0) damage = 0;
    damage = (damage + random(damage)) / 2;

    // 招式伤害加成
    if (action["damage"])
        damage += action["damage"] * damage / 100;

    // 膂力加成
    damage_bonus = me->query_str();
    if (action["force"])
        damage_bonus += action["force"] * damage_bonus / 100;

    // 加力 + 内功 hit_ob
    if (my["jiali"] && (my["neili"] > my["jiali"])) {
        if (force_skill = me->query_skill_mapped("force")) {
            foo = SKILL_D(force_skill)->hit_ob(me, victim, damage_bonus, my["jiali"]);
            if (stringp(foo))
                result += foo;
            else if (intp(foo))
                damage_bonus += foo;
        }
        if (strwidth(result)) {
            message_vision(result, me, victim);
            result = "";
        }
    }

    // 外功 hit_ob
    if (martial_skill) {
        foo = SKILL_D(martial_skill)->hit_ob(me, victim, damage_bonus);
        if (stringp(foo))
            result += foo;
        else if (intp(foo))
            damage_bonus += foo;
        if (strwidth(result)) {
            message_vision(result, me, victim);
            result = "";
        }
    }

    // 武器/NPC 特殊伤害
    if (objectp(weapon)) {
        foo = weapon->hit_ob(me, victim, damage_bonus);
        if (stringp(foo)) result += foo;
        else if (intp(foo)) damage_bonus += foo;
        if (strwidth(result)) {
            message_vision(result, me, victim);
            result = "";
        }
    } else {
        foo = me->hit_ob(me, victim, damage_bonus);
        if (stringp(foo)) result += foo;
        else if (intp(foo)) damage_bonus += foo;
        if (strwidth(result)) {
            message_vision(result, me, victim);
            result = "";
        }
    }

    // 最终伤害
    if (damage_bonus > 0)
        damage += (damage_bonus + random(damage_bonus)) / 2;

    // 伤害增益/减伤系统（无外部依赖）
    deepj = (int)me->query_temp("apply/deep_injure");
    weekj = (int)victim->query_temp("apply/week_injure");
    defatk = (int)victim->query_temp("apply/defense_attack");

    if (deepj > 0 || weekj > 0 || defatk > 0) {
        if (deepj < -75) deepj = -75;
        if (deepj > 400) deepj = 400;
        if (weekj < -400) weekj = -400;
        if (weekj > 75) weekj = 75;
        if (defatk < 0) defatk = 0;
        if (defatk > damage / 2) defatk = damage / 2;
        damage = (damage - defatk) * (100 + deepj) / 100 * (100 - weekj) / 100;
    }

    if (damage < 0) damage = 0;

    // 战斗经验减伤
    defense_factor = your["combat_exp"];
    if (!intp(my["combat_exp"]) || my["combat_exp"] <= 0)
        my["combat_exp"] = 0;
    while (random(defense_factor) > my["combat_exp"]) {
        damage -= damage / 3;
        defense_factor /= 2;
    }

    return ({damage, result});
}
