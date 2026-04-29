const IDENTITY_MATRIX = [
  1, 0, 0, 0,
  0, 1, 0, 0,
  0, 0, 1, 0,
  0, 0, 0, 1,
];

function multiplyMatrices(left, right) {
  const output = new Array(16).fill(0);
  for (let row = 0; row < 4; row += 1) {
    for (let column = 0; column < 4; column += 1) {
      let sum = 0;
      for (let index = 0; index < 4; index += 1) {
        sum += left[index * 4 + row] * right[column * 4 + index];
      }
      output[column * 4 + row] = sum;
    }
  }
  return output;
}

function makeFailure(code, message) {
  return {
    ok: false,
    code,
    message,
  };
}

function normalizeTransform(transform) {
  return Array.isArray(transform) && transform.length === 16
    ? transform.slice()
    : IDENTITY_MATRIX.slice();
}

function findNodeOccurrence(nodes, nodeId, parentTransform = IDENTITY_MATRIX) {
  for (const node of nodes ?? []) {
    const worldTransform = multiplyMatrices(parentTransform, normalizeTransform(node.transform));
    if (node?.nodeId === nodeId || node?.id === nodeId) {
      return {
        geometryIds: Array.isArray(node.geometryIds) ? node.geometryIds : [],
        node,
        transform: worldTransform,
      };
    }

    const childMatch = findNodeOccurrence(node.children, nodeId, worldTransform);
    if (childMatch) {
      return childMatch;
    }
  }

  return undefined;
}

function findGeometry(exactModel, geometryId) {
  return exactModel?.geometries?.find((geometry) => geometry?.geometryId === geometryId || geometry?.id === geometryId);
}

function findExactGeometryBinding(exactModel, geometryId) {
  return exactModel?.exactGeometryBindings?.find((binding) => binding?.geometryId === geometryId);
}

function findExactGeometryBindingByHandle(exactModel, exactShapeHandle) {
  return exactModel?.exactGeometryBindings?.find((binding) => binding?.exactShapeHandle === exactShapeHandle);
}

function isExactElementKind(kind) {
  return kind === "face" || kind === "edge" || kind === "vertex";
}

function hasTopologyElement(geometry, kind, elementId) {
  if (!Number.isInteger(elementId) || elementId <= 0) {
    return false;
  }
  if (kind === "face") {
    return Array.isArray(geometry?.faces) && geometry.faces.some((face) => face?.id === elementId);
  }
  if (kind === "edge") {
    return Array.isArray(geometry?.edges) && geometry.edges.some((edge) => edge?.id === elementId);
  }
  if (kind === "vertex") {
    return Array.isArray(geometry?.vertices) && geometry.vertices.some((vertex) => vertex?.id === elementId);
  }
  return false;
}

