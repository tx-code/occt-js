// demo/src/components/Toolbar.jsx
import { Button } from "./ui/button";
import { useViewerStore } from "../store/viewerStore";

export default function Toolbar({ onOpenFile, onFitAll, onCameraView, onSetProjection, onSnapshot }) {
  const fileName = useViewerStore((s) => s.fileName);
  const facesVisible = useViewerStore((s) => s.facesVisible);
  const edgesVisible = useViewerStore((s) => s.edgesVisible);
  const toggleFaces = useViewerStore((s) => s.toggleFaces);
  const toggleEdges = useViewerStore((s) => s.toggleEdges);
  const pickMode = useViewerStore((s) => s.pickMode);
  const setPickMode = useViewerStore((s) => s.setPickMode);
  const projectionMode = useViewerStore((s) => s.projectionMode);

  if (!fileName) return null;

  return (
    <div className="absolute top-0 left-0 right-0 z-10 flex items-center gap-2 px-3 py-2 bg-zinc-950/85 backdrop-blur-sm border-b border-zinc-800" data-testid="toolbar">
      <span className="text-cyan-400 font-semibold text-sm">occt-js</span>
      <span className="w-px h-5 bg-zinc-700" />
      <span className="text-zinc-500 text-xs" data-testid="file-name">{fileName}</span>

      <span className="flex-1" />

      <Button size="sm" variant="ghost" onClick={onOpenFile} data-testid="open-file">
        Open
      </Button>

      <span className="w-px h-5 bg-zinc-700" />

      {/* Camera presets */}
      {["front", "back", "top", "bottom", "left", "right", "iso"].map((dir) => (
        <Button key={dir} size="sm" variant="ghost" onClick={() => onCameraView(dir)} data-testid={`view-${dir}`}>
          {dir.charAt(0).toUpperCase() + dir.slice(1)}
        </Button>
      ))}

      <span className="w-px h-5 bg-zinc-700" />

      {/* Projection */}
      <Button size="sm" variant={projectionMode === "perspective" ? "active" : "default"} onClick={() => onSetProjection("perspective")} data-testid="proj-persp">
        Persp
      </Button>
      <Button size="sm" variant={projectionMode === "orthographic" ? "active" : "default"} onClick={() => onSetProjection("orthographic")} data-testid="proj-ortho">
        Ortho
      </Button>

      <span className="w-px h-5 bg-zinc-700" />

      <Button size="sm" variant={facesVisible ? "active" : "default"} onClick={toggleFaces} data-testid="toggle-faces">
        Faces
      </Button>
      <Button size="sm" variant={edgesVisible ? "active" : "default"} onClick={toggleEdges} data-testid="toggle-edges">
        Edges
      </Button>

      <span className="w-px h-5 bg-zinc-700" />

      <Button size="sm" variant={pickMode === "face" ? "active" : "default"} onClick={() => setPickMode("face")} data-testid="pick-face">
        Face
      </Button>
      <Button size="sm" variant={pickMode === "edge" ? "active" : "default"} onClick={() => setPickMode("edge")} data-testid="pick-edge">
        Edge
      </Button>
      <Button size="sm" variant={pickMode === "vertex" ? "active" : "default"} onClick={() => setPickMode("vertex")} data-testid="pick-vertex">
        Vtx
      </Button>

      <span className="w-px h-5 bg-zinc-700" />

      {/* Snapshot */}
      <Button size="sm" variant="ghost" onClick={onSnapshot} data-testid="snapshot">
        📷
      </Button>

      <Button size="sm" variant="ghost" onClick={() => useViewerStore.getState().setTreeOpen(!useViewerStore.getState().treeOpen)} data-testid="toggle-tree">
        🌳
      </Button>

      <Button size="sm" variant="ghost" onClick={onFitAll} data-testid="fit-all">
        Fit
      </Button>
    </div>
  );
}
