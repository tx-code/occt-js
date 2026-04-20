// demo/src/components/StatsPanel.jsx
import { useState } from "react";
import { buildGeneratedToolValidationRows } from "../lib/generated-tool-validation";
import { useViewerStore } from "../store/viewerStore";

export default function StatsPanel() {
  const model = useViewerStore((s) => s.model);
  const selectedDetail = useViewerStore((s) => s.selectedDetail);
  const [collapsed, setCollapsed] = useState(() => (
    typeof window !== "undefined" && window.matchMedia("(max-width: 767px)").matches
  ));
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
  const validationRows = buildGeneratedToolValidationRows(model);

  return (
    <div
      className={`absolute bottom-4 left-4 z-10 bg-zinc-950/90 border border-zinc-700 rounded-xl p-3.5 text-xs md:text-xs backdrop-blur-sm min-w-[120px] md:min-w-[160px] max-w-[160px] md:max-w-none ${selectedDetail ? "hidden md:block" : ""}`}
      data-testid="stats-panel"
    >
      <h3
        className="text-cyan-400 font-semibold text-[11px] md:text-[13px] mb-2 md:cursor-default cursor-pointer select-none flex items-center justify-between"
        onClick={() => setCollapsed((c) => !c)}
      >
        Model Info
        <span className="md:hidden text-zinc-500 text-[10px]">{collapsed ? "+" : "\u2212"}</span>
      </h3>
      <div className={`${collapsed ? "hidden" : "block"} md:block`}>
        {rows.map(([label, value]) => (
          <div key={label} className="flex justify-between py-0.5">
            <span className="text-zinc-500">{label}</span>
            <span className="text-zinc-300 tabular-nums">{value}</span>
          </div>
        ))}
        {validationRows.length > 0 && (
          <>
            <div className="my-2 border-t border-zinc-800" />
            <div
              className="mb-1 text-[10px] uppercase tracking-[0.18em] text-cyan-400"
              data-testid="generated-tool-validation"
            >
              Validation
            </div>
            {validationRows.map(([label, value]) => (
              <div key={label} className="flex justify-between py-0.5">
                <span className="text-zinc-500">{label}</span>
                <span className="text-zinc-300 tabular-nums">{value}</span>
              </div>
            ))}
          </>
        )}
      </div>
    </div>
  );
}
