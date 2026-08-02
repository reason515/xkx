/**
 * 区域地图数据（柳秀山庄 / 扬州城）— 语义网格坐标系统
 *
 * 坐标规范：
 * - col=0,row=0 为最北最西（左上角）
 * - 每格约 80-100px，由渲染器统一换算
 * - 出口方向严格对应 DIR 表中的八向偏移
 * - via 用于绕开建筑群的折线，每段仍须是八向之一
 * - path 为 LPC 房间文件名（base_name 末段，如 dongdajie1），
 *   用于按 roomPath 精确定位当前房间（同名房间如 东大街×3 必须靠它区分）
 */

export interface MapNode {
  id: string;
  name: string;
  col: number;
  row: number;
  /** LPC room file base name（不含 .c）— 用于精确匹配当前房间 */
  path?: string;
}

export interface MapEdge {
  from: string;
  to: string;
  dir: string;
  /** 可选：绕行中间网格点 */
  via?: [number, number][];
}

export interface MapZone {
  label: string;
  col: number;
  row: number;
  /** 额外纵向偏移(px) */
  dy?: number;
  letterSpacing?: number;
}

export interface RoomMap {
  grid: { x: number; y: number };
  nodes: MapNode[];
  edges: MapEdge[];
  /** 区域文字标注 */
  zones?: MapZone[];
}

/** 八向偏移 */
export const DIR: Record<string, [number, number]> = {
  north:     [ 0, -1],
  northeast: [ 1, -1],
  east:      [ 1,  0],
  southeast: [ 1,  1],
  south:     [ 0,  1],
  southwest: [-1,  1],
  west:      [-1,  0],
  northwest: [-1, -1],
};

/** 柳秀山庄 + 未明谷 八向网格地图 */
export const LXSz_MAP: RoomMap = {
  grid: { x: 88, y: 80 },
  zones: [
    { label: "柳 秀 山 庄", col: 2, row: 0, dy: -8 },
    { label: "集 镇", col: 2, row: 9.5 },
    { label: "未 明 谷", col: 2, row: 14 },
  ],
  nodes: [
    // ======= 柳秀山庄 (row 0~7) =======
    { id: "cangshuge",    name: "藏书阁",     col: 4, row: 0 },
    { id: "shangwutang",  name: "尚武堂",     col: 4, row: 1 },
    { id: "nanyushi",     name: "男浴室",     col: 2, row: 1 },
    { id: "nvyushi",      name: "女浴室",     col: 6, row: 1 },
    { id: "zhengting",    name: "正厅",       col: 4, row: 3 },
    { id: "wxiangfang",   name: "西厢房",     col: 2, row: 3 },
    { id: "exiangfang",   name: "东厢房",     col: 6, row: 3 },
    { id: "yangui-huayuan", name: "岩桂花园", col: 4, row: 5 },
    { id: "changlang",    name: "长廊",       col: 4, row: 6 },

    // ======= 山庄大门 (row 8~9) =======
    { id: "shanzhuang-damen", name: "山庄大门", col: 4, row: 8 },
    { id: "dangpu",       name: "当铺",       col: 2, row: 8 },
    { id: "piaohao",      name: "票号",       col: 6, row: 8 },

    // ======= 集镇 (row 9~13) =======
    { id: "jizhen2",      name: "集镇小道·北", col: 4, row: 9 },
    { id: "tiejiangpu",   name: "铁匠铺",     col: 2, row: 9 },
    { id: "zahuopu",      name: "杂货铺",     col: 6, row: 9 },
    { id: "jizhen1",      name: "集镇小道·南", col: 4, row: 11 },
    { id: "yaopu",        name: "药铺",       col: 5, row: 10 },
    { id: "jiupu",        name: "酒铺",       col: 5, row: 12 },
    { id: "xingzilin",    name: "杏子林",     col: 2, row: 11 },
    { id: "chemahang",    name: "车马行",     col: 2, row: 13 },

    // ======= 缓坡 + 未明谷 (row 14~16) =======
    { id: "huanpo",         name: "缓坡",       col: 4, row: 14 },
    { id: "weiminggu",      name: "未明谷",     col: 4, row: 16 },
    { id: "qingshiqiaotou", name: "青石桥头",   col: 4, row: 17 },
    { id: "shulin",         name: "树林",       col: 2, row: 16 },
    { id: "luanshizhen",    name: "乱石阵",     col: 6, row: 16 },
  ],
  edges: [
    // 山庄内部
    { from: "cangshuge",    to: "shangwutang",  dir: "south" },
    { from: "shangwutang",  to: "zhengting",    dir: "south" },
    { from: "zhengting",    to: "yangui-huayuan", dir: "south" },
    { from: "yangui-huayuan", to: "changlang",  dir: "south" },
    { from: "wxiangfang",   to: "zhengting",    dir: "east" },
    { from: "exiangfang",   to: "zhengting",    dir: "west" },
    { from: "nanyushi",     to: "wxiangfang",   dir: "south" },
    { from: "nvyushi",      to: "exiangfang",   dir: "south" },
    // 长廊 → 山门 (open gate)
    { from: "changlang",    to: "shanzhuang-damen", dir: "south" },

    // 山门
    { from: "shanzhuang-damen", to: "jizhen2",  dir: "south" },
    { from: "dangpu",       to: "shanzhuang-damen", dir: "east" },
    { from: "piaohao",      to: "shanzhuang-damen", dir: "west" },

    // 集镇
    { from: "jizhen2",      to: "jizhen1",      dir: "south" },
    { from: "tiejiangpu",   to: "jizhen2",      dir: "east" },
    { from: "zahuopu",      to: "jizhen2",      dir: "west" },
    { from: "jizhen1",      to: "yaopu",        dir: "northeast" },
    { from: "jizhen1",      to: "jiupu",        dir: "southeast" },
    { from: "jizhen1",      to: "xingzilin",    dir: "west" },
    { from: "xingzilin",    to: "chemahang",    dir: "south" },

    // 缓坡 → 集镇
    { from: "huanpo",       to: "jizhen1",      dir: "north" },
    // 缓坡 → 青石桥头 (climb)
    { from: "huanpo",       to: "qingshiqiaotou", dir: "south" },
    // 青石桥头 → 未明谷
    { from: "qingshiqiaotou", to: "weiminggu",  dir: "north" },
    // 未明谷 周围
    { from: "weiminggu",    to: "shulin",       dir: "west" },
    { from: "weiminggu",    to: "luanshizhen",  dir: "east" },
  ],
};

