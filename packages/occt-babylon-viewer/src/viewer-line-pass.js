import { Mesh } from "@babylonjs/core/Meshes/mesh.js";
import { VertexData } from "@babylonjs/core/Meshes/mesh.vertexData.js";
import { normalizeLinePassBatches } from "./viewer-line-pass-batch.js";
import { buildLinePassMeshData } from "./viewer-line-pass-mesh.js";
import { createLinePassMaterial } from "./viewer-line-pass-material.js";

function disposeLayerMesh(meshesByLayer, layer) {
  const mesh = meshesByLayer.get(layer);
  if (!mesh || mesh.isDisposed?.()) {
    meshesByLayer.delete(layer);
    return;
  }

  mesh.material?.dispose?.();
  mesh.dispose(false, true);
  meshesByLayer.delete(layer);
}

function applyMeshDataToLayerMesh(mesh, meshData) {
  const vertexData = new VertexData();
  vertexData.positions = meshData.positions;
  vertexData.indices = meshData.indices;
  vertexData.applyToMesh(mesh, true);
  mesh.setVerticesData("nextPosition", meshData.nextPositions, true, 3);
  mesh.setVerticesData("sideFlag", meshData.sideFlags, true, 1);
  mesh.setVerticesData("along", meshData.alongFactors, true, 1);
  mesh.setVerticesData("color", meshData.segmentColors, true, 4);
  mesh.setVerticesData("dashPeriod", meshData.segmentDashPeriods, true, 1);
  mesh.setVerticesData("lineWidth", meshData.segmentWidths, true, 1);
}

function countDashedSegments(meshData) {
  let dashedVertexCount = 0;
  for (const value of meshData.segmentDashPeriods) {
    if (value > 0) {
      dashedVertexCount += 1;
    }
  }
  return dashedVertexCount / 4;
}

function normalizeLayerStyle(style) {
  return {
    mode: style?.mode === "halo" ? "halo" : "base",
    widthScale: typeof style?.widthScale === "number" ? style.widthScale : 1,
    capExtension: typeof style?.capExtension === "number" ? style.capExtension : 0,
    haloInnerCutoff: typeof style?.haloInnerCutoff === "number" ? style.haloInnerCutoff : 0.5,
    alphaScale: typeof style?.alphaScale === "number" ? style.alphaScale : 1,
    blending: style?.blending === true,
    depthFunction: style?.depthFunction === "always" ? "always" : "lequal",
    zOffset: typeof style?.zOffset === "number" ? style.zOffset : -1,
    zOffsetUnits: typeof style?.zOffsetUnits === "number" ? style.zOffsetUnits : -2,
    renderingGroupId: Number.isInteger(style?.renderingGroupId) ? style.renderingGroupId : 0,
    alphaIndex: Number.isFinite(style?.alphaIndex) ? style.alphaIndex : 0,
  };
}

export function createViewerLinePass(scene, options = {}) {
  if (!scene) {
    throw new TypeError("createViewerLinePass requires a Babylon scene");
  }

  const meshesByLayer = new Map();
  let activeTheme = options.theme === "light" ? "light" : "dark";
  const diagnostics = {
    batchCount: 0,
    segmentCount: 0,
    droppedBatchCount: 0,
    droppedSegmentCount: 0,
    linePassEnabled: true,
    lastError: null,
  };

  const layerStyles = options.layerStyles && typeof options.layerStyles === "object"
    ? options.layerStyles
    : {};

  function resolveLayerStyle(layer) {
    return normalizeLayerStyle(layerStyles[layer] ?? null);
  }

  function ensureLayerMesh(layer, meshData) {
    const layerStyle = resolveLayerStyle(layer);
    let mesh = meshesByLayer.get(layer);
    if (!mesh || mesh.isDisposed?.()) {
      mesh = new Mesh(`line_pass_${layer}`, scene);
      mesh.material = createLinePassMaterial(scene, activeTheme, layerStyle);
      mesh.alwaysSelectAsActiveMesh = true;
      mesh.isPickable = false;
      mesh.renderingGroupId = layerStyle.renderingGroupId;
      mesh.alphaIndex = layerStyle.alphaIndex;
      meshesByLayer.set(layer, mesh);
    }

    applyMeshDataToLayerMesh(mesh, meshData);
    const dashedSegments = countDashedSegments(meshData);
    mesh.metadata = {
      occtLinePassManaged: true,
      occtLinePassLayer: layer,
      occtLinePassStats: {
        visibleSegments: meshData.visibleSegmentCount,
        dashedSegments,
        solidSegments: meshData.visibleSegmentCount - dashedSegments,
      },
      occtLinePassStyle: layerStyle,
    };
    return mesh;
  }

  return {
    updateBatches(inputs = []) {
      try {
        const batches = normalizeLinePassBatches(inputs);
        diagnostics.batchCount = batches.length;
        diagnostics.segmentCount = 0;
        diagnostics.lastError = null;

        const groupedByLayer = new Map();
        for (const batch of batches) {
          const layerItems = groupedByLayer.get(batch.layer) ?? [];
          layerItems.push(batch);
          groupedByLayer.set(batch.layer, layerItems);
        }

        for (const layer of [...meshesByLayer.keys()]) {
          if (!groupedByLayer.has(layer)) {
            disposeLayerMesh(meshesByLayer, layer);
          }
        }

        for (const [layer, layerBatches] of groupedByLayer) {
          const meshData = buildLinePassMeshData(layerBatches);
          diagnostics.segmentCount += meshData.visibleSegmentCount;
          ensureLayerMesh(layer, meshData);
        }
      } catch (error) {
        diagnostics.lastError = error instanceof Error ? error.message : String(error);
        throw error;
      }
    },
    setTheme(theme) {
      activeTheme = theme === "light" ? "light" : "dark";
      for (const [layer, mesh] of meshesByLayer.entries()) {
        const layerStyle = resolveLayerStyle(layer);
        mesh.material?.dispose?.();
        mesh.material = createLinePassMaterial(scene, activeTheme, layerStyle);
        mesh.renderingGroupId = layerStyle.renderingGroupId;
        mesh.alphaIndex = layerStyle.alphaIndex;
      }
    },
    setVisible(layer, visible) {
      const mesh = meshesByLayer.get(layer);
      if (mesh) {
        mesh.isVisible = visible;
      }
    },
    getDiagnostics() {
      return { ...diagnostics };
    },
    dispose() {
      for (const layer of [...meshesByLayer.keys()]) {
        disposeLayerMesh(meshesByLayer, layer);
      }
    },
  };
}
