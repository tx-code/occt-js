import { TransformNode } from "@babylonjs/core/Meshes/transformNode.js";
import { Mesh } from "@babylonjs/core/Meshes/mesh.js";
import { VertexData } from "@babylonjs/core/Meshes/mesh.vertexData.js";
import { Matrix, Quaternion, Vector3 } from "@babylonjs/core/Maths/math.vector.js";
import {
  createCadPartMaterial,
  resolveShadingNormals,
} from "@tx-code/occt-babylon-viewer";

const OCCT_ROOT_NAME = "__OCCT_ROOT__";
const IDENTITY_MATRIX = [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1];

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

function toGeometryMap(model) {
  return new Map((model.geometries ?? []).map((geometry) => [geometry.id, geometry]));
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

function applyGeometry(mesh, geometry) {
  if (!geometry) {
    return;
  }

  const positions = new Float32Array(geometry.positions ?? []);
  const indices = new Uint32Array(geometry.indices ?? []);
  const vertexData = new VertexData();
  vertexData.positions = positions;
  vertexData.indices = indices;
  vertexData.normals = resolveShadingNormals(
    positions,
    indices,
    Array.isArray(geometry.normals) ? geometry.normals : [],
    { mode: "recompute" },
  );
  vertexData.applyToMesh(mesh);
}

function buildPartMeshes(nodeDto, parent, scene, geometryMap, materialMap, geometryInstanceCache, outMeshes) {
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
    applyGeometry(mesh, geometry);
    if (materialId && materialMap.has(materialId)) {
      mesh.material = materialMap.get(materialId);
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

function buildNode(nodeDto, parent, scene, geometryMap, materialMap, geometryInstanceCache, outMeshes, outTransformNodes) {
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
      buildNode(child, transformNode, scene, geometryMap, materialMap, geometryInstanceCache, outMeshes, outTransformNodes);
    }
    return;
  }

  buildPartMeshes(nodeDto, parent, scene, geometryMap, materialMap, geometryInstanceCache, outMeshes);
}

export function buildOcctScene(model, scene, options = {}) {
  const createRootNode = options.createRootNode ?? true;
  const meshes = [];
  const transformNodes = [];

  const geometryMap = toGeometryMap(model);
  const materialMap = toMaterialMap(model, scene);
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
    buildNode(root, rootNode, scene, geometryMap, materialMap, geometryInstanceCache, meshes, transformNodes);
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
