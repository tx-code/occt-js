import { TransformNode } from "@babylonjs/core/Meshes/transformNode.js";
import { Mesh } from "@babylonjs/core/Meshes/mesh.js";
import { VertexData } from "@babylonjs/core/Meshes/mesh.vertexData.js";
import { Matrix, Quaternion, Vector3 } from "@babylonjs/core/Maths/math.vector.js";
import {
  createCadPartMaterial,
  createCadVertexColorMaterial,
  resolveShadingNormals,
} from "@tx-code/occt-babylon-viewer";

const OCCT_ROOT_NAME = "__OCCT_ROOT__";
const IDENTITY_MATRIX = [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1];
const DEFAULT_CAD_COLOR = [0.9, 0.91, 0.93, 1];

function applyTransform(node, transform) {
  if (!Array.isArray(transform) || transform.length !== 16) {
    return;
  }

  const matrix = Matrix.FromArray(transform);
  const scaling = new Vector3();
  const rotation = Quaternion.Identity();
  const position = new Vector3();
  matrix.decompose(scaling, rotation, position);

  node.position.copyFrom(position);
  node.scaling.copyFrom(scaling);
  node.rotationQuaternion = rotation;
}

function toMaterialMap(model, scene) {
  const materialMap = new Map();
  for (const materialDto of model.materials ?? []) {
    const color = materialDto.baseColor ?? [0.9, 0.91, 0.93, 1];
    const material = createCadPartMaterial(scene, materialDto.id, {
      b: color[2],
      g: color[1],
      r: color[0],
    });
    materialMap.set(materialDto.id, material);
  }
  return materialMap;
}

function toMaterialColorMap(model) {
  const materialColorMap = new Map();
  for (const materialDto of model.materials ?? []) {
    materialColorMap.set(materialDto.id, normalizeColor(materialDto.baseColor, DEFAULT_CAD_COLOR));
  }
  return materialColorMap;
}

function toGeometryMap(model) {
  return new Map((model.geometries ?? []).map((geometry) => [geometry.id, geometry]));
}

function clamp01(value) {
  if (!Number.isFinite(Number(value))) {
    return 0;
  }
  return Math.max(0, Math.min(1, Number(value)));
}

function normalizeColor(color, fallback = DEFAULT_CAD_COLOR) {
  if (!Array.isArray(color) || color.length < 3) {
    return fallback.slice();
  }
  return [
    clamp01(color[0]),
    clamp01(color[1]),
    clamp01(color[2]),
    color.length > 3 ? clamp01(color[3]) : 1,
  ];
}

function colorKey(color) {
  const normalized = normalizeColor(color, DEFAULT_CAD_COLOR);
  return normalized
    .slice(0, 4)
    .map((component) => Math.round(component * 255))
    .join(",");
}

function hasFaceColors(geometry) {
  return Array.isArray(geometry?.faces) && geometry.faces.some((face) => Array.isArray(face?.color) && face.color.length >= 3);
}

function resolveGeometryFallbackColor(geometry, materialId, materialColorMap) {
  if (materialId && materialColorMap.has(materialId)) {
    return materialColorMap.get(materialId);
  }
  if (Array.isArray(geometry?.color) && geometry.color.length >= 3) {
    return normalizeColor(geometry.color, DEFAULT_CAD_COLOR);
  }
  return DEFAULT_CAD_COLOR.slice();
}

