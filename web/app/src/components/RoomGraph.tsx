import { useRef, useState, useCallback, useEffect } from "react";
import type { MapEdge, RoomMap } from "../data/roomMaps";

interface Props {
  map: RoomMap;
  currentRoomId?: string;
}

const C = {
  bg: "#1a1714",
  nodeBg: "#23211d",
  nodeBorder: "#3a3630",
  nodeBorderVisited: "#7a7050",
  nodeBorderCur: "#5f8f78",
  nodeText: "#c8bfb0",
  nodeTextCur: "#e8d060",
  curBg: "#2a3a30",
  edge: "#3a3630",
  edgeVisited: "#5a5040",
  edgeRoute: "#5f8f78",
  edgeArrow: "#5f8f78",
  area: "#5f8f78",
  climb: "#4a6555",
  north: "#6a7060",
  zoneBg: "rgba(95,143,120,0.04)",
};

function edgeKey(e: MapEdge) { return `${e.from}-${e.to}`; }

/** Trim endpoint to node rectangle boundary */
function trimToNode(
  fx: number, fy: number, tx: number, ty: number,
  bw: number, bh: number
): { x1: number; y1: number; x2: number; y2: number } {
  const dx = tx - fx, dy = ty - fy;
  if (dx === 0 && dy === 0) return { x1: fx, y1: fy, x2: tx, y2: ty };
  // Only trim the END of the edge (into the target node)
  const absDx = Math.abs(dx), absDy = Math.abs(dy);
  let t = 1;
  if (absDx > 0 && absDy > 0) {
    t = 1 - Math.min(bw / 2 / absDx, bh / 2 / absDy);
  } else if (absDx > 0) {
    t = 1 - bw / 2 / absDx;
  } else {
    t = 1 - bh / 2 / absDy;
  }
  t = Math.max(0, t);
  return { x1: fx, y1: fy, x2: fx + dx * t, y2: fy + dy * t };
}

