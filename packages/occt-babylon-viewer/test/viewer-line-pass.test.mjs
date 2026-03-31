import test from "node:test";
import assert from "node:assert/strict";
import {
  normalizeLinePassBatch,
  normalizeLinePassBatches,
} from "../src/viewer-line-pass-batch.js";

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
