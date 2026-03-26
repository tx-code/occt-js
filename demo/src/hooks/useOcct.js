import { useRef, useEffect, useCallback } from "react";
import { useViewerStore } from "../store/viewerStore";

const CDN = "https://unpkg.com/@tx-code/occt-js@0.1.4/dist/";

function getDistBase() {
  if (import.meta.env.DEV) {
    const localDist = new URL("../../../dist/", import.meta.url).href;
    return localDist.endsWith("/") ? localDist : `${localDist}/`;
  }
  return CDN;
}

export function useOcct() {
  const moduleRef = useRef(null);
  const modulePromiseRef = useRef(null);
  const distBaseRef = useRef(getDistBase());
  const setModel = useViewerStore((s) => s.setModel);
  const setLoading = useViewerStore((s) => s.setLoading);
  const setLoadingMessage = useViewerStore((s) => s.setLoadingMessage);

  const ensureModule = useCallback(async () => {
    if (moduleRef.current) return moduleRef.current;
    if (modulePromiseRef.current) return modulePromiseRef.current;

    modulePromiseRef.current = (async () => {
      if (!window.OcctJS) {
        const script = document.createElement("script");
        script.src = distBaseRef.current + "occt-js.js";
        document.head.appendChild(script);
        await new Promise((resolve, reject) => {
          script.onload = resolve;
          script.onerror = reject;
        });
      }

      const module = await window.OcctJS({ locateFile: (f) => distBaseRef.current + f });
      moduleRef.current = module;
      return module;
    })().catch((error) => {
      modulePromiseRef.current = null;
      throw error;
    });

    return modulePromiseRef.current;
  }, []);

  useEffect(() => {
    ensureModule().catch(() => {});
  }, [ensureModule]);

  const importFile = useCallback(async (file) => {
    setLoading(true, "Loading engine...");
    try {
      const occt = await ensureModule();
      const ext = file.name.toLowerCase().split(".").pop();
      const formatMap = { step: "step", stp: "step", iges: "iges", igs: "iges", brep: "brep", brp: "brep" };
      const format = formatMap[ext];
      if (!format) throw new Error("Unsupported format: " + file.name);

      const buffer = await file.arrayBuffer();
      const bytes = new Uint8Array(buffer);

      setLoadingMessage("Parsing model...");
      const methods = { step: "ReadStepFile", iges: "ReadIgesFile", brep: "ReadBrepFile" };
      const result = occt[methods[format]](bytes, {});

      if (!result.success) throw new Error(result.error || "Import failed");

      setModel(result, file.name);
      return result;
    } finally {
      setLoading(false);
    }
  }, [ensureModule, setLoading, setLoadingMessage, setModel]);

  return { importFile, ensureModule };
}