function buildRenderableGeometry(geometry, fallbackColor) {
  const positions = new Float32Array(geometry?.positions ?? []);
  const indices = new Uint32Array(geometry?.indices ?? []);
  const normals = resolveShadingNormals(
    positions,
    indices,
    Array.isArray(geometry?.normals) ? geometry.normals : [],
    { mode: "recompute" },
  );

  if (!hasFaceColors(geometry) || indices.length === 0) {
    return {
      positions,
      indices,
      normals,
      colors: null,
      usesVertexColors: false,
    };
  }

  const indexColors = new Array(indices.length);
  for (const face of geometry.faces ?? []) {
    if (!face || !Number.isFinite(face.firstIndex) || !Number.isFinite(face.indexCount) || face.indexCount <= 0) {
      continue;
    }
    const faceColor = normalizeColor(face.color, fallbackColor);
    const start = Math.max(0, face.firstIndex | 0);
    const end = Math.min(indices.length, start + (face.indexCount | 0));
    for (let indexOffset = start; indexOffset < end; indexOffset += 1) {
      indexColors[indexOffset] = faceColor;
    }
  }

  const expandedPositions = new Float32Array(indices.length * 3);
  const expandedNormals = new Float32Array(indices.length * 3);
  const expandedColors = new Float32Array(indices.length * 4);
  const expandedIndices = new Uint32Array(indices.length);

  for (let indexOffset = 0; indexOffset < indices.length; indexOffset += 1) {
    const sourceIndex = indices[indexOffset] | 0;
    const sourceBase = sourceIndex * 3;
    const targetBase = indexOffset * 3;
    const colorBase = indexOffset * 4;
    expandedIndices[indexOffset] = indexOffset;

    expandedPositions[targetBase] = positions[sourceBase] ?? 0;
    expandedPositions[targetBase + 1] = positions[sourceBase + 1] ?? 0;
    expandedPositions[targetBase + 2] = positions[sourceBase + 2] ?? 0;

    expandedNormals[targetBase] = normals[sourceBase] ?? 0;
    expandedNormals[targetBase + 1] = normals[sourceBase + 1] ?? 0;
    expandedNormals[targetBase + 2] = normals[sourceBase + 2] ?? 1;

    const color = indexColors[indexOffset] ?? fallbackColor;
    expandedColors[colorBase] = color[0];
    expandedColors[colorBase + 1] = color[1];
    expandedColors[colorBase + 2] = color[2];
    expandedColors[colorBase + 3] = 1;
  }

  return {
    positions: expandedPositions,
    indices: expandedIndices,
    normals: expandedNormals,
    colors: expandedColors,
    usesVertexColors: true,
  };
}

function resolveMaterialId(nodeDto, index, materialMap) {
  const materialIds = Array.isArray(nodeDto.materialIds) ? nodeDto.materialIds : [];
  const candidate = materialIds[index] ?? materialIds[0];
  if (candidate && materialMap.has(candidate)) {
    return candidate;
  }

  const first = materialMap.keys().next().value;
  return typeof first === "string" ? first : undefined;
}

function applyGeometry(mesh, geometry, fallbackColor) {
  if (!geometry) {
    return { usesVertexColors: false };
  }

  const renderable = buildRenderableGeometry(geometry, fallbackColor);
  const vertexData = new VertexData();
  vertexData.positions = renderable.positions;
  vertexData.indices = renderable.indices;
  vertexData.normals = renderable.normals;
  if (renderable.colors) {
    vertexData.colors = renderable.colors;
  }
  vertexData.applyToMesh(mesh);
  mesh.useVertexColors = renderable.usesVertexColors;
  mesh.hasVertexAlpha = false;
  return renderable;
}

function resolveDisplayMaterial(scene, geometry, materialId, materialMap, materialColorMap, vertexColorMaterialCache) {
  if (hasFaceColors(geometry)) {
    const fallbackColor = resolveGeometryFallbackColor(geometry, materialId, materialColorMap);
    const cacheKey = colorKey(fallbackColor);
    if (!vertexColorMaterialCache.has(cacheKey)) {
      vertexColorMaterialCache.set(cacheKey, createCadVertexColorMaterial(scene, `occt_vcolor_${cacheKey}`, {
        fallbackColor: {
          r: fallbackColor[0],
          g: fallbackColor[1],
          b: fallbackColor[2],
        },
      }));
    }
    return vertexColorMaterialCache.get(cacheKey);
  }

  if (materialId && materialMap.has(materialId)) {
    return materialMap.get(materialId);
  }

  return null;
}

