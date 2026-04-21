import { useRef, useEffect, useCallback } from "react";
import { convertFileSrc, isTauri } from "@tauri-apps/api/core";
import { resolveResource } from "@tauri-apps/api/path";
import { createOcctCore, normalizeOcctResult } from "@tx-code/occt-core";
import packageJson from "../../../package.json";
import { getOcctFormatFromFileName, resolveAutoOrientedResult } from "../lib/auto-orient";
import { createDemoExactSession } from "../lib/exact-session";
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
  const upsertWorkpieceActor = useViewerStore((s) => s.upsertWorkpieceActor);
  const upsertToolActor = useViewerStore((s) => s.upsertToolActor);
  const clearWorkspaceActors = useViewerStore((s) => s.clearWorkspaceActors);
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

  const disposeExactSession = useCallback(async (exactSession) => {
    if (!exactSession) {
      return { ok: true };
    }

    const result = await exactSession.dispose();
    if (result?.ok === false) {
      throw new Error(result.message || `Failed to dispose exact model ${exactSession.exactModelId}.`);
    }
    return result ?? { ok: true };
  }, []);

  const clearWorkspaceExactSessions = useCallback(async () => {
    const workspaceActors = useViewerStore.getState().workspaceActors ?? {};
    const exactSessions = Object.values(workspaceActors)
      .map((actor) => actor?.exactSession ?? null)
      .filter(Boolean);

    clearWorkspaceActors();

    for (const exactSession of exactSessions) {
      await disposeExactSession(exactSession);
    }

    return { ok: true };
  }, [clearWorkspaceActors, disposeExactSession]);

  const replaceActorExactSession = useCallback(async ({
    actorId,
    nextExactSession,
    applyState,
  }) => {
    const previousExactSession = useViewerStore.getState().workspaceActors?.[actorId]?.exactSession ?? null;
    applyState(nextExactSession);
    await disposeExactSession(previousExactSession);
    return nextExactSession;
  }, [disposeExactSession]);

  useEffect(() => () => {
    clearWorkspaceExactSessions().catch(() => {});
  }, [clearWorkspaceExactSessions]);

  const importFile = useCallback(async (file) => {
    setLoading(true, "Loading engine...");
    let nextExactSession = null;
    try {
      const occt = await ensureModule();
      const format = getOcctFormatFromFileName(file.name);
      if (!format) throw new Error("Unsupported format: " + file.name);

      const buffer = await file.arrayBuffer();
      const bytes = new Uint8Array(buffer);
      const core = createOcctCore({
        factory: async () => occt,
      });

      setLoadingMessage("Opening exact model...");
      const managedExactModel = await core.openManagedExactModel(bytes, {
        fileName: file.name,
        format,
        importParams: DEFAULT_IMPORT_PARAMS,
      });
      nextExactSession = createDemoExactSession({
        exactModel: managedExactModel.exactModel,
        dispose: () => managedExactModel.dispose(),
        sourceFormat: format,
        label: file.name,
      });
      const result = normalizeOcctResult(managedExactModel.exactModel, {
        sourceFormat: format,
        sourceFileName: file.name,
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

      await replaceActorExactSession({
        actorId: "workpiece",
        nextExactSession,
        applyState: (exactSession) => {
          upsertWorkpieceActor({
            rawModel: result,
            autoOrientModel: autoOrientResult,
            fileName: file.name,
            exactSession,
          });
        },
      });

      return useViewerStore.getState().model ?? result;
    } catch (error) {
      if (nextExactSession) {
        try {
          await nextExactSession.dispose();
        } catch {
          // Ignore cleanup failures while preserving the original import error.
        }
      }
      throw error;
    } finally {
      setLoading(false);
    }
  }, [ensureModule, replaceActorExactSession, setLoading, setLoadingMessage, upsertWorkpieceActor]);

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
    let nextExactSession = null;
    try {
      const occt = await ensureModule();
      const core = createOcctCore({
        factory: async () => occt,
      });

      setLoadingMessage("Validating revolved shape...");
      const validation = occt.ValidateRevolvedShapeSpec(spec);
      if (!validation?.ok) {
        const error = new Error(validation?.diagnostics?.[0]?.message || "Revolved shape spec validation failed.");
        error.diagnostics = validation?.diagnostics ?? [];
        throw error;
      }

      setLoadingMessage("Opening exact revolved shape...");
      const rawResult = await core.openExactRevolvedShape(spec, options);
      if (!rawResult?.success) {
        const error = new Error(rawResult?.error || rawResult?.diagnostics?.[0]?.message || "Generated revolved shape build failed.");
        error.diagnostics = rawResult?.diagnostics ?? [];
        error.result = rawResult;
        throw error;
      }
      nextExactSession = createDemoExactSession({
        exactModel: rawResult,
        dispose: () => core.releaseExactModel(rawResult.exactModelId),
        sourceFormat: "generated-revolved-shape",
        label,
      });

      const normalizedResult = normalizeOcctResult(rawResult, {
        sourceFormat: "generated-revolved-shape",
      });

      await replaceActorExactSession({
        actorId: "tool",
        nextExactSession,
        applyState: (exactSession) => {
          upsertToolActor({
            model: normalizedResult,
            label,
            exactSession,
          });
        },
      });
      return {
        validation,
        rawResult,
        result: normalizedResult,
      };
    } catch (error) {
      if (nextExactSession) {
        try {
          await nextExactSession.dispose();
        } catch {
          // Ignore cleanup failures while preserving the original generation error.
        }
      }
      throw error;
    } finally {
      setLoading(false);
    }
  }, [ensureModule, replaceActorExactSession, setLoading, setLoadingMessage, upsertToolActor]);

  return {
    clearExactSession: clearWorkspaceExactSessions,
    importFile,
    ensureModule,
    validateGeneratedToolSpec,
    buildGeneratedTool,
  };
}
