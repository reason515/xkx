/** 帮助文章 */
export interface HelpArticle {
  /** 稳定 ID，用于引用和链接 */
  id: string;
  /** 标题 */
  title: string;
  /** 一句话说明 */
  summary: string;
  /** 分类 */
  category: HelpCategory;
  /** 适用阶段 */
  stage: HelpStage;
  /** 前置条件 */
  prereqs?: string[];
  /** 正文（支持简单 HTML 标签） */
  body: string;
  /** 相关文章 ID */
  related?: string[];
  /** 可执行动作（Web 按钮） */
  actions?: HelpAction[];
  /** 发布状态 */
  status: "published" | "draft" | "deprecated";
}

export type HelpCategory =
  | "newbie_village"     // 新手村
  | "attribute"          // 属性/人物
  | "basic"              // 基础玩法
  | "yangzhou"           // 扬州入门
  | "combat"             // 战斗
  | "skill"              // 武功
  | "economy"            // 经济
  | "rule"               // 规则
  | "map"                // 地图
  | "advanced";          // 高级

export type HelpStage =
  | "newbie_village"     // 新手村
  | "graduate"           // 毕业
  | "yangzhou"           // 初入江湖
  | "growth"             // 成长
  | "advanced";          // 高手

export interface HelpAction {
  label: string;
  command: string;
}
