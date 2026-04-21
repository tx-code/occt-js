import { useRef, useEffect, useCallback } from "react";
import { convertFileSrc, isTauri } from "@tauri-apps/api/core";
import { resolveResource } from "@tauri-apps/api/path";
import { createOcctCore, normalizeOcctResult } from "@tx-code/occt-core";
import packageJson from "../../../package.json";
import { getOcctFormatFromFileName, resolveAutoOrientedResult } from "../lib/auto-orient";
import { useViewerStore } from "../store/viewerStore";

const CDN = `https://unpkg.com/@tx-code/occt-js@${packageJson.version}/dist/`;
const DEFAULT_IMPORT_PARAMS = Object.freeze({
  readColors: true,
  readNames: true,
  rootMode: "multiple-shapes",
});

function getWebRuntime() {
  if (import.meta.env.DEV) {
    const moduleUrl = new URL("../../../dist/occt-js.js", import.meta.url).href;
    const wasmUrl = new URL("../../../dist/occt-js.wasm", import.meta.url).href;
    return {
      moduleUrl,
      locateFile: () => wasmUrl,
    };
  }
  return {
    moduleUrl: CDN + "occt-js.js",
    locateFile: (fileName) => CDN + fileName,
  };
}

export function useOcct() {
  const moduleRef = useRef(null);
  const modulePromiseRef = useRef(null);
  const runtimeRef = useRef(null);
  const runtimePromiseRef = useRef(null);
  const setImportedModels = useViewerStore((s) => s.setImportedModels);
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

      const webRuntime = getWebRuntime();
      return {
        moduleUrl: webRuntime.moduleUrl,
        locateFile: webRuntime.locateFile,
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
      const core = createOcctCore({
        factory: async () => occt,
      });

      setLoadingMessage("Parsing model...");
      const result = await core.importModel(bytes, {
        fileName: file.name,
        format,
        importParams: DEFAULT_IMPORT_PARAMS,
      });

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

  const validateGeneratedToolSpec = useCallback(async (spec) => {
    const occt = await ensureModule();
    return occt.ValidateRevolvedShapeSpec(spec);
  }, [ensureModule]);

  const buildGeneratedTool = useCallback(async ({
    spec,
    options = {},
    label = "Generated Tool",
  }) => {
    setLoading(true, "Loading engine...");
    try {
      const occt = await ensureModule();

      setLoadingMessage("Validating revolved shape...");
      const validation = occt.ValidateRevolvedShapeSpec(spec);
      if (!validation?.ok) {
        const error = new Error(validation?.diagnostics?.[0]?.message || "Revolved shape spec validation failed.");
        error.diagnostics = validation?.diagnostics ?? [];
        throw error;
      }

      setLoadingMessage("Generating revolved shape...");
      const result = occt.BuildRevolvedShape(spec, options);
      if (!result?.success) {
        const error = new Error(result?.error || result?.diagnostics?.[0]?.message || "Generated revolved shape build failed.");
        error.diagnostics = result?.diagnostics ?? [];
        error.result = result;
        throw error;
      }

      const normalizedResult = normalizeOcctResult(result, {
        sourceFormat: "generated-revolved-shape",
      });

      setModel(normalizedResult, label);
      return {
        validation,
        rawResult: result,
        result: normalizedResult,
      };
    } finally {
      setLoading(false);
    }
  }, [ensureModule, setLoading, setLoadingMessage, setModel]);

  return {
    importFile,
    ensureModule,
    validateGeneratedToolSpec,
    buildGeneratedTool,
  };
}
