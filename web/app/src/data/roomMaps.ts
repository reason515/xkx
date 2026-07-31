/**
 * 柳秀山庄区域地图数据 — 语义网格坐标系统
 *
 * 坐标规范：
 * - col=0,row=0 为最北最西（左上角）
 * - 每格约 80-100px，由渲染器统一换算
 * - 出口方向严格对应 DIR 表中的八向偏移
 * - via 用于绕开建筑群的折线，每段仍须是八向之一
 */

export interface MapNode {
  id: string;
  name: string;
  col: number;
  row: number;
}

export interface MapEdge {
  from: string;
  to: string;
  dir: string;
  /** 可选：绕行中间网格点 */
  via?: [number, number][];
}

export interface RoomMap {
  grid: { x: number; y: number };
  nodes: MapNode[];
  edges: MapEdge[];
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

export const AREA_MAPS: Record<string, RoomMap> = {
  "newbie_lxsz": LXSz_MAP,
};
