function normalizeDisposeResult(result) {
  if (!result || result.ok === true || result.code === "released-handle") {
    return { ok: true };
  }
  return result;
}

export function createDemoExactSession({
  exactModel,
  dispose,
  sourceFormat,
  label = "",
} = {}) {
  const exactModelId = Number(exactModel?.exactModelId);
  if (!Number.isInteger(exactModelId) || exactModelId <= 0) {
    throw new Error("Demo exact session requires a valid exactModelId.");
  }
  if (typeof dispose !== "function") {
    throw new Error("Demo exact session requires a dispose callback.");
  }

  let disposed = false;
  let disposePromise = null;

  return {
    exactModelId,
    exactModel,
    sourceFormat: sourceFormat ?? exactModel?.sourceFormat ?? null,
    label,
    async dispose() {
      if (disposePromise) {
        return disposePromise;
      }
      if (disposed) {
        return { ok: true };
      }

      disposePromise = Promise.resolve(dispose())
        .then((result) => {
          const normalized = normalizeDisposeResult(result);
          if (normalized?.ok === true) {
            disposed = true;
          }
          return normalized;
        })
        .catch((error) => {
          disposePromise = null;
          throw error;
        });

      return disposePromise;
    },
  };
}

export function getExactSessionSnapshot(exactSession) {
  if (!exactSession) {
    return null;
  }

  return {
    exactModelId: exactSession.exactModelId,
    sourceFormat: exactSession.sourceFormat ?? null,
    label: exactSession.label ?? "",
  };
}
