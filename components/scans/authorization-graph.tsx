'use client';

import type { GraphEdge, GraphNode } from '@/lib/api/types';

const colorByType: Record<string, string> = { IDENTITY: '#a3e635', ROLE: '#d4d4d8', ENDPOINT: '#fbbf24', RESOURCE: '#fb7185', OBJECT: '#f97316', SENSITIVE_DATA: '#ef4444' };

export function AuthorizationGraph({ nodes, edges }: { nodes: GraphNode[]; edges: GraphEdge[] }) {
  if (!nodes.length) return <p className="text-sm text-zinc-500">The backend returned no graph nodes for this scan.</p>;
  const width = 920;
  const height = Math.max(300, Math.ceil(nodes.length / 4) * 130);
  const positions = new Map(nodes.map((node, index) => [node.id, { x: 110 + (index % 4) * 230, y: 65 + Math.floor(index / 4) * 130 }]));
  return <div className="overflow-x-auto rounded-xl border border-white/10 bg-black/25 p-3">
    <svg viewBox={`0 0 ${width} ${height}`} className="min-w-[760px] w-full" role="img" aria-label="Authorization graph from scan results">
      <defs><marker id="auth-arrow" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="5" markerHeight="5" orient="auto-start-reverse"><path d="M 0 0 L 10 5 L 0 10 z" fill="#71717a" /></marker></defs>
      {edges.map((edge, index) => {
        const a = positions.get(edge.source); const b = positions.get(edge.target);
        return a && b ? <g key={`${edge.source}-${edge.target}-${index}`}><line x1={a.x + 75} y1={a.y} x2={b.x - 75} y2={b.y} stroke="#52525b" strokeWidth="1.5" markerEnd="url(#auth-arrow)"/><text x={(a.x + b.x) / 2} y={(a.y + b.y) / 2 - 7} fill="#a1a1aa" fontSize="9" textAnchor="middle">{edge.label || edge.type}</text></g> : null;
      })}
      {nodes.map((node) => { const p = positions.get(node.id)!; const color = colorByType[node.type] || '#d4d4d8'; return <g key={node.id}><rect x={p.x - 75} y={p.y - 25} width="150" height="50" rx="10" fill="#111113" stroke={color} strokeOpacity=".7"/><text x={p.x} y={p.y - 2} fill={color} fontSize="10" textAnchor="middle">{node.type}</text><text x={p.x} y={p.y + 13} fill="#f4f4f5" fontSize="10" textAnchor="middle">{node.label.slice(0, 24)}</text></g>; })}
    </svg>
    <p className="px-2 pb-1 text-xs text-zinc-500">{nodes.length} nodes · {edges.length} relationships · every node and edge is returned by the scan backend</p>
  </div>;
}
