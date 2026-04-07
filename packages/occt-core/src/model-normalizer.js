import { normalizeOcctFormat } from "./formats.js";

const IDENTITY_MATRIX = [
  1, 0, 0, 0,
  0, 1, 0, 0,
  0, 0, 1, 0,
  0, 0, 0, 1,
];
const DEFAULT_CAD_BASE_COLOR = [0.9, 0.91, 0.93, 1];

function toArray(input) {
  if (!input) {
    return [];
  }
  if (Array.isArray(input)) {
    return input.slice();
  }
  if (ArrayBuffer.isView(input)) {
    return Array.from(input);
  }
  return [];
}

function normalizeColor(input) {
  if (!input) {
    return null;
  }

  let r;
  let g;
  let b;
  let a = 1;

  if (Array.isArray(input)) {
    if (input.length < 3) {
      return null;
    }
    [r, g, b] = input;
    if (input.length > 3 && Number.isFinite(input[3])) {
      a = input[3];
    }
  } else if (typeof input === "object") {
    if (!Number.isFinite(input.r) || !Number.isFinite(input.g) || !Number.isFinite(input.b)) {
      return null;
    }
    r = input.r;
    g = input.g;
    b = input.b;
    if (Number.isFinite(input.a)) {
      a = input.a;
    }
  } else {
    return null;
  }

  const scale = Math.max(Math.abs(r), Math.abs(g), Math.abs(b), Math.abs(a)) > 1 ? 255 : 1;
  const normalize = (value) => {
    const v = value / scale;
    return Math.min(1, Math.max(0, v));
  };

  return [normalize(r), normalize(g), normalize(b), normalize(a)];
}

function colorKey(color) {
  if (!color) {
    return null;
  }
  return color
    .slice(0, 4)
    .map((component) => Math.round(component * 255))
    .join(",");
}

function getMeshIndices(node) {
  if (Array.isArray(node?.meshes)) {
    return node.meshes.filter((index) => Number.isInteger(index) && index >= 0);
  }
  if (Number.isInteger(node?.meshIndex) && node.meshIndex >= 0) {
    return [node.meshIndex];
  }
  return [];
}

function normalizeFaces(mesh) {
  if (!Array.isArray(mesh?.faces)) {
    // Backward compat: fall back to old faceRanges if present
    const source = Array.isArray(mesh?.faceRanges)
      ? mesh.faceRanges
      : Array.isArray(mesh?.brep_faces)
        ? mesh.brep_faces
        : [];
    return source.map((range) => ({
      first: Number.isFinite(range?.first) ? range.first : 0,
      last: Number.isFinite(range?.last) ? range.last : 0,
      color: normalizeColor(range?.color),
    }));
  }

  return mesh.faces.map((face) => ({
    id: face?.id ?? 0,
    name: face?.name ?? "",
    firstIndex: face?.firstIndex ?? 0,
    indexCount: face?.indexCount ?? 0,
    edgeIndices: toArray(face?.edgeIndices),
    color: normalizeColor(face?.color),
  }));
}

function normalizeEdges(mesh) {
  if (!Array.isArray(mesh?.edges)) {
    return [];
  }

  return mesh.edges.map((edge) => {
    if (!edge) return null;

    // New topology format: edge has id, points, ownerFaceIds, isFreeEdge
    if (edge.points !== undefined) {
      return {
        id: edge.id ?? 0,
        name: edge.name ?? "",
        points: toArray(edge.points),
        ownerFaceIds: toArray(edge.ownerFaceIds),
        isFreeEdge: edge.isFreeEdge ?? false,
        color: normalizeColor(edge.color),
      };
    }

    // Backward compat: old positionIndices format
    const source = Array.isArray(edge.positionIndices) || ArrayBuffer.isView(edge.positionIndices)
      ? Array.from(edge.positionIndices)
      : Array.isArray(edge) ? edge : [];
    return source.filter((index) => Number.isInteger(index) && index >= 0);
  }).filter(Boolean);
}

function normalizeVertices(mesh) {
  if (!Array.isArray(mesh?.vertices)) {
    return [];
  }
  return mesh.vertices.map((v) => ({
    id: v?.id ?? 0,
    position: Array.isArray(v?.position) ? v.position.slice(0, 3) : toArray(v?.position).slice(0, 3),
  }));
}

function normalizeTriangleToFaceMap(mesh) {
  return toArray(mesh?.triangleToFaceMap);
}

function normalizeGeometry(mesh, index) {
  const positions = toArray(mesh?.positions ?? mesh?.attributes?.position?.array);
  const normals = toArray(mesh?.normals ?? mesh?.attributes?.normal?.array);
  const indices = toArray(mesh?.indices ?? mesh?.index?.array);

  return {
    id: `geo_${index}`,
    name: mesh?.name,
    positions,
    normals: normals.length ? normals : undefined,
    indices,
    faces: normalizeFaces(mesh),
    edges: normalizeEdges(mesh),
    vertices: normalizeVertices(mesh),
    triangleToFaceMap: normalizeTriangleToFaceMap(mesh),
    color: normalizeColor(mesh?.color),
  };
}

function collectMaterialColors(raw, geometries) {
  function normalizeMaterialColor(material) {
    if (!material) {
      return null;
    }

    const direct = normalizeColor(material);
    if (direct) {
      return direct;
    }

    if (typeof material !== "object") {
      return null;
    }

    const record = material;
    return normalizeColor(
      record.baseColor ??
      record.color ??
      record.diffuseColor ??
      record.albedoColor,
    );
  }

  const fromRawMaterials = Array.isArray(raw?.materials)
    ? raw.materials.map((mat) => normalizeMaterialColor(mat)).filter(Boolean)
    : [];

  if (fromRawMaterials.length > 0) {
    return fromRawMaterials;
  }

  const colors = [];
  for (const geometry of geometries) {
    if (geometry.color) {
      colors.push(geometry.color);
    }
    for (const face of geometry.faces ?? []) {
      if (face.color) {
        colors.push(face.color);
      }
    }
  }
  return colors;
}

