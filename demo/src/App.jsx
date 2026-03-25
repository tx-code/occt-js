// demo/src/App.jsx
import { useRef, useCallback } from "react";
import { useViewerStore } from "./store/viewerStore";
import { useOcct } from "./hooks/useOcct";
import { useViewer } from "./hooks/useViewer";
import { usePicking } from "./hooks/usePicking";
import DropZone from "./components/DropZone";
import LoadingOverlay from "./components/LoadingOverlay";
import StatsPanel from "./components/StatsPanel";
import SelectionPanel from "./components/SelectionPanel";
import Toolbar from "./components/Toolbar";

export default function App() {
  const canvasRef = useRef(null);
  const model = useViewerStore((s) => s.model);
  const { importFile } = useOcct();
  const viewerRefs = useViewer(canvasRef);
  const { buildScene, fitAll } = viewerRefs;
  usePicking(viewerRefs);
  const fileInputRef = useRef(null);

  const handleFile = useCallback(async (file) => {
    try {
      const result = await importFile(file);
      buildScene(result);
    } catch (err) {
      alert("Error: " + err.message);
    }
  }, [importFile, buildScene]);

  const handleSample = useCallback(async () => {
    useViewerStore.getState().setLoading(true);
    try {
      const resp = await fetch("/test/simple_part.step"); // served by Vite serveTestFixtures plugin
      const blob = await resp.blob();
      const file = new File([blob], "simple_part.step");
      await handleFile(file);
    } catch (err) {
      alert("Error loading sample: " + err.message);
    } finally {
      useViewerStore.getState().setLoading(false);
    }
  }, [handleFile]);

  const handleOpenFile = useCallback(() => {
    if (fileInputRef.current) fileInputRef.current.click();
  }, []);

  return (
    <div className="relative h-screen w-screen">
      <canvas
        ref={canvasRef}
        className="absolute inset-0 w-full h-full outline-none"
        data-testid="render-canvas"
      />

      <input
        ref={fileInputRef}
        type="file"
        accept=".step,.stp,.iges,.igs,.brep,.brp"
        className="hidden"
        onChange={(e) => { if (e.target.files[0]) handleFile(e.target.files[0]); e.target.value = ""; }}
      />

      <DropZone visible={!model} onFile={handleFile} onSample={handleSample} />
      <LoadingOverlay />
      <Toolbar onOpenFile={handleOpenFile} onFitAll={fitAll} />
      <StatsPanel />
      <SelectionPanel />
    </div>
  );
}
