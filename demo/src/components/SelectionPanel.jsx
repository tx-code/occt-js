// demo/src/components/SelectionPanel.jsx
import { useMeasurement } from "../hooks/useMeasurement.js";
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

function SelectionActorMeta({ item }) {
  if (!item?.actorId && !item?.exactRef) {
    return null;
  }

  return (
    <div className="mb-2 rounded-lg border border-zinc-800 bg-zinc-900/60 px-2 py-1.5 text-[11px]">
      {item.actorId && <Row label="Actor" value={item.actorLabel || item.actorId} />}
      {item.exactRef && <Row label="Exact" value={`M${item.exactRef.exactModelId}`} />}
    </div>
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

function MeasurementStatusBadge({ status }) {
  const label = status === "success"
    ? "OK"
    : status === "unsupported"
      ? "Unsupported"
      : "Failure";
  const className = status === "success"
    ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-200"
    : status === "unsupported"
      ? "border-amber-500/30 bg-amber-500/10 text-amber-200"
      : "border-rose-500/30 bg-rose-500/10 text-rose-200";

  return (
    <span className={`rounded-full border px-2 py-0.5 text-[10px] uppercase tracking-[0.18em] ${className}`}>
      {label}
    </span>
  );
}

function MeasurementActionGroup({
  title,
  actions,
  runningActionId,
  runMeasurement,
}) {
  if (!Array.isArray(actions) || actions.length === 0) {
    return null;
  }

  return (
    <div className="mt-3">
      <div className="mb-2 text-[10px] uppercase tracking-[0.18em] text-zinc-500">
        {title}
      </div>
      <div className="flex flex-wrap gap-2">
        {actions.map((action) => (
          <Button
            key={action.id}
            size="sm"
            variant="ghost"
            onClick={() => runMeasurement(action.id)}
            disabled={runningActionId.length > 0}
            data-testid={`measurement-action-${action.id}`}
          >
            {runningActionId === action.id ? "Running..." : action.label}
          </Button>
        ))}
      </div>
    </div>
  );
}

function MeasurementPanel({
  ensureModule,
  hasSelection,
}) {
  const {
    actions,
    unsupportedReason,
    runningActionId,
    activeMeasurement,
    activeMeasurementOverlay,
    runMeasurement,
    clearMeasurements,
  } = useMeasurement({ ensureModule });
  const measurementActions = actions.filter((action) => action.category === "measurement");
  const helperActions = actions.filter((action) => action.category === "helper");
  const hasCurrentResult = Boolean(activeMeasurement);
  const hasCamSampleActions = actions.some((action) => (
    action?.id === "clearance"
    || action?.id === "step-depth"
    || action?.id === "center-to-center"
    || action?.id === "surface-to-center"
  ));
  const subtitle = hasCamSampleActions
    ? "Supported exact actions and CAM sample checks"
    : "Supported exact actions";
  const emptyMessage = hasCamSampleActions
    ? "Run one exact action or CAM sample check to inspect the current check."
    : "Run one supported action to inspect the current result.";

  return (
    <div className="mt-3 rounded-xl border border-zinc-800 bg-zinc-900/70 p-3" data-testid="measurement-panel">
      <div className="mb-2 flex items-center justify-between">
        <div>
          <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-cyan-400">Measure</div>
          <div className="text-[11px] text-zinc-500">{subtitle}</div>
        </div>
        <div className="flex flex-wrap justify-end gap-2">
          <Button
            size="sm"
            variant="ghost"
            onClick={clearMeasurements}
            disabled={!activeMeasurement}
            data-testid="measurement-clear-current"
          >
            Clear
          </Button>
        </div>
      </div>

      {hasSelection && (
        <>
          <MeasurementActionGroup
            title="Measurements"
            actions={measurementActions}
            runningActionId={runningActionId}
            runMeasurement={runMeasurement}
          />
          <MeasurementActionGroup
            title="Helpers"
            actions={helperActions}
            runningActionId={runningActionId}
            runMeasurement={runMeasurement}
          />
        </>
      )}

      {hasSelection && actions.length === 0 && unsupportedReason && (
        <div className="mt-2 text-[11px] text-zinc-500">
          {unsupportedReason.message}
        </div>
      )}

      <div className="mt-3">
        {!hasCurrentResult && (
          <div
            className="rounded-xl border border-dashed border-zinc-800 px-3 py-2 text-[11px] text-zinc-500"
            data-testid="measurement-current-empty"
          >
            {emptyMessage}
          </div>
        )}

        {activeMeasurement && (
          <div
            className="rounded-xl border border-zinc-800 bg-zinc-950/70 px-3 py-2 text-[11px]"
            data-testid="measurement-current-result"
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="font-medium text-zinc-300">Current Check</div>
                <div className="mt-1 text-zinc-100">{activeMeasurement.label}</div>
              </div>
              <MeasurementStatusBadge status={activeMeasurement.status} />
            </div>
            <div
              className="mt-2 text-zinc-400"
              data-testid="measurement-current-summary"
            >
              {activeMeasurement.summary}
            </div>
            <div className="mt-2 text-zinc-500" data-testid="measurement-overlay-status">
              {activeMeasurementOverlay.message}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default function SelectionPanel({ ensureModule }) {
  const selectedDetail = useViewerStore((s) => s.selectedDetail);
  const toolActor = useViewerStore((s) => s.workspaceActors?.tool ?? null);
  const currentMeasurement = useViewerStore((s) => s.currentMeasurement);
  const nudgeActorPose = useViewerStore((s) => s.nudgeActorPose);

  const hasSelection = !!selectedDetail && selectedDetail.items.length > 0;
  if (!hasSelection && !toolActor) return null;
  const shouldShowMeasurementPanel = hasSelection || Boolean(currentMeasurement);

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
      className="absolute z-30 bg-zinc-950/90 border border-zinc-700 px-3.5 pt-3.5 pb-[calc(0.875rem+env(safe-area-inset-bottom))] text-xs backdrop-blur-sm bottom-0 left-0 right-0 max-h-[42svh] overflow-y-auto rounded-t-2xl md:bottom-auto md:left-auto md:top-14 md:right-4 md:min-w-[180px] md:max-w-[240px] md:max-h-none md:overflow-y-visible md:rounded-xl md:p-3.5"
      data-testid="selection-panel"
    >
      {toolActor && <ToolPosePanel toolActor={toolActor} nudgeActorPose={nudgeActorPose} />}
      {hasSelection && (
        <>
          <h3 className="text-cyan-400 font-semibold text-[13px] mb-2">
            {isSingle ? modeLabel[item.mode] || "Selection" : "Selection"}
          </h3>
          {isSingle && <SelectionActorMeta item={item} />}
          {isSingle && item.mode === "face" && <FaceDetail info={item.info} />}
          {isSingle && item.mode === "edge" && <EdgeDetail info={item.info} />}
          {isSingle && item.mode === "vertex" && <VertexDetail info={item.info} />}
          {!isSingle && <MultiSelectSummary items={selectedDetail.items} />}
        </>
      )}
      {shouldShowMeasurementPanel && (
        <MeasurementPanel ensureModule={ensureModule} hasSelection={hasSelection} />
      )}
    </div>
  );
}
