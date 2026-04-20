import { normalizeOcctFormat } from "./formats.js";

const GENERATED_TOOL_SOURCE_FORMAT = "generated-revolved-tool";
const IDENTITY_MATRIX = [
  1, 0, 0, 0,
  0, 1, 0, 0,
  0, 0, 1, 0,
  0, 0, 0, 1,
];
const DEFAULT_CAD_BASE_COLOR = [0.9, 0.91, 0.93, 1];
const GHOSTED_PRESET_OPACITY = 0.35;

function hasOwn(object, key) {
  return Object.prototype.hasOwnProperty.call(object, key);
}

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
  let alphaProvided = false;

  if (Array.isArray(input)) {
    if (input.length < 3) {
      return null;
    }
    [r, g, b] = input;
    if (input.length > 3 && Number.isFinite(input[3])) {
      a = input[3];
      alphaProvided = true;
    }
  } else if (typeof input === "object") {
    if (!Number.isFinite(Number(input.r)) || !Number.isFinite(Number(input.g)) || !Number.isFinite(Number(input.b))) {
      return null;
    }
    r = Number(input.r);
    g = Number(input.g);
    b = Number(input.b);
    if (Number.isFinite(Number(input.opacity))) {
      a = Number(input.opacity);
      alphaProvided = true;
    } else if (Number.isFinite(Number(input.a))) {
      a = Number(input.a);
      alphaProvided = true;
    }
  } else {
    return null;
  }

  const scale = Math.max(
    Math.abs(r),
    Math.abs(g),
    Math.abs(b),
    alphaProvided ? Math.abs(a) : 0,
  ) > 1 ? 255 : 1;
  const normalize = (value) => {
    const v = value / scale;
    return Math.min(1, Math.max(0, v));
  };

  return [normalize(r), normalize(g), normalize(b), alphaProvided ? normalize(a) : 1];
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

function normalizeLegacyFace(range, index) {
  const firstIndex = Number.isFinite(range?.firstIndex)
    ? range.firstIndex
    : Number.isFinite(range?.first)
      ? range.first
      : 0;
  const lastIndex = Number.isFinite(range?.lastIndex)
    ? range.lastIndex
    : Number.isFinite(range?.last)
      ? range.last
      : firstIndex;

  return {
    id: range?.id ?? index,
    name: typeof range?.name === "string" ? range.name : "",
    firstIndex,
    indexCount: Number.isFinite(range?.indexCount)
      ? range.indexCount
      : Math.max(0, lastIndex - firstIndex + 1),
    edgeIndices: toArray(range?.edgeIndices),
    color: normalizeColor(range?.color),
  };
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
    return source.map((range, index) => normalizeLegacyFace(range, index));
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

  const positions = toArray(mesh?.positions ?? mesh?.attributes?.position?.array);

  return mesh.edges.map((edge, index) => {
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
    const positionIndices = source.filter((positionIndex) => Number.isInteger(positionIndex) && positionIndex >= 0);
    const points = [];
    for (const positionIndex of positionIndices) {
      const base = positionIndex * 3;
      if (base + 2 >= positions.length) {
        continue;
      }
      points.push(positions[base], positions[base + 1], positions[base + 2]);
    }
    return {
      id: edge.id ?? index,
      name: typeof edge.name === "string" ? edge.name : "",
      points,
      ownerFaceIds: toArray(edge.ownerFaceIds ?? edge.faceIds),
      isFreeEdge: edge.isFreeEdge ?? false,
      color: normalizeColor(edge.color),
    };
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

function resolveEffectiveAppearance(importParams) {
  if (!importParams || typeof importParams !== "object") {
    return { colorMode: undefined, defaultColor: undefined, defaultOpacity: undefined };
  }

  const appearancePreset = typeof importParams.appearancePreset === "string"
    ? importParams.appearancePreset.trim().toLowerCase()
    : undefined;
  const presetDefaults = appearancePreset === "cad-ghosted"
    ? { colorMode: "default", defaultOpacity: GHOSTED_PRESET_OPACITY }
    : appearancePreset === "cad-solid"
      ? { colorMode: "default" }
      : {};

  const colorMode = typeof importParams.colorMode === "string"
    ? importParams.colorMode
    : presetDefaults.colorMode;
  const defaultColor = hasOwn(importParams, "defaultColor")
    ? importParams.defaultColor
    : undefined;
  const defaultOpacity = hasOwn(importParams, "defaultOpacity")
    ? importParams.defaultOpacity
    : presetDefaults.defaultOpacity;

  return { colorMode, defaultColor, defaultOpacity };
}

function resolveFallbackMaterialColor(importParams) {
  const effectiveAppearance = resolveEffectiveAppearance(importParams);
  const hasAppearanceContext = effectiveAppearance.colorMode !== undefined
    || (importParams
      && typeof importParams === "object"
      && (hasOwn(importParams, "readColors") || hasOwn(importParams, "appearancePreset")));

  if (!hasAppearanceContext) {
    return DEFAULT_CAD_BASE_COLOR.slice();
  }

  if (effectiveAppearance.colorMode === "default") {
    const fallback = normalizeColor(effectiveAppearance.defaultColor) ?? DEFAULT_CAD_BASE_COLOR.slice();
    if (Number.isFinite(Number(effectiveAppearance.defaultOpacity))) {
      fallback[3] = Math.min(1, Math.max(0, Number(effectiveAppearance.defaultOpacity)));
    }
    return fallback;
  }

  return null;
}

function normalizeMaterials(raw, geometries, options = {}) {
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
    const fallback = resolveFallbackMaterialColor(options.importParams);
    if (fallback) {
      unique.set(colorKey(fallback), {
        id: "mat_0",
        baseColor: fallback,
      });
    }
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

function normalizeResultSourceFormat(sourceFormat) {
  if (typeof sourceFormat === "string" && sourceFormat.trim().toLowerCase() === GENERATED_TOOL_SOURCE_FORMAT) {
    return GENERATED_TOOL_SOURCE_FORMAT;
  }
  return normalizeOcctFormat(sourceFormat);
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
  const { materials, keyToMaterialId } = normalizeMaterials(rawResult, geometries, options);
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
  const sourceFormat = normalizeResultSourceFormat(options.sourceFormat ?? rawResult.sourceFormat ?? "step");

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
  stats.materialCount = materials.length;

  const result = {
    sourceFormat,
    sourceFileName: options.sourceFileName,
    rootNodes,
    geometries,
    materials,
    warnings,
    stats,
  };

  if (typeof rawResult.sourceUnit === "string" && rawResult.sourceUnit.length > 0) {
    result.sourceUnit = rawResult.sourceUnit;
  }
  if (Number.isFinite(rawResult.unitScaleToMeters) && rawResult.unitScaleToMeters > 0) {
    result.unitScaleToMeters = rawResult.unitScaleToMeters;
  }

  return result;
}
