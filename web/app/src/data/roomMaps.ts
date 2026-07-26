export interface RoomNode {
  id: string;
  name: string;
  x: number;
  y: number;
  exits: Record<string, string>;
}

/**
 * 柳秀山庄区域地图 — 严格遵循 LPC 房间 exit 方向
 * north=↑ south=↓ east=→ west=←
 */
export const LXSz_MAP: RoomNode[] = [
  // ======== 柳秀山庄 (northernmost y=40~440) ========
  { id: "cangshuge", name: "藏书阁", x: 230, y: 40, exits: { south: "shangwutang" } },
  { id: "shangwutang", name: "尚武堂", x: 230, y: 120, exits: { north: "cangshuge", south: "zhengting" } },
  { id: "zhengting", name: "正厅", x: 230, y: 210, exits: { north: "shangwutang", west: "wxiangfang", east: "exiangfang", south: "yangui-huayuan" } },
  { id: "nanyushi", name: "男浴室", x: 70, y: 120, exits: { south: "wxiangfang" } },
  { id: "nvyushi", name: "女浴室", x: 390, y: 120, exits: { south: "exiangfang" } },
  { id: "wxiangfang", name: "西厢房", x: 70, y: 210, exits: { east: "zhengting", north: "nanyushi" } },
  { id: "exiangfang", name: "东厢房", x: 390, y: 210, exits: { west: "zhengting", north: "nvyushi" } },
  { id: "yangui-huayuan", name: "岩桂花园", x: 230, y: 300, exits: { north: "zhengting", south: "changlang" } },
  { id: "changlang", name: "长廊", x: 230, y: 380, exits: { north: "yangui-huayuan" } },

  // ======== 山庄大门 (y=460~540) ========
  { id: "shanzhuang-damen", name: "山庄大门", x: 230, y: 460, exits: { west: "dangpu", east: "piaohao", south: "jizhen2" } },
  { id: "dangpu", name: "当铺", x: 70, y: 460, exits: { east: "shanzhuang-damen" } },
  { id: "piaohao", name: "票号", x: 390, y: 460, exits: { west: "shanzhuang-damen" } },

  // ======== 集镇 (y=540~710) ========
  { id: "jizhen2", name: "集镇小道·北", x: 230, y: 540, exits: { north: "shanzhuang-damen", south: "jizhen1", west: "tiejiangpu", east: "zahuopu" } },
  { id: "tiejiangpu", name: "铁匠铺", x: 70, y: 540, exits: { east: "jizhen2" } },
  { id: "zahuopu", name: "杂货铺", x: 390, y: 540, exits: { west: "jizhen2" } },
  { id: "jizhen1", name: "集镇小道·南", x: 230, y: 630, exits: { north: "jizhen2", south: "huanpo", west: "xingzilin", southeast: "jiupu", northeast: "yaopu" } },
  // northeast=右上 药铺
  { id: "yaopu", name: "药铺", x: 370, y: 570, exits: { southwest: "jizhen1" } },
  // southeast=右下 酒铺
  { id: "jiupu", name: "酒铺", x: 370, y: 690, exits: { northwest: "jizhen1" } },
  { id: "xingzilin", name: "杏子林", x: 70, y: 630, exits: { east: "jizhen1", south: "chemahang" } },
  { id: "chemahang", name: "车马行", x: 70, y: 710, exits: { north: "xingzilin" } },

  // ======== 缓坡 → 未明谷 (southernmost y=740~920) ========
  // 缓坡 north→jizhen1，所以 jizhen1 在北/上
  { id: "huanpo", name: "缓坡", x: 230, y: 740, exits: { north: "jizhen1" } },
  // 未明谷 south→青石桥头 / 青石桥头 north→未明谷 → 未明谷在北/上
  { id: "weiminggu", name: "未明谷", x: 230, y: 820, exits: { south: "qingshiqiaotou", west: "shulin", east: "luanshizhen" } },
  { id: "shulin", name: "树林", x: 70, y: 820, exits: { east: "weiminggu" } },
  { id: "luanshizhen", name: "乱石阵", x: 390, y: 820, exits: { west: "weiminggu" } },
  // 青石桥头 south of 未明谷
  { id: "qingshiqiaotou", name: "青石桥头", x: 230, y: 910, exits: { north: "weiminggu" } },
];

export function buildRoomMap(nodes: RoomNode[]): Map<string, RoomNode> {
  const m = new Map<string, RoomNode>();
  for (const n of nodes) m.set(n.id, n);
  return m;
}

export const AREA_MAPS: Record<string, RoomNode[]> = {
  "newbie_lxsz": LXSz_MAP,
};
