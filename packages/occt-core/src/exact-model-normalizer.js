import { normalizeOcctResult } from "./model-normalizer.js";

function normalizeExactGeometryBindings(rawBindings, geometries) {
  if (!Array.isArray(rawBindings)) {
    throw new Error("Exact open result is missing exactGeometryBindings.");
  }
  if (rawBindings.length !== geometries.length) {
    throw new Error("Exact geometry bindings do not align with normalized geometries.");
  }

  return rawBindings.map((binding, index) => {
    const geometry = geometries[index];
    const exactShapeHandle = binding?.exactShapeHandle;
    if (!geometry?.geometryId) {
      throw new Error(`Normalized geometry ${index} is missing geometryId.`);
    }
    if (!Number.isInteger(exactShapeHandle) || exactShapeHandle <= 0) {
      throw new Error(`Exact geometry binding ${index} is missing a valid exactShapeHandle.`);
    }
    return {
      geometryId: geometry.geometryId,
      exactShapeHandle,
    };
  });
}

function withNodeIds(node) {
  return {
    ...node,
    nodeId: node?.id,
    children: Array.isArray(node?.children) ? node.children.map(withNodeIds) : [],
  };
}

function withGeometryIds(geometry) {
  return {
    ...geometry,
    geometryId: geometry?.id,
  };
}

export function normalizeExactOpenResult(rawResult, options = {}) {
  if (!rawResult || typeof rawResult !== "object") {
    throw new Error("Invalid exact open result object.");
  }
  if (rawResult.success !== true) {
    throw new Error(rawResult.error ?? "Exact open failed.");
  }
  if (!Number.isInteger(rawResult.exactModelId) || rawResult.exactModelId <= 0) {
    throw new Error("Exact open result is missing a valid exactModelId.");
  }

  const normalized = normalizeOcctResult(rawResult, options);
  const geometries = normalized.geometries.map(withGeometryIds);
  const rootNodes = normalized.rootNodes.map(withNodeIds);

  return {
    ...normalized,
    exactModelId: rawResult.exactModelId,
    exactGeometryBindings: normalizeExactGeometryBindings(rawResult.exactGeometryBindings, geometries),
    geometries,
    rootNodes,
  };
}
