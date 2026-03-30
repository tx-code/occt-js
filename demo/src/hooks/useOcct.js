import { useRef, useEffect, useCallback } from "react";
import { convertFileSrc, isTauri } from "@tauri-apps/api/core";
import { resolveResource } from "@tauri-apps/api/path";
import { useViewerStore } from "../store/viewerStore";
import { getOcctFormatFromFileName, resolveAutoOrientedResult } from "../lib/auto-orient";

const CDN = "https://unpkg.com/@tx-code/occt-js@0.1.5/dist/";

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
  const setImportedModels = useViewerStore((s) => s.setImportedModels);
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
        fallbackModuleUrl: CDN + "occt-js.js",
        fallbackLocateFile: (fileName) => CDN + fileName,
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
        const loadScript = (url) =>
          new Promise((resolve, reject) => {
            const script = document.createElement("script");
            script.src = url;
            script.onload = resolve;
            script.onerror = reject;
            document.head.appendChild(script);
          });

        try {
          await loadScript(runtime.moduleUrl);
        } catch (error) {
          if (!runtime.fallbackModuleUrl) {
            throw error;
          }
          await loadScript(runtime.fallbackModuleUrl);
          runtime.locateFile = runtime.fallbackLocateFile;
        }
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

      let autoOrientResult = null;
      setLoadingMessage("Analyzing orientation...");
      try {
        const orientedResult = await resolveAutoOrientedResult({
          occt,
          format,
          bytes,
          result,
        });
        if (orientedResult !== result) {
          autoOrientResult = orientedResult;
        }
      } catch (error) {
        console.warn("Auto orient failed for", file.name, error);
      }

      setImportedModels(result, autoOrientResult, file.name);
      const { orientationMode } = useViewerStore.getState();
      if (orientationMode === "auto-orient" && autoOrientResult) {
        return autoOrientResult;
      }
      return result;
    } finally {
      setLoading(false);
    }
  }, [ensureModule, setImportedModels, setLoading, setLoadingMessage]);

  return { importFile, ensureModule };
}
