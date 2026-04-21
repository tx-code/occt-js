import test from "node:test";
import assert from "node:assert/strict";
import { loadOcctFactory } from "./load_occt_factory.mjs";

const factory = loadOcctFactory();

async function createModule() {
  return factory();
}

function createRoundedPrismSpec() {
  return {
    version: 1,
    units: "mm",
    profile: {
      start: [0, 0],
      segments: [
        { kind: "line", id: "base", tag: "base", end: [4, 0] },
        { kind: "line", id: "right-wall", tag: "wall", end: [4, 2] },
        { kind: "arc_center", id: "arc-wall", tag: "curved", center: [2, 2], end: [0, 2] },
        { kind: "line", id: "left-wall", tag: "wall", end: [0, 0] },
      ],
    },
    extrusion: {
      depth: 6,
    },
  };
}

function assertCanonicalGeneratedResult(result, label) {
  assert.ok(result && typeof result === "object", `${label}: result should be an object`);
  assert.equal(result.success, true, `${label}: success should be true`);
  assert.equal(result.sourceFormat, "generated-extruded-shape", `${label}: sourceFormat should be canonical`);
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

test("BuildExtrudedShape builds a mixed line-and-arc profile into a canonical generated scene payload", async () => {
  const module = await createModule();
  const spec = createRoundedPrismSpec();
  const result = module.BuildExtrudedShape(spec, {});

  assertCanonicalGeneratedResult(result, "mixed extruded prism");
  assert.equal(result.rootNodes.length, 1, "mixed extruded prism: one root node expected");
  assert.equal(result.geometries.length, 1, "mixed extruded prism: one geometry expected");
  assert.ok(result.materials.length > 0, "mixed extruded prism: materials should not be empty");
  assert.ok(result.stats.triangleCount > 0, "mixed extruded prism: triangle count should be positive");
  assert.ok(result.extrudedShape && typeof result.extrudedShape === "object", "mixed extruded prism: extrudedShape metadata should exist");
  assert.equal(result.extrudedShape.version, 1);
  assert.equal(result.extrudedShape.units, spec.units);
  assert.equal(result.extrudedShape.depth, spec.extrusion.depth);
  assert.equal(result.extrudedShape.segmentCount, spec.profile.segments.length);
  validateTopology(result.geometries[0], "mixed extruded prism");
});
