// demo/src/components/SelectionPanel.jsx
import { useViewerStore } from "../store/viewerStore";

function ColorSwatch({ color }) {
  if (!color) return null;
  const hex = `rgb(${Math.round(color.r * 255)}, ${Math.round(color.g * 255)}, ${Math.round(color.b * 255)})`;
  return (
    <span
      className="inline-block w-3 h-3 rounded-sm border border-zinc-600"
      style={{ backgroundColor: hex }}
      title={`R:${color.r.toFixed(2)} G:${color.g.toFixed(2)} B:${color.b.toFixed(2)}`}
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

export default function SelectionPanel() {
  const selectedDetail = useViewerStore((s) => s.selectedDetail);

  if (!selectedDetail || selectedDetail.items.length === 0) return null;

  const isSingle = selectedDetail.items.length === 1;
  const item = isSingle ? selectedDetail.items[0] : null;

  const modeLabel = {
    face: "Face",
    edge: "Edge",
    vertex: "Vertex",
    mixed: "Selection",
  };

  return (
    <div
      className="absolute top-14 right-4 z-10 bg-zinc-950/90 border border-zinc-700 rounded-xl p-3.5 text-xs backdrop-blur-sm min-w-[180px] max-w-[240px]"
      data-testid="selection-panel"
    >
      <h3 className="text-cyan-400 font-semibold text-[13px] mb-2">
        {isSingle ? modeLabel[item.mode] || "Selection" : "Selection"}
      </h3>
      {isSingle && item.mode === "face" && <FaceDetail info={item.info} />}
      {isSingle && item.mode === "edge" && <EdgeDetail info={item.info} />}
      {isSingle && item.mode === "vertex" && <VertexDetail info={item.info} />}
      {!isSingle && <MultiSelectSummary items={selectedDetail.items} />}
    </div>
  );
}