export function createExactElementRef(exactModel, options = {}) {
  if (!Number.isInteger(exactModel?.exactModelId) || exactModel.exactModelId <= 0) {
    return makeFailure("invalid-handle", "Exact model handle is missing or invalid.");
  }

  const geometryId = typeof options.geometryId === "string" ? options.geometryId : "";
  const requestedExactShapeHandle = Number.isInteger(options.exactShapeHandle)
    ? options.exactShapeHandle
    : undefined;
  const kind = typeof options.kind === "string" ? options.kind : "";
  const elementId = options.elementId;

  if (!isExactElementKind(kind)) {
    return makeFailure("invalid-id", `Unsupported exact element kind: "${kind}".`);
  }

  let exactBinding;
  let geometry;
  if (geometryId) {
    geometry = findGeometry(exactModel, geometryId);
    if (!geometry) {
      return makeFailure("invalid-id", `Unknown geometryId: "${geometryId}".`);
    }

    exactBinding = findExactGeometryBinding(exactModel, geometryId);
    if (!exactBinding) {
      return makeFailure("invalid-id", `Missing exact geometry binding for "${geometryId}".`);
    }
    if (requestedExactShapeHandle !== undefined && exactBinding.exactShapeHandle !== requestedExactShapeHandle) {
      return makeFailure(
        "exact-shape-mismatch",
        `geometryId "${geometryId}" is bound to exactShapeHandle ${exactBinding.exactShapeHandle}, not ${requestedExactShapeHandle}.`,
      );
    }
  } else if (requestedExactShapeHandle !== undefined) {
    exactBinding = findExactGeometryBindingByHandle(exactModel, requestedExactShapeHandle);
    if (!exactBinding) {
      return makeFailure("invalid-id", `Unknown exactShapeHandle: ${requestedExactShapeHandle}.`);
    }
    geometry = findGeometry(exactModel, exactBinding.geometryId);
  } else {
    return makeFailure("invalid-id", "Exact ref requires geometryId or exactShapeHandle.");
  }

  if (!geometry) {
    return makeFailure("invalid-id", `Missing geometry for exactShapeHandle ${exactBinding.exactShapeHandle}.`);
  }
  if (!hasTopologyElement(geometry, kind, elementId)) {
    return makeFailure("invalid-id", `Unknown ${kind} id ${elementId} on geometry "${exactBinding.geometryId}".`);
  }

  return {
    ok: true,
    exactModelId: exactModel.exactModelId,
    exactShapeHandle: exactBinding.exactShapeHandle,
    geometryId: exactBinding.geometryId,
    kind,
    elementId,
    transform: normalizeTransform(options.transform),
  };
}

export function resolveExactElementRef(exactModel, options = {}) {
  if (!Number.isInteger(exactModel?.exactModelId) || exactModel.exactModelId <= 0) {
    return makeFailure("invalid-handle", "Exact model handle is missing or invalid.");
  }

  const nodeId = typeof options.nodeId === "string" ? options.nodeId : "";
  const geometryId = typeof options.geometryId === "string" ? options.geometryId : "";

  const geometry = findGeometry(exactModel, geometryId);
  if (!geometry) {
    return makeFailure("invalid-id", `Unknown geometryId: "${geometryId}".`);
  }

  const exactBinding = findExactGeometryBinding(exactModel, geometryId);
  if (!exactBinding) {
    return makeFailure("invalid-id", `Missing exact geometry binding for "${geometryId}".`);
  }

  const nodeOccurrence = findNodeOccurrence(exactModel.rootNodes, nodeId);
  if (!nodeOccurrence) {
    return makeFailure("invalid-id", `Unknown nodeId: "${nodeId}".`);
  }
  if (!nodeOccurrence.geometryIds.includes(geometryId)) {
    return makeFailure("occurrence-mismatch", `Node "${nodeId}" does not directly reference geometry "${geometryId}".`);
  }
  const ref = createExactElementRef(exactModel, {
    geometryId,
    kind: options.kind,
    elementId: options.elementId,
    transform: nodeOccurrence.transform,
  });
  if (ref.ok !== true) {
    return ref;
  }

  return {
    ...ref,
    ok: true,
    nodeId,
  };
}

export function createExactFaceRef(exactModel, options = {}) {
  return createExactElementRef(exactModel, { ...options, kind: "face" });
}

export function createExactEdgeRef(exactModel, options = {}) {
  return createExactElementRef(exactModel, { ...options, kind: "edge" });
}

export function createExactVertexRef(exactModel, options = {}) {
  return createExactElementRef(exactModel, { ...options, kind: "vertex" });
}

export function resolveExactFaceRef(exactModel, options = {}) {
  return resolveExactElementRef(exactModel, { ...options, kind: "face" });
}

export function resolveExactEdgeRef(exactModel, options = {}) {
  return resolveExactElementRef(exactModel, { ...options, kind: "edge" });
}

export function resolveExactVertexRef(exactModel, options = {}) {
  return resolveExactElementRef(exactModel, { ...options, kind: "vertex" });
}
