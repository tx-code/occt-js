import test from "node:test";
import assert from "node:assert/strict";
import { loadOcctFactory } from "./load_occt_factory.mjs";

const factory = loadOcctFactory();

async function createModule() {
  return factory();
}

function createCompositeSpec() {
  return {
    version: 1,
    units: "mm",
    seed: {
      family: "revolved",
      spec: {
        version: 1,
        units: "mm",
        profile: {
          plane: "XZ",
          start: [0, 0],
          closure: "explicit",
          segments: [
            { kind: "line", id: "tip", tag: "tip", end: [3, 0] },
            { kind: "line", id: "body", tag: "cutting", end: [3, 16] },
            { kind: "line", id: "axis-top", tag: "closure", end: [0, 16] },
            { kind: "line", id: "axis-bottom", tag: "closure", end: [0, 0] },
          ],
        },
        revolve: {
          angleDeg: 360,
        },
      },
    },
    steps: [
      {
        op: "cut",
        operand: {
          family: "helical-sweep",
          spec: {
            version: 1,
            units: "mm",
            helix: {
              radius: 2.2,
              pitch: 1,
              turns: 12,
              handedness: "right",
            },
            section: {
              kind: "circle",
              radius: 0.45,
              segments: 20,
            },
          },
        },
      },
      {
        op: "fuse",
        operand: {
          family: "extruded",
          spec: {
            version: 1,
            units: "mm",
            profile: {
              version: 1,
              start: [0, 0],
              segments: [
                { kind: "line", end: [2.5, 0] },
                { kind: "line", end: [2.5, 2] },
                { kind: "line", end: [0, 2] },
                { kind: "line", end: [0, 0] },
              ],
            },
            extrusion: {
              depth: 6,
            },
          },
          transform: [
            1, 0, 0, 0,
            0, 1, 0, 0,
            0, 0, 1, 0,
            0, 0, 16, 1,
          ],
        },
      },
    ],
  };
}

function assertCanonicalGeneratedResult(result, label) {
  assert.ok(result && typeof result === "object", `${label}: result should be an object`);
  assert.equal(result.success, true, `${label}: success should be true`);
  assert.equal(result.sourceFormat, "generated-composite-shape", `${label}: sourceFormat should be canonical`);
  assert.ok(Array.isArray(result.rootNodes), `${label}: rootNodes should be an array`);
  assert.ok(Array.isArray(result.geometries), `${label}: geometries should be an array`);
  assert.ok(Array.isArray(result.materials), `${label}: materials should be an array`);
  assert.ok(Array.isArray(result.warnings), `${label}: warnings should be an array`);
  assert.ok(result.stats && typeof result.stats === "object", `${label}: stats should be an object`);
  assert.equal(result.stats.rootCount, result.rootNodes.length, `${label}: stats.rootCount parity`);
  assert.equal(result.stats.geometryCount, result.geometries.length, `${label}: stats.geometryCount parity`);
  assert.equal(result.stats.materialCount, result.materials.length, `${label}: stats.materialCount parity`);
}

function validateTopology(geometry, label) {
  assert.ok(geometry.positions.length > 0, `${label}: positions should not be empty`);
  assert.ok(geometry.normals.length > 0, `${label}: normals should not be empty`);
  assert.ok(geometry.indices.length > 0, `${label}: indices should not be empty`);
  assert.equal(geometry.positions.length % 3, 0, `${label}: positions should be XYZ triplets`);
  assert.equal(geometry.normals.length % 3, 0, `${label}: normals should be XYZ triplets`);
  assert.equal(geometry.indices.length % 3, 0, `${label}: indices should be triangles`);
  assert.equal(geometry.triangleToFaceMap.length, geometry.indices.length / 3, `${label}: triangleToFaceMap parity`);
}

test("BuildCompositeShape builds a canonical generated scene payload for a generic operation pipeline", async () => {
  const module = await createModule();
  const spec = createCompositeSpec();
  const result = module.BuildCompositeShape(spec, {});

  assertCanonicalGeneratedResult(result, "generated composite shape");
  assert.equal(result.rootNodes.length, 1, "generated composite shape: one root node expected");
  assert.equal(result.geometries.length, 1, "generated composite shape: one geometry expected");
  assert.ok(result.materials.length > 0, "generated composite shape: materials should not be empty");
  assert.ok(result.stats.triangleCount > 0, "generated composite shape: triangle count should be positive");
  assert.ok(result.compositeShape && typeof result.compositeShape === "object", "generated composite shape: metadata should exist");
  assert.equal(result.compositeShape.version, 1);
  assert.equal(result.compositeShape.units, spec.units);
  assert.equal(result.compositeShape.seedFamily, spec.seed.family);
  assert.equal(result.compositeShape.stepCount, spec.steps.length);
  assert.equal(Array.isArray(result.compositeShape.operations), true);
  assert.equal(result.compositeShape.operations.length, spec.steps.length);
  assert.equal(result.compositeShape.operations[0].op, "cut");
  assert.equal(result.compositeShape.operations[0].family, "helical-sweep");
  assert.equal(result.compositeShape.operations[1].op, "fuse");
  assert.equal(result.compositeShape.operations[1].family, "extruded");
  validateTopology(result.geometries[0], "generated composite shape");
});

test("BuildCompositeShape emits closed and watertight shape-validation metadata for a threadmill-like body", async () => {
  const module = await createModule();
  const result = module.BuildCompositeShape(createCompositeSpec(), {});

  assertCanonicalGeneratedResult(result, "generated composite shape validation");
  assert.ok(result.compositeShape?.shapeValidation, "generated composite shape validation: shape validation should be present");
  assert.equal(result.compositeShape.shapeValidation.exact.isValid, true, "generated composite shape validation: exact shape should validate");
  assert.equal(result.compositeShape.shapeValidation.exact.isSolid, true, "generated composite shape validation: exact shape should be solid");
  assert.equal(result.compositeShape.shapeValidation.exact.isClosed, true, "generated composite shape validation: exact shape should be closed");
  assert.equal(result.compositeShape.shapeValidation.mesh.isWatertight, true, "generated composite shape validation: mesh should be watertight");
  assert.equal(result.compositeShape.shapeValidation.mesh.isManifold, true, "generated composite shape validation: mesh should be manifold");
});