function normalizeMaterials(raw, geometries) {
  const unique = new Map();
  for (const color of collectMaterialColors(raw, geometries)) {
    const key = colorKey(color);
    if (!key || unique.has(key)) {
      continue;
    }
    unique.set(key, {
      id: `mat_${unique.size}`,
      baseColor: color,
    });
  }

  if (unique.size === 0) {
    const fallback = DEFAULT_CAD_BASE_COLOR.slice();
    unique.set(colorKey(fallback), {
      id: "mat_0",
      baseColor: fallback,
    });
  }

  return {
    materials: Array.from(unique.values()),
    keyToMaterialId: new Map(Array.from(unique.entries()).map(([key, material]) => [key, material.id])),
  };
}

function materialIdForColor(color, keyToMaterialId) {
  const key = colorKey(color);
  if (!key) {
    return undefined;
  }
  return keyToMaterialId.get(key);
}

function normalizeNode(node, context, path) {
  const id = node?.id ? String(node.id) : `node_${path}`;
  const transform = Array.isArray(node?.transform) && node.transform.length === 16
    ? node.transform.slice()
    : IDENTITY_MATRIX.slice();

  const geometryIndices = getMeshIndices(node);
  const geometryIds = geometryIndices
    .filter((index) => index >= 0 && index < context.geometries.length)
    .map((index) => context.geometries[index].id);

  const materialIds = geometryIndices
    .map((index) => context.geometries[index])
    .filter(Boolean)
    .map((geometry) => geometry.materialId)
    .filter(Boolean);

  const rawChildren = Array.isArray(node?.children) ? node.children : [];
  const children = rawChildren.map((child, childIndex) => normalizeNode(child, context, `${path}_${childIndex}`));

  const kind = node?.isAssembly === true || children.length > 0 ? "assembly" : "part";

  return {
    id,
    name: typeof node?.name === "string" ? node.name : undefined,
    kind,
    transform,
    geometryIds,
    materialIds,
    children,
  };
}

function countNodes(nodes) {
  let nodeCount = 0;
  let partCount = 0;

  const visit = (node) => {
    nodeCount += 1;
    if (node.kind === "part") {
      partCount += 1;
    }
    for (const child of node.children) {
      visit(child);
    }
  };

  for (const node of nodes) {
    visit(node);
  }

  return { nodeCount, partCount };
}

function computeReusedInstanceCount(rootNodes) {
  const usage = new Map();

  const visit = (node) => {
    for (const geometryId of node.geometryIds) {
      usage.set(geometryId, (usage.get(geometryId) ?? 0) + 1);
    }
    for (const child of node.children) {
      visit(child);
    }
  };

  for (const node of rootNodes) {
    visit(node);
  }

  let reused = 0;
  for (const count of usage.values()) {
    if (count > 1) {
      reused += count - 1;
    }
  }
  return reused;
}

function normalizeWarnings(rawWarnings) {
  if (!Array.isArray(rawWarnings)) {
    return [];
  }

  return rawWarnings.map((warning) => {
    if (typeof warning === "string") {
      return { code: "WARNING", message: warning };
    }
    return {
      code: warning?.code ?? "WARNING",
      message: warning?.message ?? "",
      nodeId: warning?.nodeId,
    };
  });
}

export function normalizeOcctResult(rawResult, options = {}) {
  if (!rawResult || typeof rawResult !== "object") {
    throw new Error("Invalid OCCT result object.");
  }

  const rawGeometries = Array.isArray(rawResult.geometries)
    ? rawResult.geometries
    : Array.isArray(rawResult.meshes)
      ? rawResult.meshes
      : [];

  const geometries = rawGeometries.map(normalizeGeometry);
  const { materials, keyToMaterialId } = normalizeMaterials(rawResult, geometries);
  const fallbackMaterialId = materials[0]?.id;

  for (const geometry of geometries) {
    geometry.materialId = materialIdForColor(geometry.color, keyToMaterialId) ?? fallbackMaterialId;
  }

  const context = { geometries };
  const rawRootNodes = Array.isArray(rawResult.rootNodes)
    ? rawResult.rootNodes
    : rawResult.root
      ? [rawResult.root]
      : [];

  const rootNodes = rawRootNodes.map((node, index) => normalizeNode(node, context, `${index}`));

  const warnings = normalizeWarnings(rawResult.warnings);
  const sourceFormat = normalizeOcctFormat(options.sourceFormat ?? rawResult.sourceFormat ?? "step");

  const nodeStats = countNodes(rootNodes);
  const triangleCount = geometries.reduce((count, geometry) => count + Math.floor((geometry.indices?.length ?? 0) / 3), 0);

  const fallbackStats = {
    rootCount: rootNodes.length,
    nodeCount: nodeStats.nodeCount,
    partCount: nodeStats.partCount,
    geometryCount: geometries.length,
    materialCount: materials.length,
    triangleCount,
    reusedInstanceCount: computeReusedInstanceCount(rootNodes),
  };

  const stats = {
    ...fallbackStats,
    ...(rawResult.stats && typeof rawResult.stats === "object" ? rawResult.stats : {}),
  };

  return {
    sourceFormat,
    sourceFileName: options.sourceFileName,
    sourceUnit: rawResult.sourceUnit,
    unitScaleToMeters: rawResult.unitScaleToMeters,
    rootNodes,
    geometries,
    materials,
    warnings,
    stats,
  };
}
