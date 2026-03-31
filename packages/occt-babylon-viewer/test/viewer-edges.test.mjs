import test from "node:test";
import assert from "node:assert/strict";
import { buildOcctEdgeLinePassBatch } from "../src/index.js";

function createSimpleGeometry() {
  return {
    positions: [0, 0, 0, 20, 0, 0, 0, 10, 0],
    edges: [
      { points: [0, 0, 0, 20, 0, 0] },
      { points: [0, 0, 0, 0, 10, 0] },
    ],
  };
}

test("buildOcctEdgeLinePassBatch converts OCCT edge polylines into a CAD edge batch", () => {
  const batch = buildOcctEdgeLinePassBatch(createSimpleGeometry(), { theme: "dark" });

  assert.ok(batch);
  assert.equal(batch.layer, "cad-edges");
  assert.equal(batch.width > 0, true);
  assert.equal(batch.points.length, 12);
  assert.deepEqual(Array.from(batch.segmentDashPeriods), [0, 0]);
});
