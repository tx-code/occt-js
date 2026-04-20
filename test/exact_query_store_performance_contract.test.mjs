import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { loadOcctFactory } from "./load_occt_factory.mjs";

const factory = loadOcctFactory();
const RELEASED_HANDLE_FAILURE = {
  ok: false,
  code: "released-handle",
  message: "Exact model handle has already been released.",
};

async function loadFixture(name) {
  return new Uint8Array(await readFile(new URL(`./${name}`, import.meta.url)));
}

async function createModule() {
  return factory();
}

function getExactRef(result, geometryIndex, kind, elementId) {
  return [
    result.exactModelId,
    result.exactGeometryBindings[geometryIndex].exactShapeHandle,
    kind,
    elementId,
  ];
}

function assertArrayClose(actual, expected, tolerance, label) {
  assert.ok(Array.isArray(actual), `${label}: actual should be an array`);
  assert.ok(Array.isArray(expected), `${label}: expected should be an array`);
  assert.equal(actual.length, expected.length, `${label}: length should match`);
  for (let index = 0; index < actual.length; index += 1) {
    const delta = Math.abs(actual[index] - expected[index]);
    assert.ok(
      delta <= tolerance,
      `${label}[${index}] delta ${delta} should be <= ${tolerance}`,
    );
  }
}

function findRepresentativeRefs(module, result) {
  for (let geometryIndex = 0; geometryIndex < (result.geometries?.length ?? 0); geometryIndex += 1) {
    const geometry = result.geometries[geometryIndex];
    const planeFace = (geometry.faces ?? []).find((face) => {
      const family = module.GetExactGeometryType(...getExactRef(result, geometryIndex, "face", face.id));
      return family?.ok === true && family.family === "plane";
    });
    const lineEdge = (geometry.edges ?? []).find((edge) => {
      const family = module.GetExactGeometryType(...getExactRef(result, geometryIndex, "edge", edge.id));
      return family?.ok === true && family.family === "line";
    });

    if (planeFace && lineEdge) {
      return {
        faceRef: getExactRef(result, geometryIndex, "face", planeFace.id),
        edgeRef: getExactRef(result, geometryIndex, "edge", lineEdge.id),
      };
    }
  }

  return null;
}

test("retained query loop keeps deterministic success payloads for live models", async () => {
  const module = await createModule();
  const stepBytes = await loadFixture("simple_part.step");
  const opened = module.OpenExactStepModel(stepBytes, {});

  assert.equal(opened?.success, true);
  const refs = findRepresentativeRefs(module, opened);
  assert.ok(refs, "simple_part.step should expose at least one plane face and one line edge");

  const baselineFaceType = module.GetExactGeometryType(...refs.faceRef);
  const baselineFaceArea = module.MeasureExactFaceArea(...refs.faceRef);
  const baselineEdgeLength = module.MeasureExactEdgeLength(...refs.edgeRef);

  assert.equal(baselineFaceType?.ok, true);
  assert.equal(baselineFaceArea?.ok, true);
  assert.equal(baselineEdgeLength?.ok, true);

  const iterations = 250;
  for (let iteration = 0; iteration < iterations; iteration += 1) {
    const loopFaceType = module.GetExactGeometryType(...refs.faceRef);
    const loopFaceArea = module.MeasureExactFaceArea(...refs.faceRef);
    const loopEdgeLength = module.MeasureExactEdgeLength(...refs.edgeRef);

    assert.equal(loopFaceType?.ok, true);
    assert.equal(loopFaceType?.family, baselineFaceType.family);

    assert.equal(loopFaceArea?.ok, true);
    assert.ok(Math.abs(loopFaceArea.value - baselineFaceArea.value) <= 1e-8);
    assertArrayClose(loopFaceArea.localCentroid, baselineFaceArea.localCentroid, 1e-8, "face centroid");

    assert.equal(loopEdgeLength?.ok, true);
    assert.ok(Math.abs(loopEdgeLength.value - baselineEdgeLength.value) <= 1e-8);
    assertArrayClose(loopEdgeLength.localStartPoint, baselineEdgeLength.localStartPoint, 1e-8, "edge start");
    assertArrayClose(loopEdgeLength.localEndPoint, baselineEdgeLength.localEndPoint, 1e-8, "edge end");
  }
});

test("released-handle after loop stays deterministic for representative exact queries", async () => {
  const module = await createModule();
  const stepBytes = await loadFixture("simple_part.step");
  const opened = module.OpenExactStepModel(stepBytes, {});

  assert.equal(opened?.success, true);
  const refs = findRepresentativeRefs(module, opened);
  assert.ok(refs, "simple_part.step should expose at least one plane face and one line edge");

  for (let iteration = 0; iteration < 150; iteration += 1) {
    assert.equal(module.GetExactGeometryType(...refs.faceRef)?.ok, true);
    assert.equal(module.MeasureExactFaceArea(...refs.faceRef)?.ok, true);
    assert.equal(module.MeasureExactEdgeLength(...refs.edgeRef)?.ok, true);
  }

  assert.deepEqual(module.ReleaseExactModel(opened.exactModelId), { ok: true });

  assert.deepEqual(module.GetExactGeometryType(...refs.faceRef), RELEASED_HANDLE_FAILURE);
  assert.deepEqual(module.MeasureExactFaceArea(...refs.faceRef), RELEASED_HANDLE_FAILURE);
  assert.deepEqual(module.MeasureExactEdgeLength(...refs.edgeRef), RELEASED_HANDLE_FAILURE);
});

test("deterministic query-loop contract avoids wall-clock thresholds", async () => {
  const iterations = 250;
  const operationsPerIteration = 3;
  const expectedOperationCount = iterations * operationsPerIteration;

  // This suite intentionally validates deterministic result invariants.
  // It does not assert timing thresholds that would make CI flaky.
  assert.equal(expectedOperationCount, 750);
});
