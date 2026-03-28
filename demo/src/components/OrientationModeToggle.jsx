import { useViewerStore } from "../store/viewerStore";
import { Button } from "./ui/button";

export default function OrientationModeToggle({
  className = "",
  rawTestId = "orientation-mode-raw",
  autoTestId = "orientation-mode-auto",
} = {}) {
  const fileName = useViewerStore((s) => s.fileName);
  const autoOrientModel = useViewerStore((s) => s.autoOrientModel);
  const orientationMode = useViewerStore((s) => s.orientationMode);
  const setOrientationMode = useViewerStore((s) => s.setOrientationMode);
  const autoOrientAvailable = !fileName || !!autoOrientModel;

  return (
    <div className={`inline-flex items-center gap-1 rounded-lg border border-zinc-800 bg-zinc-900/80 p-1 ${className}`.trim()}>
      <Button
        size="sm"
        variant={orientationMode === "raw" ? "active" : "default"}
        onClick={() => setOrientationMode("raw")}
        data-testid={rawTestId}
      >
        Raw
      </Button>
      <Button
        size="sm"
        variant={orientationMode === "auto-orient" ? "active" : "default"}
        onClick={() => setOrientationMode("auto-orient")}
        disabled={!autoOrientAvailable}
        data-testid={autoTestId}
      >
        Auto-Orient
      </Button>
    </div>
  );
}
