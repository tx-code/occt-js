import { useRef, useCallback } from "react";
import { useViewerStore } from "../store/viewerStore";

const CDN = "https://unpkg.com/@tx-code/occt-js@0.1.2/dist/";

export function useOcct() {
  const moduleRef = useRef(null);
  const setModel = useViewerStore((s) => s.setModel);
  const setLoading = useViewerStore((s) => s.setLoading);

  const ensureModule = useCallback(async () => {
    if (moduleRef.current) return moduleRef.current;
    if (!window.OcctJS) {
      const script = document.createElement("script");
      script.src = CDN + "occt-js.js";
      document.head.appendChild(script);
      await new Promise((resolve, reject) => {
        script.onload = resolve;
        script.onerror = reject;
      });
    }
    moduleRef.current = await window.OcctJS({ locateFile: (f) => CDN + f });
    return moduleRef.current;
  }, []);

  const importFile = useCallback(async (file) => {
    setLoading(true);
    try {
      const occt = await ensureModule();
      const buffer = await file.arrayBuffer();
      const bytes = new Uint8Array(buffer);

      const ext = file.name.toLowerCase().split(".").pop();
      const formatMap = { step: "step", stp: "step", iges: "iges", igs: "iges", brep: "brep", brp: "brep" };
      const format = formatMap[ext];
      if (!format) throw new Error("Unsupported format: " + file.name);

      const methods = { step: "ReadStepFile", iges: "ReadIgesFile", brep: "ReadBrepFile" };
      const result = occt[methods[format]](bytes, {});

      if (!result.success) throw new Error(result.error || "Import failed");

      setModel(result, file.name);
      return result;
    } finally {
      setLoading(false);
    }
  }, [ensureModule, setModel, setLoading]);

  return { importFile, ensureModule };
}
