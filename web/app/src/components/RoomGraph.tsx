import type { RoomNode } from "../data/roomMaps";

interface Props {
  nodes: RoomNode[];
  currentRoomId?: string;
}

const C = {
  bg: "#1a1714",
  nodeBg: "#23211d",
  nodeBorder: "#3a3630",
  nodeBorderHi: "#5f8f78",
  nodeText: "#c8bfb0",
  nodeTextHi: "#e8d060",
  curBg: "#2a3a30",
  curBorder: "#5f8f78",
  edge: "#3a3630",
  edgeHi: "#5f8f78",
  dirText: "#4a5048",
  area: "#5f8f78",
  climb: "#4a6555",
};

const DL: Record<string, string> = {
  north: "北", south: "南", east: "东", west: "西",
  northeast: "东北", northwest: "西北", southeast: "东南", southwest: "西南",
};

const VW = 440;
const VH = 960;

export function RoomGraph({ nodes, currentRoomId }: Props) {
  const byId = new Map(nodes.map((n) => [n.id, n]));

  const drawn = new Set<string>();
  const edges: { f: string; t: string; d: string; fx: number; fy: number; tx: number; ty: number }[] = [];
  for (const node of nodes) {
    for (const [dir, tid] of Object.entries(node.exits)) {
      const tgt = byId.get(tid);
      if (!tgt) continue;
      const k = [node.id, tid].sort().join("|");
      if (drawn.has(k)) continue;
      drawn.add(k);
      edges.push({ f: node.id, t: tid, d: dir, fx: node.x, fy: node.y, tx: tgt.x, ty: tgt.y });
    }
  }

  const cur = currentRoomId ? byId.get(currentRoomId) : undefined;

  return (
    <svg viewBox={`0 0 ${VW} ${VH}`} preserveAspectRatio="xMidYMin meet"
      style={{ width: "100%", display: "block", background: C.bg, borderRadius: 10 }}>
      <text x={VW / 2} y={70} textAnchor="middle" fill={C.area} fontSize={14} fontWeight={600} letterSpacing={6}>柳 秀 山 庄</text>
      <text x={VW / 2} y={525} textAnchor="middle" fill={C.area} fontSize={12} fontWeight={600} letterSpacing={4}>集 镇</text>
      <text x={VW / 2} y={875} textAnchor="middle" fill={C.area} fontSize={14} fontWeight={600} letterSpacing={6}>未 明 谷</text>
      <line x1={0} y1={350} x2={VW} y2={350} stroke={C.edge} strokeWidth={0.5} strokeDasharray="8 5" />
      <line x1={0} y1={710} x2={VW} y2={710} stroke={C.edge} strokeWidth={0.5} strokeDasharray="8 5" />

      {/* 长廊 ←→ 山庄大门 (open gate) */}
      <line x1={VW / 2} y1={380} x2={VW / 2} y2={460} stroke={C.climb} strokeWidth={1.5} strokeDasharray="5 4" opacity={0.6} />
      <text x={VW / 2 - 10} y={424} textAnchor="end" fill={C.climb} fontSize={10} opacity={0.7}>门</text>

      {/* 青石桥头 ←→ 缓坡 (climb) */}
      <line x1={VW / 2} y1={740} x2={VW / 2} y2={910} stroke={C.climb} strokeWidth={1.5} strokeDasharray="5 4" opacity={0.6} />
      <text x={VW / 2 - 10} y={829} textAnchor="end" fill={C.climb} fontSize={10} opacity={0.7}>攀</text>

      {edges.map((e) => {
        const hi = cur && (e.f === cur.id || e.t === cur.id);
        return <line key={`${e.f}-${e.t}`} x1={e.fx} y1={e.fy} x2={e.tx} y2={e.ty}
          stroke={hi ? C.edgeHi : C.edge} strokeWidth={hi ? 2 : 1} />;
      })}

      {edges.map((e) => {
        const mx = (e.fx + e.tx) / 2, my = (e.fy + e.ty) / 2;
        const lb = DL[e.d]; if (!lb) return null;
        let ox = 0, oy = -8;
        if (e.d === "south") oy = 14;
        if (e.d === "east") { ox = 8; oy = -2; }
        if (e.d === "west") { ox = -16; oy = -2; }
        if (e.d === "northeast") { ox = 4; oy = -8; }
        if (e.d === "northwest") { ox = -18; oy = -8; }
        if (e.d === "southeast") { ox = 4; oy = 10; }
        if (e.d === "southwest") { ox = -18; oy = 10; }
        return <text key={`d-${e.f}-${e.t}`} x={mx + ox} y={my + oy}
          textAnchor="middle" fill={C.dirText} fontSize={10}>{lb}</text>;
      })}

      {nodes.map((n) => {
        const is = n.id === currentRoomId;
        const cn = cur && (Object.values(cur.exits).includes(n.id) || Object.values(n.exits).includes(currentRoomId!));
        const w = n.name.length * 14 + 20, h = 28;
        return (
          <g key={n.id}>
            <rect x={n.x - w / 2} y={n.y - h / 2} width={w} height={h} rx={6}
              fill={is ? C.curBg : C.nodeBg}
              stroke={is ? C.curBorder : cn ? C.nodeBorderHi : C.nodeBorder}
              strokeWidth={is ? 2 : 1} />
            <text x={n.x} y={n.y + 4} textAnchor="middle"
              fill={is ? C.nodeTextHi : C.nodeText} fontSize={12} fontWeight={is ? 600 : 400}>{n.name}</text>
          </g>
        );
      })}
    </svg>
  );
}