/**
 * 扬州城八向网格地图
 *
 * 拓扑完全对照 d/city/*.c 的 exits：
 * - 北城区：北门→北集市→北集市→中央广场
 * - 主街：西门－西大街×3－中央广场－东大街×3－东门
 * - 南城区：中央广场→南集市→南大街→南大街→南门
 * - 城南野径（挂机区）：民屋→城南小径→…→寨口
 */
export const YANGZHOU_MAP: RoomMap = {
  grid: { x: 88, y: 80 },
  zones: [
    { label: "扬 州 城", col: 1.2, row: 0.35 },
    { label: "城 南 野 径", col: 8.6, row: 12.4, letterSpacing: 3 },
  ],
  nodes: [
    // ===== 北城区 =====
    { id: "beimen",        name: "北门",     col: 4, row: 0, path: "beimen" },
    { id: "wumiao",        name: "武庙",     col: 3, row: 1, path: "wumiao" },
    { id: "beidajie2",     name: "北集市",   col: 4, row: 1, path: "beidajie2" },
    { id: "zuixianlou",    name: "醉仙楼",   col: 5, row: 1, path: "zuixianlou" },
    { id: "majiu",         name: "马厩",     col: 3, row: 2, path: "majiu" },
    { id: "huadian",       name: "鲜花店",   col: 2, row: 3, path: "huadian" },
    { id: "kedian",        name: "客店",     col: 3, row: 3, path: "kedian" },
    { id: "beidajie1",     name: "北集市",   col: 4, row: 3, path: "beidajie1" },
    { id: "tianbaoge",     name: "天宝阁",   col: 5, row: 3, path: "tianbaoge" },
    { id: "cangshuge",     name: "白鹿藏书阁", col: 6, row: 3, path: "cangshuge" },
    { id: "caizhu",        name: "翰林府门", col: 1, row: 4, path: "caizhu" },
    { id: "bingyindamen",  name: "兵营大门", col: 2, row: 4, path: "bingyindamen" },
    { id: "chaguan",       name: "春来茶馆", col: 3, row: 4, path: "chaguan" },
    { id: "shuyuan",       name: "书院",     col: 5, row: 4, path: "shuyuan" },
    { id: "yaopu",         name: "药铺",     col: 6, row: 4, path: "yaopu" },
    { id: "qianzhuang",    name: "钱庄",     col: 7, row: 4, path: "qianzhuang" },

    // ===== 主街：西门－西大街×3－中央广场－东大街×3－东门 =====
    { id: "ximen",         name: "西门",     col: 0, row: 5, path: "ximen" },
    { id: "xidajie3",      name: "西大街",   col: 1, row: 5, path: "xidajie3" },
    { id: "xidajie2",      name: "西大街",   col: 2, row: 5, path: "xidajie2" },
    { id: "xidajie1",      name: "西大街",   col: 3, row: 5, path: "xidajie1" },
    { id: "guangchang",    name: "中央广场", col: 4, row: 5, path: "guangchang" },
    { id: "dongdajie1",    name: "东大街",   col: 5, row: 5, path: "dongdajie1" },
    { id: "dongdajie2",    name: "东大街",   col: 6, row: 5, path: "dongdajie2" },
    { id: "dongdajie3",    name: "东大街",   col: 7, row: 5, path: "dongdajie3" },
    { id: "dongmen",       name: "东门",     col: 8, row: 5, path: "dongmen" },

    // ===== 主街两侧 =====
    { id: "biaoju",        name: "福威镖局", col: 1, row: 6, path: "biaoju" },
    { id: "yamen",         name: "衙门",     col: 2, row: 6, path: "yamen" },
    { id: "weiqi_qiyuan",  name: "象棋棋苑", col: 3, row: 6, path: "weiqi_qiyuan" },
    { id: "zahuopu",       name: "杂货铺",   col: 5, row: 6, path: "zahuopu" },
    { id: "datiepu",       name: "打铁铺",   col: 6, row: 6, path: "datiepu" },
    { id: "yuelao",        name: "月老亭",   col: 7, row: 6, path: "yuelao" },

    // ===== 南城区 =====
    { id: "eproom",        name: "拱猪房",   col: 2, row: 7, path: "eproom" },
    { id: "duchang",       name: "赌场",     col: 3, row: 7, path: "duchang" },
    { id: "nandajie1",     name: "南集市",   col: 4, row: 7, path: "nandajie1" },
    { id: "dangpu",        name: "当铺",     col: 5, row: 7, path: "dangpu" },
    { id: "xiaobaozhai",   name: "小宝斋",   col: 6, row: 7, path: "xiaobaozhai" },
    { id: "minwu1",        name: "民屋",     col: 7, row: 7, path: "minwu1" },
    { id: "jujinge",       name: "聚金阁",   col: 3, row: 8, path: "jujinge" },
    { id: "nandajie2",     name: "南大街",   col: 4, row: 8, path: "nandajie2" },
    { id: "dongnanjie",    name: "东南街",   col: 5, row: 8, path: "dongnanjie" },
    { id: "xiangnanjie",   name: "象南街",   col: 6, row: 8, path: "xiangnanjie" },
    { id: "yangzhou_grind1", name: "城南小径", col: 7, row: 8, path: "yangzhou_grind1" },
    { id: "xiaotulu",      name: "小土路",   col: 8, row: 8, path: "xiaotulu" },
    { id: "minwu2",        name: "民屋",     col: 9, row: 8, path: "minwu2" },
    { id: "guopintan",     name: "果品摊",   col: 5, row: 9, path: "guopintan" },
    { id: "mipu",          name: "米铺",     col: 6, row: 9, path: "mipu" },
    { id: "yangzhou_grind2", name: "荒草坡", col: 7, row: 9, path: "yangzhou_grind2" },
    { id: "xiaomiao",      name: "小庙",     col: 9, row: 9, path: "xiaomiao" },
    { id: "dayuan",        name: "大院子",   col: 10, row: 9, path: "dayuan" },
    { id: "chaguan1",      name: "春来茶馆", col: 2, row: 10, path: "chaguan1" },
    { id: "jiuguan",       name: "高升酒馆", col: 3, row: 10, path: "jiuguan" },
    { id: "nandajie3",     name: "南大街",   col: 4, row: 10, path: "nandajie3" },
    { id: "lichunyuan",    name: "丽春院",   col: 5, row: 10, path: "lichunyuan" },
    { id: "nanmen",        name: "南门",     col: 4, row: 11, path: "nanmen" },

    // ===== 城南野径（挂机区）=====
    { id: "yangzhou_grind3", name: "野羊坡", col: 7, row: 10, path: "yangzhou_grind3" },
    { id: "yangzhou_grind4", name: "枯藤径", col: 7, row: 11, path: "yangzhou_grind4" },
    { id: "yangzhou_grind5", name: "泥潭边", col: 7, row: 12, path: "yangzhou_grind5" },
    { id: "yangzhou_grind6", name: "狼嚎谷", col: 7, row: 13, path: "yangzhou_grind6" },
    { id: "yangzhou_grind7", name: "断桥",   col: 7, row: 14, path: "yangzhou_grind7" },
    { id: "yangzhou_grind8", name: "寨口",   col: 7, row: 15, path: "yangzhou_grind8" },
  ],
  edges: [
    // ---- 北城区 ----
    { from: "beimen", to: "beidajie2", dir: "south" },
    { from: "beidajie2", to: "wumiao", dir: "west" },
    { from: "beidajie2", to: "zuixianlou", dir: "east" },
    { from: "beidajie2", to: "beidajie1", dir: "south" },
    { from: "majiu", to: "kedian", dir: "south" },
    { from: "majiu", to: "beidajie1", dir: "southeast" },
    { from: "huadian", to: "kedian", dir: "east" },
    { from: "kedian", to: "beidajie1", dir: "east" },
    { from: "beidajie1", to: "tianbaoge", dir: "east" },
    { from: "beidajie1", to: "guangchang", dir: "south" },
    { from: "shuyuan", to: "cangshuge", dir: "northeast" },
    { from: "caizhu", to: "xidajie3", dir: "south" },
    { from: "bingyindamen", to: "xidajie2", dir: "south" },
    { from: "chaguan", to: "xidajie1", dir: "south" },
    { from: "shuyuan", to: "dongdajie1", dir: "south" },
    { from: "yaopu", to: "dongdajie2", dir: "south" },
    { from: "qianzhuang", to: "dongdajie3", dir: "south" },

    // ---- 主街 ----
    { from: "ximen", to: "xidajie3", dir: "east" },
    { from: "xidajie3", to: "xidajie2", dir: "east" },
    { from: "xidajie2", to: "xidajie1", dir: "east" },
    { from: "xidajie1", to: "guangchang", dir: "east" },
    { from: "guangchang", to: "dongdajie1", dir: "east" },
    { from: "dongdajie1", to: "dongdajie2", dir: "east" },
    { from: "dongdajie2", to: "dongdajie3", dir: "east" },
    { from: "dongdajie3", to: "dongmen", dir: "east" },

    // ---- 主街两侧 ----
    { from: "biaoju", to: "xidajie3", dir: "north" },
    { from: "yamen", to: "xidajie2", dir: "north" },
    { from: "weiqi_qiyuan", to: "xidajie1", dir: "north" },
    { from: "zahuopu", to: "dongdajie1", dir: "north" },
    { from: "datiepu", to: "dongdajie2", dir: "north" },
    { from: "yuelao", to: "dongdajie3", dir: "north" },

    // ---- 南城区 ----
    { from: "eproom", to: "duchang", dir: "east" },
    { from: "duchang", to: "nandajie1", dir: "east" },
    { from: "nandajie1", to: "dangpu", dir: "east" },
    { from: "nandajie1", to: "nandajie2", dir: "south" },
    { from: "jujinge", to: "nandajie2", dir: "east" },
    { from: "nandajie2", to: "dongnanjie", dir: "east" },
    { from: "dongnanjie", to: "xiangnanjie", dir: "east" },
    { from: "xiaobaozhai", to: "dongnanjie", dir: "southwest" },
    { from: "guopintan", to: "dongnanjie", dir: "north" },
    { from: "mipu", to: "xiangnanjie", dir: "north" },
    { from: "minwu1", to: "xiangnanjie", dir: "southwest" },
    { from: "minwu1", to: "yangzhou_grind1", dir: "south" },
    { from: "xiaotulu", to: "xiangnanjie", dir: "west" },
    { from: "xiaotulu", to: "minwu2", dir: "east" },
    { from: "minwu2", to: "xiaomiao", dir: "south" },
    { from: "xiaomiao", to: "dayuan", dir: "east" },
    { from: "nandajie2", to: "nandajie3", dir: "south" },
    { from: "chaguan1", to: "nandajie3", dir: "east" },
    { from: "jiuguan", to: "nandajie3", dir: "east" },
    { from: "nandajie3", to: "lichunyuan", dir: "east" },
    { from: "nandajie3", to: "nanmen", dir: "south" },

    // ---- 城南野径 ----
    { from: "yangzhou_grind1", to: "yangzhou_grind2", dir: "south" },
    { from: "yangzhou_grind2", to: "yangzhou_grind3", dir: "south" },
    { from: "yangzhou_grind3", to: "yangzhou_grind4", dir: "south" },
    { from: "yangzhou_grind4", to: "yangzhou_grind5", dir: "south" },
    { from: "yangzhou_grind5", to: "yangzhou_grind6", dir: "south" },
    { from: "yangzhou_grind6", to: "yangzhou_grind7", dir: "south" },
    { from: "yangzhou_grind7", to: "yangzhou_grind8", dir: "south" },
  ],
};

export const AREA_MAPS: Record<string, RoomMap> = {
  "newbie_lxsz": LXSz_MAP,
  "yangzhou": YANGZHOU_MAP,
};
