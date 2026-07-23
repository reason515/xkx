import { useMemo } from "react";

interface Props {
  /** Current quest index from server (1-based). */
  questIndex: number;
}

const NEWBIE_QUESTS: string[] = [
  "点击顶部姓名区域打开角色面板，查看自己的身体情况",
  "点击场景中的「查看」按钮观察溪流(river)，点击地上的葫芦或野果拾取并食用/饮用",
  "点击 east、west、south 等出口按钮，探索周围三块地方后回到未明谷",
  "点击山坡(path)的「查看」，再点击「攀爬」离开未明谷",
  "拿着刻有「柳秀山庄」的葫芦去柳秀山庄问问",
  "点击丫鬟，选择「打听」，询问关于葫芦的事",
  "点击大门，选择「敲门」",
  "点击游鲲翼，选择「给予」，把葫芦交给他",
  "点击游鲲翼，选择「打听」，询问关于闯荡江湖的事",
  "点击阿姝，选择「跟随」",
  "脱下布衣，点击浴桶的「洗澡」按钮",
  "穿上衣服，点击游鲲翼「打听」——闯荡江湖",
  "前往尚武堂，点击武师选择「切磋」",
  "回到厢房，点击床铺的「睡觉」按钮恢复体力",
  "点击游鲲翼「打听」——闯荡江湖！",
  "使用菜单「地图」查看票号位置，前往票号取钱",
  "点击柳住钱，选择「取款」，输入金额确认",
  "去药铺点击伙计「购买」金创药，在行囊中点击药物「服用」",
  "点击游鲲翼「打听」——闯荡江湖！！",
  "点击武师选择「拜师」",
  "帮武师去铁匠铺买钢剑、去酒铺买烧刀子，点击武师「给予」交出",
  "再去酒铺买鸡腿、杂货铺买食盒，点击食盒「放入物品」，再点击武师「给予」交出",
  "点击武师选择「查看技能」",
  "点击武师「请教」，学习所有基本和高级功夫到 5 级",
  "打开角色面板武功页，点击各特殊武功的激发槽位",
  "在角色面板武功页，点击太乙掌法的「准备出招」",
  "前往尚武堂，点击武师「切磋」",
  "打开修炼面板（菜单→修炼），练习太乙剑法",
  "点击游鲲翼「打听」——闯荡江湖！！！",
  "前往未明谷树林，点击老虎「攻击」，再点「绝招」按钮使用剑法",
  "点击游鲲翼「打听」——闯荡江湖！！！！",
  "前往藏书阁，点击书架取书，在行囊中点击书籍「阅读」",
  "点击游鲲翼「打听」——闯荡江湖！！！！！",
  "前往杏子林，打开菜单→发言，点击「道别游鲲翼」",
  "到车马行点击「雇车」去扬州",
];

export function QuestPanel({ questIndex }: Props) {
  const currentIdx = questIndex;
  const total = NEWBIE_QUESTS.length;

  const { done, current, todo } = useMemo(() => {
    if (currentIdx > total) {
      return {
        done: NEWBIE_QUESTS,
        current: null,
        todo: [],
      };
    }
    return {
      done: NEWBIE_QUESTS.slice(0, currentIdx - 1),
      current: NEWBIE_QUESTS[currentIdx - 1] || null,
      todo: NEWBIE_QUESTS.slice(currentIdx),
    };
  }, [currentIdx, total]);

  if (!currentIdx || currentIdx < 1) return null;

  return (
    <div className="newbie-quest-panel">
      {current && (
        <div className="quest-current">
          <div className="quest-label">当前目标</div>
          <p className="quest-target">{current}</p>
          <div className="quest-progress">
            <div
              className="quest-progress-fill"
              style={{ width: `${Math.min(100, ((currentIdx - 1) / total) * 100)}%` }}
            />
          </div>
          <div className="quest-step">
            第 {currentIdx} / {total} 步
          </div>
        </div>
      )}

      {done.length > 0 && (
        <details className="quest-done-section" open={false}>
          <summary>已完成（{done.length} 步）</summary>
          <ul className="quest-done-list">
            {done.map((q, i) => (
              <li key={i} className="quest-done-item">
                {q}
              </li>
            ))}
          </ul>
        </details>
      )}

      {todo.length > 0 && (
        <details className="quest-todo-section">
          <summary>后续（{todo.length} 步）</summary>
          <ul className="quest-todo-list">
            {todo.map((q, i) => (
              <li key={i} className="quest-todo-item">
                {q}
              </li>
            ))}
          </ul>
        </details>
      )}
    </div>
  );
}
