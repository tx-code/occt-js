// demo/src/components/Toolbar.jsx
import { useState } from "react";
import { Button } from "./ui/button";
import { useViewerStore } from "../store/viewerStore";
import AutoOrientToggle from "./AutoOrientToggle";

export default function Toolbar({ chromeIntegrated = false, onOpenFile, onFitAll, onCameraView, onSetProjection, onSnapshot }) {
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
  const mobileGroupClass = "shrink-0 rounded-xl border border-zinc-800 bg-zinc-900/80 p-1";

  return (
    <div className="absolute top-0 left-0 right-0 z-50 bg-zinc-950/85 backdrop-blur-sm border-b border-zinc-800" data-testid="toolbar">
      {/* Row 1: always visible */}
      <div className="flex items-center gap-2 px-3 py-1.5">
        {!chromeIntegrated && (
          <>
            <span className="text-cyan-400 font-semibold text-sm">occt-js</span>
            {sep}
            <span className="text-zinc-500 text-xs truncate" data-testid="file-name">{fileName}</span>
            <span className="flex-1" />
          </>
        )}

        {/* Desktop: all buttons inline */}
        <div className="hidden md:flex items-center gap-2">
          <Button size="sm" variant="ghost" onClick={onOpenFile} data-testid="open-file">
            Open
          </Button>
          <AutoOrientToggle testId="auto-orient-checkbox-toolbar" />
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
        <div className="md:hidden border-t border-zinc-800 px-3 py-1.5">
          <div className="flex items-start gap-2 overflow-x-auto pb-0.5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            <div className={mobileGroupClass}>
              <div className="mb-0.5 px-1 text-[9px] uppercase tracking-[0.18em] text-zinc-500">Import</div>
              <div className="flex items-center gap-1 whitespace-nowrap px-1 py-1">
                <AutoOrientToggle testId="auto-orient-checkbox-mobile" />
              </div>
            </div>
            <div className={mobileGroupClass}>
              <div className="mb-0.5 px-1 text-[9px] uppercase tracking-[0.18em] text-zinc-500">View</div>
              <div className="flex items-center gap-1 whitespace-nowrap">{cameraPresets}</div>
            </div>
            <div className={mobileGroupClass}>
              <div className="mb-0.5 px-1 text-[9px] uppercase tracking-[0.18em] text-zinc-500">Projection</div>
              <div className="flex items-center gap-1 whitespace-nowrap">{projectionButtons}</div>
            </div>
            <div className={mobileGroupClass}>
              <div className="mb-0.5 px-1 text-[9px] uppercase tracking-[0.18em] text-zinc-500">Display</div>
              <div className="flex items-center gap-1 whitespace-nowrap">{displayToggles}</div>
            </div>
            <div className={mobileGroupClass}>
              <div className="mb-0.5 px-1 text-[9px] uppercase tracking-[0.18em] text-zinc-500">Pick</div>
              <div className="flex items-center gap-1 whitespace-nowrap">{pickButtons}</div>
            </div>
            <div className={mobileGroupClass}>
              <div className="mb-0.5 px-1 text-[9px] uppercase tracking-[0.18em] text-zinc-500">Tools</div>
              <div className="flex items-center gap-1 whitespace-nowrap">{toolButtons}</div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
