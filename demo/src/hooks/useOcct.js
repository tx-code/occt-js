import { useRef, useEffect, useCallback } from "react";
import { convertFileSrc, isTauri } from "@tauri-apps/api/core";
import { resolveResource } from "@tauri-apps/api/path";
import OcctJS from "@tx-code/occt-js";
import { createOcctCore, normalizeExactOpenResult, normalizeOcctResult } from "@tx-code/occt-core";
import occtWasmUrl from "../../../dist/occt-js.wasm?url";
import { getOcctFormatFromFileName, resolveAutoOrientedResult } from "../lib/auto-orient";
import { createDemoExactSession } from "../lib/exact-session";
import { useViewerStore } from "../store/viewerStore.js";

const DEFAULT_IMPORT_PARAMS = Object.freeze({
  readColors: true,
  readNames: true,
  rootMode: "multiple-shapes",
});
const GENERATED_SHAPE_FAMILY = Object.freeze({
  REVOLVED: "revolved",
  HELICAL: "helical",
  COMPOSITE: "composite",
});

function normalizeGeneratedShapeFamily(family) {
  if (family === GENERATED_SHAPE_FAMILY.COMPOSITE) {
    return GENERATED_SHAPE_FAMILY.COMPOSITE;
  }
  return family === GENERATED_SHAPE_FAMILY.HELICAL
    ? GENERATED_SHAPE_FAMILY.HELICAL
    : GENERATED_SHAPE_FAMILY.REVOLVED;
}

function resolveGeneratedShapeSourceFormat(family) {
  if (family === GENERATED_SHAPE_FAMILY.COMPOSITE) {
    return "generated-composite-shape";
  }
  return family === GENERATED_SHAPE_FAMILY.HELICAL
    ? "generated-helical-sweep"
    : "generated-revolved-shape";
}

function loadScript(url) {
  return new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.src = url;
    script.onload = resolve;
    script.onerror = reject;
    document.head.appendChild(script);
  });
}

async function loadWebOcctModule() {
  if (typeof OcctJS !== "function") {
    throw new TypeError("default export must be a factory function");
  }

  return OcctJS({
    locateFile(fileName) {
      return fileName.endsWith(".wasm") ? occtWasmUrl : fileName;
    },
  });
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

      return null;
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
      let module;

      if (isTauri()) {
        const runtime = await ensureRuntime();
        if (!window.OcctJS) {
          await loadScript(runtime.moduleUrl);
        }
        module = await window.OcctJS({ locateFile: runtime.locateFile });
      } else {
        module = await loadWebOcctModule();
      }

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
      const normalizedExactModel = normalizeExactOpenResult(managedExactModel.exactModel, {
        sourceFormat: format,
        sourceFileName: file.name,
        importParams: DEFAULT_IMPORT_PARAMS,
      });
      nextExactSession = createDemoExactSession({
        exactModel: normalizedExactModel,
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

  const validateGeneratedToolSpec = useCallback(async (spec, family = GENERATED_SHAPE_FAMILY.REVOLVED) => {
    const occt = await ensureModule();
    const normalizedFamily = normalizeGeneratedShapeFamily(family);
    if (normalizedFamily === GENERATED_SHAPE_FAMILY.COMPOSITE) {
      return occt.ValidateCompositeShapeSpec(spec);
    }
    if (normalizedFamily === GENERATED_SHAPE_FAMILY.HELICAL) {
      return occt.ValidateHelicalSweepSpec(spec);
    }
    return occt.ValidateRevolvedShapeSpec(spec);
  }, [ensureModule]);

  const buildGeneratedTool = useCallback(async ({
    family = GENERATED_SHAPE_FAMILY.REVOLVED,
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
      const normalizedFamily = normalizeGeneratedShapeFamily(family);
      const sourceFormat = resolveGeneratedShapeSourceFormat(normalizedFamily);
      const isHelical = normalizedFamily === GENERATED_SHAPE_FAMILY.HELICAL;
      const isComposite = normalizedFamily === GENERATED_SHAPE_FAMILY.COMPOSITE;

      setLoadingMessage(
        isComposite
          ? "Validating composite shape..."
          : (isHelical ? "Validating helical sweep..." : "Validating revolved shape..."),
      );
      const validation = isComposite
        ? occt.ValidateCompositeShapeSpec(spec)
        : (isHelical
          ? occt.ValidateHelicalSweepSpec(spec)
          : occt.ValidateRevolvedShapeSpec(spec));
      if (!validation?.ok) {
        const error = new Error(validation?.diagnostics?.[0]?.message || (
          isComposite
            ? "Composite shape spec validation failed."
            : (isHelical ? "Helical sweep spec validation failed." : "Revolved shape spec validation failed.")
        ));
        error.diagnostics = validation?.diagnostics ?? [];
        throw error;
      }

      setLoadingMessage(
        isComposite
          ? "Opening exact composite shape..."
          : (isHelical ? "Opening exact helical sweep..." : "Opening exact revolved shape..."),
      );
      const rawResult = isComposite
        ? await core.openExactCompositeShape(spec, options)
        : (isHelical
          ? await core.openExactHelicalSweep(spec, options)
          : await core.openExactRevolvedShape(spec, options));
      if (!rawResult?.success) {
        const error = new Error(rawResult?.error || rawResult?.diagnostics?.[0]?.message || (
          isComposite
            ? "Generated composite shape build failed."
            : (isHelical ? "Generated helical sweep build failed." : "Generated revolved shape build failed.")
        ));
        error.diagnostics = rawResult?.diagnostics ?? [];
        error.result = rawResult;
        throw error;
      }
      const normalizedExactModel = normalizeExactOpenResult(rawResult, {
        sourceFormat,
      });
      nextExactSession = createDemoExactSession({
        exactModel: normalizedExactModel,
        dispose: () => core.releaseExactModel(rawResult.exactModelId),
        sourceFormat,
        label,
      });

      const normalizedResult = normalizeOcctResult(rawResult, {
        sourceFormat,
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
