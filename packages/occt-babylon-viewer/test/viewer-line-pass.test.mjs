import test from "node:test";
import assert from "node:assert/strict";
import { Scene } from "@babylonjs/core/scene.js";
import { NullEngine } from "@babylonjs/core/Engines/nullEngine.js";
import {
  normalizeLinePassBatch,
  normalizeLinePassBatches,
} from "../src/viewer-line-pass-batch.js";
import { buildLinePassMeshData } from "../src/viewer-line-pass-mesh.js";
import { createViewerLinePass } from "../src/viewer-line-pass.js";

test("normalizeLinePassBatch converts point triples into typed arrays and segment metadata", () => {
  const batch = normalizeLinePassBatch({
    id: "cad",
    layer: "cad-edges",
    points: [0, 0, 0, 10, 0, 0, 10, 5, 0],
    segmentColors: [
      0.1, 0.2, 0.3, 1.0,
      0.8, 0.7, 0.6, 1.0,
    ],
    segmentDashPeriods: [0, 6],
    breakSegmentIndices: [1],
    width: 2.5,
    depthBiasPerPixel: 1.0,
  });

  assert.equal(batch.id, "cad");
  assert.equal(batch.layer, "cad-edges");
  assert.equal(batch.pointCount, 3);
  assert.equal(batch.segmentCount, 2);
  assert.deepEqual(Array.from(batch.points), [0, 0, 0, 10, 0, 0, 10, 5, 0]);
  assert.deepEqual(Array.from(batch.segmentDashPeriods), [0, 6]);
  assert.deepEqual(Array.from(batch.breakSegmentIndices), [1]);
  assert.equal(batch.width, 2.5);
  assert.equal(batch.depthBiasPerPixel, 1.0);
});

test("normalizeLinePassBatch rejects mismatched segment arrays", () => {
  assert.throws(
    () => normalizeLinePassBatch({
      points: [0, 0, 0, 1, 0, 0, 2, 0, 0],
      segmentDashPeriods: [0],
    }),
    /segmentDashPeriods length/,
  );
});

test("normalizeLinePassBatches filters null entries and assigns stable fallback ids", () => {
  const batches = normalizeLinePassBatches([
    null,
    { layer: "cad-edges", points: [0, 0, 0, 1, 0, 0] },
    { layer: "toolpath", points: [0, 0, 0, 0, 1, 0] },
  ]);

  assert.equal(batches.length, 2);
  assert.equal(batches[0].id, "line-pass-batch-0");
  assert.equal(batches[1].id, "line-pass-batch-1");
});

test("buildLinePassMeshData skips segments marked by breakSegmentIndices", () => {
  const [batch] = normalizeLinePassBatches([{
    layer: "toolpath",
    points: [
      0, 0, 0,
      1, 0, 0,
      2, 0, 0,
      2, 1, 0,
    ],
    segmentDashPeriods: [0, 6, 0],
    breakSegmentIndices: [1],
  }]);

  const meshData = buildLinePassMeshData([batch]);

  assert.equal(meshData.visibleSegmentCount, 2);
  assert.deepEqual(Array.from(meshData.segmentDashPeriods), [0, 0, 0, 0, 0, 0, 0, 0]);
});

test("buildLinePassMeshData emits four vertices and six indices per visible segment", () => {
  const [batch] = normalizeLinePassBatches([{
    layer: "cad-edges",
    points: [0, 0, 0, 1, 0, 0, 1, 1, 0],
  }]);

  const meshData = buildLinePassMeshData([batch]);

  assert.equal(meshData.visibleSegmentCount, 2);
  assert.equal(meshData.positions.length, 2 * 4 * 3);
  assert.equal(meshData.indices.length, 2 * 6);
  assert.equal(meshData.segmentColors.length, 2 * 4 * 4);
});

