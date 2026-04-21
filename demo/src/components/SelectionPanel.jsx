// demo/src/components/SelectionPanel.jsx
import { useViewerStore } from "../store/viewerStore";
import { Button } from "./ui/button";

function resolveColorChannels(color) {
  if (!color) return null;

  // occt-core normalizes CAD colors to [r, g, b, a], but some demo-only paths
  // still produce Babylon-style { r, g, b } objects.
  if (Array.isArray(color) || ArrayBuffer.isView(color)) {
    const values = Array.from(color);
    if (values.length < 3) return null;
    const [r, g, b] = values;
    if (![r, g, b].every(Number.isFinite)) return null;
    return { r, g, b };
  }

  if (
    Number.isFinite(color.r) &&
    Number.isFinite(color.g) &&
    Number.isFinite(color.b)
  ) {
    return { r: color.r, g: color.g, b: color.b };
  }

  return null;
}

function ColorSwatch({ color }) {
  const channels = resolveColorChannels(color);
  if (!channels) return null;
  const hex = `rgb(${Math.round(channels.r * 255)}, ${Math.round(channels.g * 255)}, ${Math.round(channels.b * 255)})`;
  return (
    <span
      className="inline-block w-3 h-3 rounded-sm border border-zinc-600"
      style={{ backgroundColor: hex }}
      title={`R:${channels.r.toFixed(2)} G:${channels.g.toFixed(2)} B:${channels.b.toFixed(2)}`}
    />
  );
}

function FaceDetail({ info }) {
  return (
    <>
      <Row label="Face ID" value={info.faceId} />
      <Row label="Triangles" value={info.triangles} />
      <Row label="Boundary Edges" value={info.boundaryEdges.length} />
      {info.color && (
        <div className="flex justify-between py-0.5">
          <span className="text-zinc-500">Color</span>
          <ColorSwatch color={info.color} />
        </div>
      )}
      {info.adjacentFaces.length > 0 && (
        <div className="py-0.5">
          <span className="text-zinc-500 text-xs">Adjacent Faces: </span>
          <span className="text-cyan-400 text-xs">
            {info.adjacentFaces.join(", ")}
          </span>
        </div>
      )}
    </>
  );
}

function EdgeDetail({ info }) {
  return (
    <>
      <Row label="Edge ID" value={info.edgeId} />
      <Row label="Points" value={info.pointCount} />
      <Row label="Free Edge" value={info.freeEdge ? "Yes" : "No"} />
      {info.ownerFaces.length > 0 && (
        <div className="py-0.5">
          <span className="text-zinc-500 text-xs">Owner Faces: </span>
          <span className="text-cyan-400 text-xs">
            {info.ownerFaces.join(", ")}
          </span>
        </div>
      )}
    </>
  );
}

function VertexDetail({ info }) {
  return (
    <>
      <Row label="Vertex ID" value={info.vertexId} />
      <Row label="X" value={info.x.toFixed(2)} />
      <Row label="Y" value={info.y.toFixed(2)} />
      <Row label="Z" value={info.z.toFixed(2)} />
    </>
  );
}

function Row({ label, value }) {
  return (
    <div className="flex justify-between py-0.5">
      <span className="text-zinc-500">{label}</span>
      <span className="text-zinc-300 tabular-nums">{value}</span>
    </div>
  );
}

function MultiSelectSummary({ items }) {
  const faces = items.filter((i) => i.mode === "face").length;
  const edges = items.filter((i) => i.mode === "edge").length;
  const vertices = items.filter((i) => i.mode === "vertex").length;
  const parts = [];
  if (faces > 0) parts.push(`${faces} face${faces > 1 ? "s" : ""}`);
  if (edges > 0) parts.push(`${edges} edge${edges > 1 ? "s" : ""}`);
  if (vertices > 0) parts.push(`${vertices} ${vertices > 1 ? "vertices" : "vertex"}`);
  return (
    <div className="text-zinc-300 text-xs">
      <div className="font-semibold mb-1">{items.length} Selected</div>
      <div className="text-zinc-500">({parts.join(", ")})</div>
    </div>
  );
}

function formatPoseAxis(value) {
  if (!Number.isFinite(value)) {
    return "0.00";
  }
  return value.toFixed(2);
}

