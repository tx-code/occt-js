import test from "node:test";
import assert from "node:assert/strict";
import { loadOcctFactory } from "./load_occt_factory.mjs";

const factory = loadOcctFactory();

async function createModule() {
  return factory();
}

function createHelicalSweepSpec() {
  return {
    version: 1,
    units: "mm",
    helix: {
      radius: 8,
      pitch: 3,
      turns: 4,
      handedness: "right",
    },
    section: {
      kind: "circle",
      radius: 0.8,
      segments: 24,
    },
  };
}

function createThreadLikePolylineSpec() {
  return {
    version: 1,
    units: "mm",
    helix: {
      radius: 8,
      pitch: 2,
      turns: 5,
      handedness: "right",
    },
    section: {
      kind: "polyline",
      points: [
        [0.0, -0.35],
        [0.5, 0.35],
        [1.0, -0.35],
      ],
    },
  };
}

function assertCanonicalGeneratedResult(result, label) {
  assert.ok(result && typeof result === "object", `${label}: result should be an object`);
  assert.equal(result.success, true, `${label}: success should be true`);
  assert.equal(result.sourceFormat, "generated-helical-sweep", `${label}: sourceFormat should be canonical`);
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

function assertStableFaceBindings(result, label) {
  const geometry = result.geometries[0];
  const faceIds = new Set((geometry.faces ?? []).map((face) => face.id));
  const faceBindings = result.helicalSweep?.faceBindings;
  const boundFaces = new Set();

  assert.equal(result.helicalSweep.hasStableFaceBindings, true, `${label}: stable face bindings should be enabled`);
  assert.ok(Array.isArray(faceBindings), `${label}: faceBindings should be an array`);
  assert.ok(faceBindings.length > 0, `${label}: faceBindings should not be empty`);
  assert.ok(
    geometry.faces.every((face) => face.color && typeof face.color.r === "number"),
    `${label}: generated faces should expose deterministic default colors`,
  );

  for (const binding of faceBindings) {
    assert.equal(binding.geometryIndex, 0, `${label}: generated helical sweeps currently bind against geometry 0`);
    assert.ok(faceIds.has(binding.faceId), `${label}: faceId should exist in emitted geometry`);
    const bindingKey = `${binding.geometryIndex}:${binding.faceId}`;
    assert.equal(boundFaces.has(bindingKey), false, `${label}: each face should resolve to at most one stable binding`);
    boundFaces.add(bindingKey);
    assert.ok(
      ["sweep", "start_cap", "end_cap"].includes(binding.systemRole),
      `${label}: systemRole should be a supported runtime role`,
    );
    assert.equal(binding.segmentIndex, undefined, `${label}: generic helical bindings should stay runtime-owned`);
    assert.equal(binding.segmentId, undefined, `${label}: generic helical bindings should stay runtime-owned`);
    assert.equal(binding.segmentTag, undefined, `${label}: generic helical bindings should stay runtime-owned`);
  }
}

test("BuildHelicalSweep builds a canonical generated scene payload for a generic circular-section helix", async () => {
  const module = await createModule();
  const spec = createHelicalSweepSpec();
  const result = module.BuildHelicalSweep(spec, {});

  assertCanonicalGeneratedResult(result, "generated helical sweep");
  assert.equal(result.rootNodes.length, 1, "generated helical sweep: one root node expected");
  assert.equal(result.geometries.length, 1, "generated helical sweep: one geometry expected");
  assert.ok(result.materials.length > 0, "generated helical sweep: materials should not be empty");
  assert.ok(result.stats.triangleCount > 0, "generated helical sweep: triangle count should be positive");
  assert.ok(result.helicalSweep && typeof result.helicalSweep === "object", "generated helical sweep: metadata should exist");
  assert.equal(result.helicalSweep.version, 1);
  assert.equal(result.helicalSweep.units, spec.units);
  assert.equal(result.helicalSweep.helixRadius, spec.helix.radius);
  assert.equal(result.helicalSweep.pitch, spec.helix.pitch);
  assert.equal(result.helicalSweep.turns, spec.helix.turns);
  assert.equal(result.helicalSweep.height, spec.helix.pitch * spec.helix.turns);
  assert.equal(result.helicalSweep.handedness, spec.helix.handedness);
  assert.equal(result.helicalSweep.sectionKind, spec.section.kind);
  assert.equal(result.helicalSweep.sectionRadius, spec.section.radius);
  validateTopology(result.geometries[0], "generated helical sweep");
});

test("BuildHelicalSweep emits stable face bindings and deterministic semantic colors for sweep and caps", async () => {
  const module = await createModule();
  const result = module.BuildHelicalSweep(createHelicalSweepSpec(), {});

  assertCanonicalGeneratedResult(result, "generated helical semantic metadata");
  assertStableFaceBindings(result, "generated helical semantic metadata");
  assert.ok(result.helicalSweep?.shapeValidation, "generated helical semantic metadata: shape validation should be present");
  assert.equal(result.helicalSweep.shapeValidation.exact.isValid, true, "generated helical semantic metadata: exact shape should validate");
  assert.equal(result.helicalSweep.shapeValidation.exact.isSolid, true, "generated helical semantic metadata: exact shape should be solid");
  assert.equal(result.helicalSweep.shapeValidation.exact.isClosed, true, "generated helical semantic metadata: exact shape should be closed");
  assert.equal(result.helicalSweep.shapeValidation.mesh.isWatertight, true, "generated helical semantic metadata: mesh should be watertight");

  const roleSet = new Set(result.helicalSweep.faceBindings.map((binding) => binding.systemRole));
  assert.ok(roleSet.has("sweep"), "generated helical semantic metadata: sweep binding should be present");
  assert.ok(roleSet.has("start_cap"), "generated helical semantic metadata: start_cap binding should be present");
  assert.ok(roleSet.has("end_cap"), "generated helical semantic metadata: end_cap binding should be present");
});

test("BuildHelicalSweep supports polyline section profiles for thread-like generated sweeps", async () => {
  const module = await createModule();
  const spec = createThreadLikePolylineSpec();
  const result = module.BuildHelicalSweep(spec, {});

  assertCanonicalGeneratedResult(result, "generated helical polyline section");
  assert.equal(result.helicalSweep.sectionKind, "polyline");
  assert.equal(result.helicalSweep.sectionPointCount, spec.section.points.length);
  assert.ok(result.helicalSweep.shapeValidation.exact.isSolid, "generated helical polyline section: exact shape should be solid");
  assert.ok(result.helicalSweep.shapeValidation.mesh.isManifold, "generated helical polyline section: mesh should be manifold");
  assert.ok(result.helicalSweep.shapeValidation.mesh.isWatertight, "generated helical polyline section: mesh should be watertight");
  assertStableFaceBindings(result, "generated helical polyline section");
});
