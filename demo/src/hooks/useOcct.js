import { useRef, useEffect, useCallback } from "react";
import { convertFileSrc, isTauri } from "@tauri-apps/api/core";
import { resolveResource } from "@tauri-apps/api/path";
import { useViewerStore } from "../store/viewerStore";
import { getOcctFormatFromFileName, resolveAutoOrientedResult } from "../lib/auto-orient";

const CDN = "https://unpkg.com/@tx-code/occt-js@0.1.4/dist/";

function getWebDistBase() {
  if (import.meta.env.DEV) {
    const localDist = new URL("../../../dist/", import.meta.url).href;
    return localDist.endsWith("/") ? localDist : `${localDist}/`;
  }
  return CDN;
}

export function useOcct() {
  const moduleRef = useRef(null);
  const modulePromiseRef = useRef(null);
  const runtimeRef = useRef(null);
  const runtimePromiseRef = useRef(null);
  const setModel = useViewerStore((s) => s.setModel);
  const setLoading = useViewerStore((s) => s.setLoading);
  const setLoadingMessage = useViewerStore((s) => s.setLoadingMessage);

  const ensureRuntime = useCallback(async () => {
    if (runtimeRef.current) return runtimeRef.current;
    if (runtimePromiseRef.current) return runtimePromiseRef.current;

    runtimePromiseRef.current = (async () => {
      if (isTauri()) {
        const [jsPath, wasmPath] = await Promise.all([
          resolveResource("dist/occt-js.js"),
          resolveResource("dist/occt-js.wasm"),
        ]);
        return {
          moduleUrl: convertFileSrc(jsPath),
          locateFile: () => convertFileSrc(wasmPath),
        };
      }

      const distBase = getWebDistBase();
      return {
        moduleUrl: distBase + "occt-js.js",
        locateFile: (fileName) => distBase + fileName,
      };
    })()
      .then((runtime) => {
        runtimeRef.current = runtime;
        return runtime;
      })
      .catch((error) => {
        runtimePromiseRef.current = null;
        throw error;
      });

    return runtimePromiseRef.current;
  }, []);

  const ensureModule = useCallback(async () => {
    if (moduleRef.current) return moduleRef.current;
    if (modulePromiseRef.current) return modulePromiseRef.current;

    modulePromiseRef.current = (async () => {
      const runtime = await ensureRuntime();

      if (!window.OcctJS) {
        const script = document.createElement("script");
        script.src = runtime.moduleUrl;
        document.head.appendChild(script);
        await new Promise((resolve, reject) => {
          script.onload = resolve;
          script.onerror = reject;
        });
      }

      const module = await window.OcctJS({ locateFile: runtime.locateFile });
      moduleRef.current = module;
      return module;
    })().catch((error) => {
      modulePromiseRef.current = null;
      throw error;
    });

    return modulePromiseRef.current;
  }, [ensureRuntime]);

  useEffect(() => {
    ensureModule().catch(() => {});
  }, [ensureModule]);

  const importFile = useCallback(async (file) => {
    setLoading(true, "Loading engine...");
    try {
      const occt = await ensureModule();
      const format = getOcctFormatFromFileName(file.name);
      if (!format) throw new Error("Unsupported format: " + file.name);

      const buffer = await file.arrayBuffer();
      const bytes = new Uint8Array(buffer);

      setLoadingMessage("Parsing model...");
      const methods = { step: "ReadStepFile", iges: "ReadIgesFile", brep: "ReadBrepFile" };
      const result = occt[methods[format]](bytes, {});

      if (!result.success) throw new Error(result.error || "Import failed");

      let finalResult = result;
      if (useViewerStore.getState().autoOrientEnabled) {
        setLoadingMessage("Analyzing orientation...");
        try {
          finalResult = await resolveAutoOrientedResult({
            occt,
            format,
            bytes,
            result,
            autoOrientEnabled: true,
          });
        } catch (error) {
          console.warn("Auto orient failed for", file.name, error);
        }
      }

      setModel(finalResult, file.name);
      return finalResult;
    } finally {
      setLoading(false);
    }
  }, [ensureModule, setLoading, setLoadingMessage, setModel]);

  return { importFile, ensureModule };
}
