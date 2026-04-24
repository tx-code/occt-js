// demo/src/App.jsx
import { useEffect, useRef, useState } from "react";
import { useViewerStore } from "./store/viewerStore";
import { useOcct } from "./hooks/useOcct";
import { useViewer } from "./hooks/useViewer";
import { useViewerActions } from "./hooks/useViewerActions";
import { usePicking } from "./hooks/usePicking";
import DropZone from "./components/DropZone";
import GeneratedToolLegend from "./components/GeneratedToolLegend";
import LoadingOverlay from "./components/LoadingOverlay";
import StatsPanel from "./components/StatsPanel";
import SelectionPanel from "./components/SelectionPanel";
import Toolbar from "./components/Toolbar";
import ModelTreeDrawer from "./components/ModelTreeDrawer";
import ViewCube from "./components/ViewCube";
import DesktopChrome from "./components/DesktopChrome";
import GeneratedToolPanel from "./components/GeneratedToolPanel";
import { shouldUseWindowsCustomChrome } from "./lib/desktop-runtime";
import { getAppShellLayout } from "./lib/app-shell";
import { shouldAutoLoadSample } from "./lib/sample-autoload";

export default function App() {
  const canvasRef = useRef(null);
  const model = useViewerStore((s) => s.model);
  const loading = useViewerStore((s) => s.loading);
  const { importFile, clearExactSession, ensureModule, validateGeneratedToolSpec, buildGeneratedTool } = useOcct();
  const viewerRefs = useViewer(canvasRef);
  const { buildScene, clearScene, fitAll, setCameraView, takeSnapshot } = viewerRefs;
  usePicking(viewerRefs);
  const fileInputRef = useRef(null);
  const sampleBootstrappedRef = useRef(false);
  const [generatorOpen, setGeneratorOpen] = useState(false);
  const windowsDesktopChrome = shouldUseWindowsCustomChrome();
  const shellLayout = getAppShellLayout(windowsDesktopChrome);
  const {
    aboutAction,
    closeModel,
    importModelFile,
    openFile,
    openSample,
    setProjectionAction,
    toggleThemeAction,
  } = useViewerActions({
    clearExactSession,
    desktopEnabled: windowsDesktopChrome,
    fileInputRef,
    importFile,
    viewerRuntimeRef: viewerRefs.viewerRuntimeRef,
  });

  useEffect(() => {
    if (model) {
      buildScene(model);
      return;
    }

    clearScene();
  }, [buildScene, clearScene, model]);

  useEffect(() => {
    if (sampleBootstrappedRef.current) return;
    if (!shouldAutoLoadSample()) return;
    if (model || loading) return;
    sampleBootstrappedRef.current = true;
    openSample();
  }, [loading, model, openSample]);

  return (
    <div className={shellLayout.rootClassName}>
      {windowsDesktopChrome && (
        <DesktopChrome
          onOpenFile={openFile}
          onOpenSample={openSample}
          onCloseModel={closeModel}
          onFitAll={fitAll}
          onSetProjection={setProjectionAction}
          onToggleTheme={toggleThemeAction}
          onAbout={aboutAction}
        />
      )}

      <div className={shellLayout.viewportClassName}>
        <div className="relative h-full">
          <canvas
            ref={canvasRef}
            className="absolute inset-0 h-full w-full outline-none"
            data-testid="render-canvas"
          />

          <input
            ref={fileInputRef}
            type="file"
            accept=".step,.stp,.iges,.igs,.brep,.brp"
            className="hidden"
            onChange={(e) => { if (e.target.files[0]) importModelFile(e.target.files[0]); e.target.value = ""; }}
          />

          <DropZone
            visible={!model}
            onFile={importModelFile}
            onOpenSample={openSample}
            onOpenGenerator={() => setGeneratorOpen(true)}
          />
          <LoadingOverlay />
          <Toolbar
            chromeIntegrated={windowsDesktopChrome}
            onOpenFile={openFile}
            onOpenGenerator={() => setGeneratorOpen(true)}
            onFitAll={fitAll}
            onCameraView={setCameraView}
            onSetProjection={setProjectionAction}
            onSnapshot={takeSnapshot}
          />
          <GeneratedToolLegend />
          <StatsPanel />
          <SelectionPanel ensureModule={ensureModule} />
          <ModelTreeDrawer />
          <ViewCube onCameraView={setCameraView} cameraRef={viewerRefs.cameraRef} />
          <GeneratedToolPanel
            open={generatorOpen}
            onClose={() => setGeneratorOpen(false)}
            validateGeneratedToolSpec={validateGeneratedToolSpec}
            buildGeneratedTool={buildGeneratedTool}
          />
        </div>
      </div>
    </div>
  );
}
