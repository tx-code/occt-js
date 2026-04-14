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

export function resolveExactElementRef(exactModel, options = {}) {
  if (!Number.isInteger(exactModel?.exactModelId) || exactModel.exactModelId <= 0) {
    return makeFailure("invalid-handle", "Exact model handle is missing or invalid.");
  }

  const nodeId = typeof options.nodeId === "string" ? options.nodeId : "";
  const geometryId = typeof options.geometryId === "string" ? options.geometryId : "";
  const kind = typeof options.kind === "string" ? options.kind : "";
  const elementId = options.elementId;

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
  if (!hasTopologyElement(geometry, kind, elementId)) {
    return makeFailure("invalid-id", `Unknown ${kind} id ${elementId} on geometry "${geometryId}".`);
  }

  return {
    ok: true,
    exactModelId: exactModel.exactModelId,
    exactShapeHandle: exactBinding.exactShapeHandle,
    nodeId,
    geometryId,
    kind,
    elementId,
    transform: nodeOccurrence.transform,
  };
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
