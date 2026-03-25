// demo/src/components/DropZone.jsx
import { useCallback, useState } from "react";
import { Button } from "./ui/button";

export default function DropZone({ onFile, onSample, visible }) {
  const [dragOver, setDragOver] = useState(false);

  const handleDrop = useCallback((e) => {
    e.preventDefault();
    setDragOver(false);
    if (e.dataTransfer.files[0]) onFile(e.dataTransfer.files[0]);
  }, [onFile]);

  if (!visible) return null;

  return (
    <div
      className={`absolute inset-0 z-50 flex items-center justify-center bg-zinc-950/95 transition-opacity ${dragOver ? "bg-zinc-950/98" : ""}`}
      onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
      onDragLeave={() => setDragOver(false)}
      onDrop={handleDrop}
      data-testid="drop-zone"
    >
      <div className={`border-2 border-dashed rounded-2xl p-12 text-center transition-colors ${dragOver ? "border-cyan-400" : "border-zinc-600"}`}>
        <h2 className="text-xl font-medium mb-3">occt-js Viewer</h2>
        <p className="text-zinc-500 text-sm mb-5">
          <span className="hidden md:inline">Drop a STEP, IGES, or BREP file here</span>
          <span className="md:hidden">Open a STEP, IGES, or BREP file</span>
        </p>
        <Button onClick={() => document.getElementById("file-input").click()}>
          Browse Files
        </Button>
        <input
          id="file-input"
          type="file"
          accept=".step,.stp,.iges,.igs,.brep,.brp"
          className="hidden"
          onChange={(e) => { if (e.target.files[0]) onFile(e.target.files[0]); e.target.value = ""; }}
          data-testid="file-input"
        />
        <p className="mt-4 text-xs text-zinc-600">
          Or try with a{" "}
          <a href="#" onClick={(e) => { e.preventDefault(); onSample(); }} className="text-cyan-400" data-testid="load-sample">
            sample file
          </a>
        </p>
      </div>
    </div>
  );
}