function buildPartMeshes(nodeDto, parent, scene, geometryMap, materialMap, materialColorMap, vertexColorMaterialCache, geometryInstanceCache, outMeshes) {
  const geometryIds = Array.isArray(nodeDto.geometryIds) ? nodeDto.geometryIds : [];
  if (geometryIds.length === 0) {
    const emptyMesh = new Mesh(nodeDto.name ?? `occt_part_${nodeDto.id}`, scene);
    if (parent) {
      emptyMesh.parent = parent;
    }
    applyTransform(emptyMesh, nodeDto.transform);
    outMeshes.push(emptyMesh);
    return;
  }

  for (let i = 0; i < geometryIds.length; i++) {
    const geometryId = geometryIds[i];
    const geometry = geometryMap.get(geometryId);
    const materialId = resolveMaterialId(nodeDto, i, materialMap);
    const fallbackColor = resolveGeometryFallbackColor(geometry, materialId, materialColorMap);
    const cacheKey = `${geometryId}|${materialId ?? ""}`;
    const meshName = i === 0
      ? nodeDto.name ?? `occt_part_${nodeDto.id}`
      : `${nodeDto.name ?? `occt_part_${nodeDto.id}`}_sub${i}`;

    if (geometryInstanceCache.has(cacheKey)) {
      const sourceMesh = geometryInstanceCache.get(cacheKey);
      const instance = sourceMesh.createInstance(meshName);
      if (parent) {
        instance.parent = parent;
      }
      applyTransform(instance, nodeDto.transform);
      instance.metadata = {
        occt: {
          nodeId: nodeDto.id,
          kind: nodeDto.kind,
          geometryId,
          source: "occt-core",
        },
      };
      outMeshes.push(instance);
      continue;
    }

    const mesh = new Mesh(meshName, scene);
    if (parent) {
      mesh.parent = parent;
    }
    applyTransform(mesh, nodeDto.transform);
    applyGeometry(mesh, geometry, fallbackColor);
    const displayMaterial = resolveDisplayMaterial(
      scene,
      geometry,
      materialId,
      materialMap,
      materialColorMap,
      vertexColorMaterialCache,
    );
    if (displayMaterial) {
      mesh.material = displayMaterial;
    }
    mesh.metadata = {
      occt: {
        nodeId: nodeDto.id,
        kind: nodeDto.kind,
        geometryId,
        source: "occt-core",
      },
    };

    geometryInstanceCache.set(cacheKey, mesh);
    outMeshes.push(mesh);
  }
}

function buildNode(nodeDto, parent, scene, geometryMap, materialMap, materialColorMap, vertexColorMaterialCache, geometryInstanceCache, outMeshes, outTransformNodes) {
  if (nodeDto.kind === "assembly") {
    const transformNode = new TransformNode(nodeDto.name ?? `occt_assembly_${nodeDto.id}`, scene);
    if (parent) {
      transformNode.parent = parent;
    }
    applyTransform(transformNode, nodeDto.transform);
    transformNode.metadata = {
      occt: {
        nodeId: nodeDto.id,
        kind: nodeDto.kind,
        source: "occt-core",
      },
    };
    outTransformNodes.push(transformNode);

    for (const child of nodeDto.children ?? []) {
      buildNode(child, transformNode, scene, geometryMap, materialMap, materialColorMap, vertexColorMaterialCache, geometryInstanceCache, outMeshes, outTransformNodes);
    }
    return;
  }

  buildPartMeshes(nodeDto, parent, scene, geometryMap, materialMap, materialColorMap, vertexColorMaterialCache, geometryInstanceCache, outMeshes);
}

export function buildOcctScene(model, scene, options = {}) {
  const createRootNode = options.createRootNode ?? true;
  const meshes = [];
  const transformNodes = [];

  const geometryMap = toGeometryMap(model);
  const materialMap = toMaterialMap(model, scene);
  const materialColorMap = toMaterialColorMap(model);
  const vertexColorMaterialCache = new Map();
  const geometryInstanceCache = new Map();

  let rootNode = null;
  if (createRootNode) {
    rootNode = new TransformNode(OCCT_ROOT_NAME, scene);
    applyTransform(rootNode, IDENTITY_MATRIX);
    rootNode.metadata = {
      occt: {
        sourceFormat: model.sourceFormat,
        stats: model.stats,
        warnings: model.warnings,
      },
    };
    transformNodes.push(rootNode);
  }

  for (const root of model.rootNodes ?? []) {
    buildNode(root, rootNode, scene, geometryMap, materialMap, materialColorMap, vertexColorMaterialCache, geometryInstanceCache, meshes, transformNodes);
  }

  return {
    meshes,
    particleSystems: [],
    skeletons: [],
    animationGroups: [],
    transformNodes,
    geometries: [],
    lights: [],
    spriteManagers: [],
  };
}