test("buildLinePassMeshData emits along factors for segment start/end vertices", () => {
  const [batch] = normalizeLinePassBatches([{
    layer: "cad-edges",
    points: [0, 0, 0, 3, 0, 0],
  }]);

  const meshData = buildLinePassMeshData([batch]);

  assert.deepEqual(Array.from(meshData.sideFlags), [-1, 1, -1, 1]);
  assert.deepEqual(Array.from(meshData.alongFactors), [0, 0, 1, 1]);
  assert.deepEqual(Array.from(meshData.nextPositions), [3, 0, 0, 3, 0, 0, 3, 0, 0, 3, 0, 0]);
});

test("createViewerLinePass creates layer-backed meshes and toggles visibility", () => {
  const scene = new Scene(new NullEngine());
  const linePass = createViewerLinePass(scene, { theme: "dark" });

  linePass.updateBatches([{
    id: "cad",
    layer: "cad-edges",
    points: [0, 0, 0, 1, 0, 0],
  }]);

  const diagnostics = linePass.getDiagnostics();
  assert.equal(diagnostics.batchCount, 1);
  assert.equal(diagnostics.segmentCount, 1);

  const mesh = scene.meshes.find((candidate) => candidate.metadata?.occtLinePassLayer === "cad-edges");
  assert.ok(mesh);
  assert.equal(mesh.metadata.occtLinePassManaged, true);
  assert.equal(mesh.metadata.occtLinePassStats.visibleSegments, 1);
  assert.deepEqual(Array.from(mesh.getVerticesData("along")), [0, 0, 1, 1]);

  linePass.setVisible("cad-edges", false);
  assert.equal(mesh.isVisible, false);

  linePass.dispose();
  assert.equal(scene.meshes.filter((candidate) => candidate.metadata?.occtLinePassManaged).length, 0);
});

test("createViewerLinePass applies custom layer styles for highlight halo passes", () => {
  const scene = new Scene(new NullEngine());
  const linePass = createViewerLinePass(scene, {
    theme: "dark",
    layerStyles: {
      "cad-highlight-hover-visible": {
        mode: "halo",
        capExtension: 1.2,
        widthScale: 2.2,
        haloInnerCutoff: 0.6,
        blending: false,
        depthFunction: "lequal",
        renderingGroupId: 1,
        alphaIndex: 22,
      },
      "cad-highlight-hover-xray": {
        mode: "base",
        blending: true,
        depthFunction: "always",
        renderingGroupId: 1,
        alphaIndex: 23,
      },
    },
  });

  linePass.updateBatches([
    {
      id: "hover-visible",
      layer: "cad-highlight-hover-visible",
      points: [0, 0, 0, 1, 0, 0],
      segmentColors: [0, 0.8, 1, 0.9],
    },
    {
      id: "hover-xray",
      layer: "cad-highlight-hover-xray",
      points: [0, 0, 0, 1, 0, 0],
      segmentColors: [0, 0.8, 1, 0.45],
    },
  ]);

  const visibleMesh = scene.meshes.find((candidate) => candidate.metadata?.occtLinePassLayer === "cad-highlight-hover-visible");
  const xrayMesh = scene.meshes.find((candidate) => candidate.metadata?.occtLinePassLayer === "cad-highlight-hover-xray");
  assert.ok(visibleMesh);
  assert.ok(xrayMesh);
  assert.equal(visibleMesh.metadata.occtLinePassStyle.mode, "halo");
  assert.equal(visibleMesh.metadata.occtLinePassStyle.capExtension, 1.2);
  assert.equal(visibleMesh.metadata.occtLinePassStyle.widthScale, 2.2);
  assert.equal(visibleMesh.metadata.occtLinePassStyle.haloInnerCutoff, 0.6);
  assert.equal(visibleMesh.metadata.occtLinePassStyle.renderingGroupId, 1);
  assert.equal(visibleMesh.alphaIndex, 22);
  assert.equal(xrayMesh.metadata.occtLinePassStyle.depthFunction, "always");
  assert.equal(xrayMesh.alphaIndex, 23);

  linePass.dispose();
});
