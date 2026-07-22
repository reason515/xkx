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
  "向游鲲翼依次打听：here、name、葫芦、闯荡江湖",
  "点击阿姝，选择「跟随」",
  "脱下布衣，点击浴桶选择「洗澡」",
  "穿上衣服，向游鲲翼打听闯荡江湖",
  "前往尚武堂，点击武师选择「切磋」",
  "回到厢房点击「睡觉」恢复体力",
  "向游鲲翼打听闯荡江湖！",
  "查看任务面板，前往票号取钱",
  "点击柳住钱选择「取款」",
  "去药铺买药，在行囊中点击药物选择「服用」",
  "向游鲲翼打听闯荡江湖！！",
  "点击武师选择「拜师」",
  "帮武师买一把钢剑和烧刀子酒，回来交给他",
  "再买个鸡腿和食盒，把鸡腿放进食盒交给武师",
  "点击武师选择「查看技能」",
  "向武师请教，学习所有基本和高级功夫到 5 级",
  "打开角色面板，在武功页激发内功、轻功、掌法、剑法和招架",
  "在武功页准备空手技能为太乙掌法",
  "前往尚武堂找武师再次切磋",
  "练习太乙剑法，学会使用绝招",
  "向游鲲翼打听闯荡江湖！！！",
  "前往未明谷的树林除掉老虎",
  "向游鲲翼打听闯荡江湖！！！！",
  "前往藏书阁，点击书架取书并阅读",
  "向游鲲翼打听闯荡江湖！！！！！",
  "前往杏子林和游鲲翼道别",
  "到车马行雇车(gu yangzhou)去扬州",
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