function ToolPosePanel({ toolActor, nudgeActorPose }) {
  const translation = toolActor?.actorPose?.translation ?? { x: 0, y: 0, z: 0 };
  const step = 5;

  return (
    <div
      className="mb-3 rounded-xl border border-zinc-800 bg-zinc-900/70 p-3"
      data-testid="tool-pose-panel"
    >
      <div className="mb-2 flex items-center justify-between">
        <div>
          <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-cyan-400">Tool Pose</div>
          <div className="text-[11px] text-zinc-500">{toolActor?.label || "Generated Tool"}</div>
        </div>
        <div className="text-[10px] text-zinc-500">step {step}</div>
      </div>

      <div className="grid grid-cols-3 gap-2 text-[11px] text-zinc-300">
        <div>
          <div className="text-zinc-500">X</div>
          <div className="mt-1 font-mono">{formatPoseAxis(translation.x)}</div>
        </div>
        <div>
          <div className="text-zinc-500">Y</div>
          <div className="mt-1 font-mono">{formatPoseAxis(translation.y)}</div>
        </div>
        <div>
          <div className="text-zinc-500">Z</div>
          <div className="mt-1 font-mono">{formatPoseAxis(translation.z)}</div>
        </div>
      </div>

      <div className="mt-3 flex flex-wrap gap-2">
        <Button size="sm" variant="ghost" onClick={() => nudgeActorPose("tool", { x: -step })} data-testid="tool-pose-nudge-x-minus">X-</Button>
        <Button size="sm" variant="ghost" onClick={() => nudgeActorPose("tool", { x: step })} data-testid="tool-pose-nudge-x-plus">X+</Button>
        <Button size="sm" variant="ghost" onClick={() => nudgeActorPose("tool", { y: -step })} data-testid="tool-pose-nudge-y-minus">Y-</Button>
        <Button size="sm" variant="ghost" onClick={() => nudgeActorPose("tool", { y: step })} data-testid="tool-pose-nudge-y-plus">Y+</Button>
        <Button size="sm" variant="ghost" onClick={() => nudgeActorPose("tool", { z: -step })} data-testid="tool-pose-nudge-z-minus">Z-</Button>
        <Button size="sm" variant="ghost" onClick={() => nudgeActorPose("tool", { z: step })} data-testid="tool-pose-nudge-z-plus">Z+</Button>
      </div>
    </div>
  );
}

export default function SelectionPanel() {
  const selectedDetail = useViewerStore((s) => s.selectedDetail);
  const toolActor = useViewerStore((s) => s.workspaceActors?.tool ?? null);
  const nudgeActorPose = useViewerStore((s) => s.nudgeActorPose);

  const hasSelection = !!selectedDetail && selectedDetail.items.length > 0;
  if (!hasSelection && !toolActor) return null;

  const isSingle = hasSelection && selectedDetail.items.length === 1;
  const item = isSingle ? selectedDetail.items[0] : null;

  const modeLabel = {
    face: "Face",
    edge: "Edge",
    vertex: "Vertex",
    mixed: "Selection",
  };

  return (
    <div
      className="absolute z-10 bg-zinc-950/90 border border-zinc-700 px-3.5 pt-3.5 pb-[calc(0.875rem+env(safe-area-inset-bottom))] text-xs backdrop-blur-sm bottom-0 left-0 right-0 max-h-[42svh] overflow-y-auto rounded-t-2xl md:bottom-auto md:left-auto md:top-14 md:right-4 md:min-w-[180px] md:max-w-[240px] md:max-h-none md:overflow-y-visible md:rounded-xl md:p-3.5"
      data-testid="selection-panel"
    >
      {toolActor && <ToolPosePanel toolActor={toolActor} nudgeActorPose={nudgeActorPose} />}
      {hasSelection && (
        <>
          <h3 className="text-cyan-400 font-semibold text-[13px] mb-2">
            {isSingle ? modeLabel[item.mode] || "Selection" : "Selection"}
          </h3>
          {isSingle && item.mode === "face" && <FaceDetail info={item.info} />}
          {isSingle && item.mode === "edge" && <EdgeDetail info={item.info} />}
          {isSingle && item.mode === "vertex" && <VertexDetail info={item.info} />}
          {!isSingle && <MultiSelectSummary items={selectedDetail.items} />}
        </>
      )}
    </div>
  );
}
