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

  function ensureLayerMesh(layer, meshData) {
    let mesh = meshesByLayer.get(layer);
    if (!mesh || mesh.isDisposed?.()) {
      mesh = new Mesh(`line_pass_${layer}`, scene);
      mesh.material = createLinePassMaterial(scene, activeTheme);
      mesh.alwaysSelectAsActiveMesh = true;
      mesh.isPickable = false;
      mesh.renderingGroupId = 1;
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
      for (const mesh of meshesByLayer.values()) {
        mesh.material?.dispose?.();
        mesh.material = createLinePassMaterial(scene, activeTheme);
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