export function RoomGraph({ map, currentRoomId }: Props) {
  const svgRef = useRef<SVGSVGElement>(null);
  const [view, setView] = useState({ x: 0, y: 0, zoom: 1.2 });
  const dragging = useRef(false);
  const lastPt = useRef({ x: 0, y: 0 });

  const { grid, nodes, edges } = map;
  const byId = new Map(nodes.map((n) => [n.id, n]));
  const cur = currentRoomId ? byId.get(currentRoomId) : undefined;
  const curConns = cur ? new Set(Object.values(cur ? (edges.filter(e => e.from === cur.id || e.to === cur.id).map(e => e.from === cur.id ? e.to : e.from)) : [])) : new Set<string>();

  // Visited: nodes connected to current by any edge
  const isVisited = (id: string) => currentRoomId === id || curConns.has(id) ||
    edges.some(e => (e.from === id && e.to === currentRoomId) || (e.to === id && e.from === currentRoomId));

  // Compute pixel positions
  const gx = grid.x, gy = grid.y;
  const px = (col: number) => col * gx;
  const py = (row: number) => row * gy;

  // Node dimensions
  const nodeW = 80, nodeH = 28;

  // SVG viewBox
  const pad = 60;
  const cols = Math.max(...nodes.map(n => n.col)) + 1;
  const rows = Math.max(...nodes.map(n => n.row)) + 1;
  const VW = cols * gx + pad * 2;
  const VH = rows * gy + pad * 2;

  // Build edge segments. Route edges are oriented away from the current room
  // so the exit arrow always points outward from wherever the player stands.
  const edgeSegments = edges.map(e => {
    const from = byId.get(e.from), to = byId.get(e.to);
    if (!from || !to) return null;
    const isRoute = cur && (e.from === cur.id || e.to === cur.id);
    const isClimb = e.from === "huanpo" && e.to === "qingshiqiaotou";
    const a = isRoute && e.to === cur.id ? to : from;
    const b = isRoute && e.to === cur.id ? from : to;
    const fx = pad + px(a.col), fy = pad + py(a.row);
    const tx = pad + px(b.col), ty = pad + py(b.row);
    const trimmed = trimToNode(fx, fy, tx, ty, nodeW, nodeH);
    return { ...e, x1: trimmed.x1, y1: trimmed.y1, x2: trimmed.x2, y2: trimmed.y2, isRoute, isClimb };
  }).filter(Boolean) as (MapEdge & { x1: number; y1: number; x2: number; y2: number; isRoute: boolean; isClimb: boolean })[];

  const handlePointerDown = useCallback((e: React.PointerEvent) => {
    dragging.current = true;
    lastPt.current = { x: e.clientX, y: e.clientY };
    (e.target as Element).setPointerCapture(e.pointerId);
  }, []);

  const handlePointerMove = useCallback((e: React.PointerEvent) => {
    if (!dragging.current) return;
    const dx = e.clientX - lastPt.current.x;
    const dy = e.clientY - lastPt.current.y;
    lastPt.current = { x: e.clientX, y: e.clientY };
    setView(v => ({ ...v, x: v.x + dx / v.zoom, y: v.y + dy / v.zoom }));
  }, []);

  const handlePointerUp = useCallback(() => {
    dragging.current = false;
  }, []);

  // Non-passive wheel for zoom (React onWheel is passive by default)
  useEffect(() => {
    const el = svgRef.current;
    if (!el) return;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      setView(v => {
        const nz = Math.min(3, Math.max(0.8, v.zoom - e.deltaY / 600));
        return { ...v, zoom: nz };
      });
    };
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, []);

  const resetView = () => setView({ x: 0, y: 0, zoom: 1.2 });

  return (
    <div style={{ position: "relative", background: C.bg, borderRadius: 10, overflow: "hidden", touchAction: "none" }}>
      {/* Zoom controls */}
      <div style={{ position: "absolute", top: 8, right: 8, zIndex: 2, display: "flex", gap: 4 }}>
        <button onClick={() => setView(v => ({ ...v, zoom: Math.min(3, v.zoom + 0.2) }))}
          style={{ minWidth: 36, minHeight: 36, background: C.nodeBg, border: `1px solid ${C.nodeBorder}`, color: C.nodeText, borderRadius: 6, cursor: "pointer", fontSize: 16 }}>＋</button>
        <button onClick={() => setView(v => ({ ...v, zoom: Math.max(0.8, v.zoom - 0.2) }))}
          style={{ minWidth: 36, minHeight: 36, background: C.nodeBg, border: `1px solid ${C.nodeBorder}`, color: C.nodeText, borderRadius: 6, cursor: "pointer", fontSize: 16 }}>−</button>
        <button onClick={resetView}
          style={{ minWidth: 36, minHeight: 36, background: C.nodeBg, border: `1px solid ${C.nodeBorder}`, color: C.nodeText, borderRadius: 6, cursor: "pointer", fontSize: 12 }}>⊙</button>
      </div>

      <svg
        ref={svgRef}
        viewBox={`${-view.x / view.zoom} ${-view.y / view.zoom} ${VW / view.zoom} ${VH / view.zoom}`}
        style={{ width: "100%", display: "block", touchAction: "none" }}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerLeave={handlePointerUp}
      >
        {/* North marker */}
        <g transform={`translate(${pad}, ${pad - 20})`}>
          <text x={0} y={0} fill={C.north} fontSize={13} fontWeight={600}>北 ↑</text>
        </g>

        {/* Zone labels */}
        {map.zones?.map(z => (
          <text
            key={z.label}
            x={pad + px(z.col)}
            y={pad + py(z.row) + (z.dy ?? 0)}
            fill={C.area}
            fontSize={12}
            fontWeight={500}
            letterSpacing={z.letterSpacing ?? 4}
          >{z.label}</text>
        ))}

        {/* Edges */}
        {edgeSegments.map(seg => (
          <g key={edgeKey(seg)}>
            <line
              x1={seg.x1} y1={seg.y1} x2={seg.x2} y2={seg.y2}
              stroke={seg.isRoute ? C.edgeRoute : seg.isClimb ? C.climb : isVisited(seg.from) && isVisited(seg.to) ? C.edgeVisited : C.edge}
              strokeWidth={seg.isRoute ? 2.5 : seg.isClimb ? 1.5 : 1.5}
              strokeDasharray={seg.isClimb ? "5 4" : undefined}
              opacity={seg.isClimb ? 0.6 : seg.isRoute ? 1 : 0.7}
            />
            {/* Arrow for route edges FROM current */}
            {seg.isRoute && seg.from === cur?.id && (
              <polygon
                points={`${seg.x2},${seg.y2} ${seg.x2 - 6},${seg.y2 - 4} ${seg.x2 - 6},${seg.y2 + 4}`}
                fill={C.edgeArrow}
                transform={`rotate(${Math.atan2(seg.y2 - seg.y1, seg.x2 - seg.x1) * 180 / Math.PI}, ${seg.x2}, ${seg.y2})`}
              />
            )}
          </g>
        ))}

        {/* Nodes */}
        {nodes.map(n => {
          const isCur = n.id === currentRoomId;
          const visited = isVisited(n.id);
          const x = pad + px(n.col) - nodeW / 2;
          const y = pad + py(n.row) - nodeH / 2;
          return (
            <g key={n.id}>
              <rect
                x={x} y={y} width={nodeW} height={nodeH} rx={5}
                fill={isCur ? C.curBg : C.nodeBg}
                stroke={isCur ? C.nodeBorderCur : visited ? C.nodeBorderVisited : C.nodeBorder}
                strokeWidth={isCur ? 2 : 1}
              />
              <text
                x={x + nodeW / 2} y={y + nodeH / 2 + 4}
                textAnchor="middle"
                fill={isCur ? C.nodeTextCur : visited ? C.nodeText : C.nodeText}
                fontSize={12}
                fontWeight={isCur ? 600 : 400}
              >{n.name}</text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}
