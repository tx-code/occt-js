// demo/src/App.jsx
import { useEffect, useRef } from "react";
import { useViewerStore } from "./store/viewerStore";
import { useOcct } from "./hooks/useOcct";
import { useViewer } from "./hooks/useViewer";
import { useViewerActions } from "./hooks/useViewerActions";
import { usePicking } from "./hooks/usePicking";
import DropZone from "./components/DropZone";
import LoadingOverlay from "./components/LoadingOverlay";
import StatsPanel from "./components/StatsPanel";
import SelectionPanel from "./components/SelectionPanel";
import Toolbar from "./components/Toolbar";
import ModelTreeDrawer from "./components/ModelTreeDrawer";
import ViewCube from "./components/ViewCube";
import DesktopChrome from "./components/DesktopChrome";
import { shouldUseWindowsCustomChrome } from "./lib/desktop-runtime";
import { getAppShellLayout } from "./lib/app-shell";

export default function App() {
  const canvasRef = useRef(null);
  const model = useViewerStore((s) => s.model);
  const { importFile } = useOcct();
  const viewerRefs = useViewer(canvasRef);
  const { buildScene, clearScene, fitAll, setCameraView, setProjection, takeSnapshot } = viewerRefs;
  usePicking(viewerRefs);
  const fileInputRef = useRef(null);
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
    desktopEnabled: windowsDesktopChrome,
    fileInputRef,
    fitAll,
    importFile,
    setProjection,
  });

  useEffect(() => {
    if (model) {
      buildScene(model);
      return;
    }

    clearScene();
  }, [buildScene, clearScene, model]);

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

          <DropZone visible={!model} onFile={importModelFile} />
          <LoadingOverlay />
          <Toolbar
            chromeIntegrated={windowsDesktopChrome}
            onOpenFile={openFile}
            onFitAll={fitAll}
            onCameraView={setCameraView}
            onSetProjection={setProjectionAction}
            onSnapshot={takeSnapshot}
          />
          <StatsPanel />
          <SelectionPanel />
          <ModelTreeDrawer />
          <ViewCube onCameraView={setCameraView} cameraRef={viewerRefs.cameraRef} />
        </div>
      </div>
    </div>
  );
}
