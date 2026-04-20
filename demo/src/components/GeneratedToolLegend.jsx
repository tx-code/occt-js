import { useState } from "react";
import { useViewerStore } from "../store/viewerStore";
import { buildGeneratedToolLegend } from "../lib/generated-tool-legend";

function toCssColor(color) {
  if (!Array.isArray(color) || color.length < 3) {
    return "rgb(204, 204, 204)";
  }
  return `rgb(${Math.round(color[0] * 255)}, ${Math.round(color[1] * 255)}, ${Math.round(color[2] * 255)})`;
}

function faceCountLabel(faceCount) {
  return `${faceCount} face${faceCount === 1 ? "" : "s"}`;
}

export default function GeneratedToolLegend() {
  const model = useViewerStore((s) => s.model);
  const selectedDetail = useViewerStore((s) => s.selectedDetail);
  const [collapsed, setCollapsed] = useState(() => (
    typeof window !== "undefined" && window.matchMedia("(max-width: 767px)").matches
  ));
  const legend = buildGeneratedToolLegend(model);

  if (!legend) {
    return null;
  }

  const summaryParts = [legend.units?.toUpperCase(), legend.angleLabel, legend.closure].filter(Boolean);

  return (
    <div
      className={`absolute left-4 top-16 z-10 max-w-[220px] rounded-xl border border-zinc-700 bg-zinc-950/90 p-3.5 text-xs backdrop-blur-sm md:top-auto md:bottom-44 ${selectedDetail ? "hidden md:block" : ""}`}
      data-testid="generated-tool-legend"
    >
      <h3
        className="mb-2 flex items-center justify-between text-[11px] font-semibold text-cyan-400 md:cursor-default"
        onClick={() => setCollapsed((value) => !value)}
      >
        Semantic Faces
        <span className="text-[10px] text-zinc-500 md:hidden">{collapsed ? "+" : "\u2212"}</span>
      </h3>
      <div className={`${collapsed ? "hidden" : "block"} md:block`}>
        {summaryParts.length > 0 && (
          <div className="mb-2 text-[10px] uppercase tracking-[0.18em] text-zinc-500">
            {summaryParts.join(" · ")}
          </div>
        )}
        <div className="space-y-2">
          {legend.entries.map((entry) => (
            <div key={entry.key} className="flex items-start gap-2">
              <span
                className="mt-0.5 h-3 w-3 shrink-0 rounded-sm border border-zinc-700"
                style={{ backgroundColor: toCssColor(entry.color) }}
                title={entry.label}
              />
              <div className="min-w-0 flex-1">
                <div className="truncate text-zinc-200">{entry.label}</div>
                <div className="truncate text-[10px] text-zinc-500">
                  {[entry.detail, faceCountLabel(entry.faceCount)].filter(Boolean).join(" · ")}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
