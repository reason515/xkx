import { useMemo, useState, useCallback, useEffect } from "react";

interface Props {
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

export function FloatingQuestBar({ questIndex }: Props) {
  const [open, setOpen] = useState(false);
  const total = NEWBIE_QUESTS.length;

  const currentIdx = questIndex;

  const { current, done, todo } = useMemo(() => {
    if (currentIdx > total) {
      return { current: null, done: NEWBIE_QUESTS, todo: [] };
    }
    return {
      current: NEWBIE_QUESTS[currentIdx - 1] || null,
      done: NEWBIE_QUESTS.slice(0, currentIdx - 1),
      todo: NEWBIE_QUESTS.slice(currentIdx),
    };
  }, [currentIdx, total]);

  // Lock body scroll when sheet is open
  useEffect(() => {
    if (open) {
      const prev = document.body.style.overflow;
      document.body.style.overflow = "hidden";
      return () => {
        document.body.style.overflow = prev;
      };
    }
  }, [open]);

  const handleDismiss = useCallback(() => setOpen(false), []);

  if (!currentIdx || currentIdx < 1 || currentIdx > total) return null;

  return (
    <>
      {/* Collapsed floating pill */}
      <button
        type="button"
        className="fqb-pill"
        data-testid="floating-quest-pill"
        onClick={() => setOpen(true)}
        aria-label={`新手任务：第 ${currentIdx} / ${total} 步，点击查看详情`}
      >
        <span className="fqb-pill-step">
          {currentIdx}/{total}
        </span>
        <span className="fqb-pill-text">{current}</span>
        <span className="fqb-pill-chevron">▸</span>
      </button>

      {/* Expanded bottom sheet */}
      {open && (
        <div
          className="fqb-overlay"
          data-testid="floating-quest-sheet"
          onClick={handleDismiss}
        >
          <div
            className="fqb-sheet"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="fqb-sheet-handle" />
            <div className="fqb-sheet-top">
              <h3 className="fqb-sheet-title">新手任务</h3>
              <button
                type="button"
                className="fqb-sheet-close"
                aria-label="收起"
                onClick={handleDismiss}
              >
                收起
              </button>
            </div>

            <div className="fqb-sheet-body">
              {current && (
                <div className="fqb-current">
                  <div className="fqb-current-label">当前目标</div>
                  <p className="fqb-current-text">{current}</p>
                  <div className="fqb-progress-bar">
                    <div
                      className="fqb-progress-fill"
                      style={{
                        width: `${Math.min(100, ((currentIdx - 1) / total) * 100)}%`,
                      }}
                    />
                  </div>
                  <div className="fqb-progress-label">
                    第 {currentIdx} / {total} 步
                  </div>
                </div>
              )}

              {done.length > 0 && (
                <details className="fqb-section" open={false}>
                  <summary>已完成（{done.length} 步）</summary>
                  <ul className="fqb-list done">
                    {done.map((q, i) => (
                      <li key={i}>{q}</li>
                    ))}
                  </ul>
                </details>
              )}

              {todo.length > 0 && (
                <details className="fqb-section">
                  <summary>后续（{todo.length} 步）</summary>
                  <ul className="fqb-list todo">
                    {todo.map((q, i) => (
                      <li key={i}>{q}</li>
                    ))}
                  </ul>
                </details>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
