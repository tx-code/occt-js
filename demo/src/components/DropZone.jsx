// demo/src/components/DropZone.jsx
import { useCallback, useState } from "react";
import { Button } from "./ui/button";
import OrientationModeToggle from "./OrientationModeToggle";
import { useViewerStore } from "../store/viewerStore";

export default function DropZone({ onFile, visible }) {
  const [dragOver, setDragOver] = useState(false);
  const theme = useViewerStore((s) => s.theme);
  const isLight = theme === "light";

  const handleDrop = useCallback((e) => {
    e.preventDefault();
    setDragOver(false);
    if (e.dataTransfer.files[0]) onFile(e.dataTransfer.files[0]);
  }, [onFile]);

  if (!visible) return null;

  return (
    <div
      className={`absolute inset-0 z-50 flex items-center justify-center transition-opacity ${
        isLight
          ? (dragOver ? "bg-zinc-100/98" : "bg-zinc-100/95")
          : (dragOver ? "bg-zinc-950/98" : "bg-zinc-950/95")
      }`}
      onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
      onDragLeave={() => setDragOver(false)}
      onDrop={handleDrop}
      data-testid="drop-zone"
    >
      <div
        className={`w-[min(92vw,34rem)] rounded-3xl p-8 text-center transition-colors ${
          isLight
            ? "border border-zinc-300/90 bg-white/90 shadow-2xl shadow-zinc-300/35"
            : "border border-zinc-800/90 bg-zinc-950/90 shadow-2xl shadow-black/30"
        } ${
          dragOver ? "border-cyan-400/70" : (isLight ? "border-zinc-300/90" : "border-zinc-800/90")
        }`}
      >
        <div className="space-y-3">
          <p className={`text-[11px] uppercase tracking-[0.28em] ${isLight ? "text-zinc-500" : "text-zinc-500"}`}>Import CAD</p>
          <h2 className={`text-2xl font-semibold ${isLight ? "text-zinc-900" : "text-zinc-100"}`}>Open STEP, IGES, or BREP</h2>
          <p className={`mx-auto max-w-md text-sm leading-6 ${isLight ? "text-zinc-600" : "text-zinc-500"}`}>
            Choose how the model should land in the viewer, then browse or drop a file.
          </p>
        </div>
        <div className="mt-6 flex justify-center">
          <OrientationModeToggle
            className="justify-center"
            rawTestId="orientation-mode-raw-empty"
            autoTestId="orientation-mode-auto-empty"
          />
        </div>
        <div className="mt-6">
          <Button onClick={() => document.getElementById("file-input").click()}>
            Browse Files
          </Button>
        </div>
        <input
          id="file-input"
          type="file"
          accept=".step,.stp,.iges,.igs,.brep,.brp"
          className="hidden"
          onChange={(e) => { if (e.target.files[0]) onFile(e.target.files[0]); e.target.value = ""; }}
          data-testid="file-input"
        />
        <p className={`mt-4 text-xs ${isLight ? "text-zinc-500" : "text-zinc-600"}`}>
          Drag and drop is supported too.
        </p>
      </div>
    </div>
  );
}
