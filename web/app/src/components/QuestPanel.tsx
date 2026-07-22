import { useMemo } from "react";

interface Props {
  /** Current quest index from server (1-based). */
  questIndex: number;
}

const NEWBIE_QUESTS: string[] = [
  "你来到这个陌生的地方，前途未卜，请先用 hp 命令检查自己的身体情况.",
  "使用 look river 命令，根据提示先让自己喝饱吃足。地上的野果也可以捡起来充饥。",
  "用 east、west、south 等方向命令来探索未明谷周围的三块地方，并回到未明谷。",
  "使用 look path 命令，根据提示离开未明谷。",
  "拿着刻有「柳秀山庄」的葫芦去柳秀山庄一问究竟。",
  "向丫鬟询问有关「葫芦」的事情。",
  "再次敲门，去见山庄庄主。",
  "把葫芦交给游鲲翼。",
  "向游鲲翼依次打听：here、name、葫芦、闯荡江湖。",
  "跟随丫鬟阿姝，她会带你熟悉一下山庄。",
  "把脏衣服脱了，在浴室洗个澡。",
  "洗完穿上衣服，向游鲲翼打听闯荡江湖。",
  "尚武堂找武师比武。",
  "回到厢房睡一觉补充体力。",
  "向游鲲翼打听闯荡江湖！",
  "使用 localmaps 命令查看票号的位置。",
  "到票号把钱都给取出来。",
  "去药铺买药，把身上的伤完全治好。",
  "向游鲲翼打听闯荡江湖！！",
  "找武师拜师学艺。",
  "帮武师去铁匠铺买一把钢剑，去酒铺买一壶烧刀子酒，回来交给武师。",
  "再去酒铺买个鸡腿，去杂货铺买个食盒，把鸡腿放到食盒里交给武师。",
  "查看武师技能。",
  "学习武师身上所有基本功夫到 5 级，所有高级功夫到 5 级。",
  "激发内功为太乙神功、轻功为太乙轻功、掌法为太乙掌法、剑法为太乙剑法、招架为太乙剑法。",
  "指定平时要用的空手技能——太乙掌法。",
  "尚武堂找武师再次比武。",
  "练习一级太乙剑法，学会用太乙剑法的一个绝招。",
  "向游鲲翼打听闯荡江湖！！！",
  "去未明谷的树林除掉老虎。",
  "向游鲲翼打听闯荡江湖！！！！",
  "去藏书阁读江湖掌故。",
  "向游鲲翼打听闯荡江湖！！！！！",
  "去杏子林和游鲲翼道别。",
  "到南面的车马行坐马车去扬州。",
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
