// demo/src/components/Toolbar.jsx
import { useState } from "react";
import { Button } from "./ui/button";
import { useViewerStore } from "../store/viewerStore";

export default function Toolbar({ onOpenFile, onFitAll, onCameraView, onSetProjection, onSnapshot }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const fileName = useViewerStore((s) => s.fileName);
  const facesVisible = useViewerStore((s) => s.facesVisible);
  const edgesVisible = useViewerStore((s) => s.edgesVisible);
  const gridVisible = useViewerStore((s) => s.gridVisible);
  const toggleFaces = useViewerStore((s) => s.toggleFaces);
  const toggleEdges = useViewerStore((s) => s.toggleEdges);
  const toggleGrid = useViewerStore((s) => s.toggleGrid);
  const pickMode = useViewerStore((s) => s.pickMode);
  const setPickMode = useViewerStore((s) => s.setPickMode);
  const projectionMode = useViewerStore((s) => s.projectionMode);
  const theme = useViewerStore((s) => s.theme);
  const toggleTheme = useViewerStore((s) => s.toggleTheme);

  if (!fileName) return null;

  /* Shared button groups extracted to avoid duplication */
  const cameraPresets = ["front", "back", "top", "bottom", "left", "right", "iso"].map((dir) => (
    <Button key={dir} size="sm" variant="ghost" onClick={() => onCameraView(dir)} data-testid={`view-${dir}`}>
      {dir.charAt(0).toUpperCase() + dir.slice(1)}
    </Button>
  ));

  const projectionButtons = (
    <>
      <Button size="sm" variant={projectionMode === "perspective" ? "active" : "default"} onClick={() => onSetProjection("perspective")} data-testid="proj-persp">
        Persp
      </Button>
      <Button size="sm" variant={projectionMode === "orthographic" ? "active" : "default"} onClick={() => onSetProjection("orthographic")} data-testid="proj-ortho">
        Ortho
      </Button>
    </>
  );

  const displayToggles = (
    <>
      <Button size="sm" variant={facesVisible ? "active" : "default"} onClick={toggleFaces} data-testid="toggle-faces">
        Faces
      </Button>
      <Button size="sm" variant={edgesVisible ? "active" : "default"} onClick={toggleEdges} data-testid="toggle-edges">
        Edges
      </Button>
      <Button size="sm" variant={gridVisible ? "active" : "default"} onClick={toggleGrid} data-testid="toggle-grid">
        Grid
      </Button>
    </>
  );

  const pickButtons = (
    <>
      <Button size="sm" variant={pickMode === "face" ? "active" : "default"} onClick={() => setPickMode("face")} data-testid="pick-face">
        Face
      </Button>
      <Button size="sm" variant={pickMode === "edge" ? "active" : "default"} onClick={() => setPickMode("edge")} data-testid="pick-edge">
        Edge
      </Button>
      <Button size="sm" variant={pickMode === "vertex" ? "active" : "default"} onClick={() => setPickMode("vertex")} data-testid="pick-vertex">
        Vtx
      </Button>
    </>
  );

  const toolButtons = (
    <>
      <Button size="sm" variant="ghost" onClick={onSnapshot} data-testid="snapshot">
        📷
      </Button>
      <Button size="sm" variant="ghost" onClick={toggleTheme} data-testid="toggle-theme">
        {theme === "dark" ? "☀️" : "🌙"}
      </Button>
      <Button size="sm" variant="ghost" onClick={() => useViewerStore.getState().setTreeOpen(!useViewerStore.getState().treeOpen)} data-testid="toggle-tree">
        🌳
      </Button>
    </>
  );

  const sep = <span className="w-px h-5 bg-zinc-700" />;

  return (
    <div className="absolute top-0 left-0 right-0 z-50 bg-zinc-950/85 backdrop-blur-sm border-b border-zinc-800" data-testid="toolbar">
      {/* Row 1: always visible */}
      <div className="flex items-center gap-2 px-3 py-2">
        <span className="text-cyan-400 font-semibold text-sm">occt-js</span>
        {sep}
        <span className="text-zinc-500 text-xs truncate" data-testid="file-name">{fileName}</span>

        <span className="flex-1" />

        {/* Desktop: all buttons inline */}
        <div className="hidden md:flex items-center gap-2">
          <Button size="sm" variant="ghost" onClick={onOpenFile} data-testid="open-file">
            Open
          </Button>
          {sep}
          {cameraPresets}
          {sep}
          {projectionButtons}
          {sep}
          {displayToggles}
          {sep}
          {pickButtons}
          {sep}
          {toolButtons}
          <Button size="sm" variant="ghost" onClick={onFitAll} data-testid="fit-all">
            Fit
          </Button>
        </div>

        {/* Mobile: Open + Fit + hamburger */}
        <div className="flex md:hidden items-center gap-1">
          <Button size="sm" variant="ghost" onClick={onOpenFile} data-testid="open-file">
            Open
          </Button>
          <Button size="sm" variant="ghost" onClick={onFitAll} data-testid="fit-all">
            Fit
          </Button>
          <Button size="sm" variant="ghost" onClick={() => setMenuOpen(!menuOpen)} data-testid="menu-toggle">
            {menuOpen ? "\u2715" : "\u2630"}
          </Button>
        </div>
      </div>

      {/* Row 2: mobile expandable menu */}
      {menuOpen && (
        <div className="flex md:hidden flex-wrap items-center gap-1.5 px-3 py-2 border-t border-zinc-800">
          {cameraPresets}
          {sep}
          {projectionButtons}
          {sep}
          {displayToggles}
          {sep}
          {pickButtons}
          {sep}
          {toolButtons}
        </div>
      )}
    </div>
  );
}
