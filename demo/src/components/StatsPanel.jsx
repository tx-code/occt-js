// demo/src/components/StatsPanel.jsx
import { useViewerStore } from "../store/viewerStore";

export default function StatsPanel() {
  const model = useViewerStore((s) => s.model);
  if (!model) return null;

  const s = model.stats || {};
  const geos = model.geometries || [];
  let totalFaces = 0, totalEdges = 0, totalVerts = 0;
  for (const g of geos) {
    totalFaces += (g.faces || []).length;
    totalEdges += (g.edges || []).length;
    totalVerts += (g.vertices || []).length;
  }

  const rows = [
    ["Format", model.sourceFormat?.toUpperCase() || "—"],
    ["Nodes", s.nodeCount || 0],
    ["Parts", s.partCount || 0],
    ["Triangles", (s.triangleCount || 0).toLocaleString()],
    ["Topo Faces", totalFaces],
    ["Topo Edges", totalEdges],
    ["Topo Vertices", totalVerts],
  ];

  return (
    <div className="absolute bottom-4 left-4 z-10 bg-zinc-950/90 border border-zinc-700 rounded-xl p-3.5 text-xs backdrop-blur-sm min-w-[160px]" data-testid="stats-panel">
      <h3 className="text-cyan-400 font-semibold text-[13px] mb-2">Model Info</h3>
      {rows.map(([label, value]) => (
        <div key={label} className="flex justify-between py-0.5">
          <span className="text-zinc-500">{label}</span>
          <span className="text-zinc-300 tabular-nums">{value}</span>
        </div>
      ))}
    </div>
  );
}
