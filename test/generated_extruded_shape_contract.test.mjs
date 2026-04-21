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

function roundColor(color) {
  return {
    r: Number(color.r.toFixed(6)),
    g: Number(color.g.toFixed(6)),
    b: Number(color.b.toFixed(6)),
  };
}

function colorKey(color) {
  const rounded = roundColor(color);
  return JSON.stringify([rounded.r, rounded.g, rounded.b]);
}

function faceColorKeyMap(geometry) {
  return new Map((geometry.faces ?? []).map((face) => [face.id, face.color ? colorKey(face.color) : null]));
}

function assertStableFaceBindings(result, spec, label) {
  const geometry = result.geometries[0];
  const faceIds = new Set((geometry.faces ?? []).map((face) => face.id));
  const faceBindings = result.extrudedShape?.faceBindings;
  const boundFaces = new Set();

  assert.equal(result.extrudedShape.hasStableFaceBindings, true, `${label}: stable face bindings should be enabled`);
  assert.ok(Array.isArray(faceBindings), `${label}: faceBindings should be an array`);
  assert.ok(faceBindings.length > 0, `${label}: faceBindings should not be empty`);
  assert.ok(
    geometry.faces.every((face) => face.color && typeof face.color.r === "number"),
    `${label}: generated faces should expose deterministic default colors`,
  );

  for (const binding of faceBindings) {
    assert.equal(binding.geometryIndex, 0, `${label}: generated extruded shapes currently bind against geometry 0`);
    assert.ok(faceIds.has(binding.faceId), `${label}: faceId should exist in emitted geometry`);
    const bindingKey = `${binding.geometryIndex}:${binding.faceId}`;
    assert.equal(boundFaces.has(bindingKey), false, `${label}: each face should resolve to at most one stable binding`);
    boundFaces.add(bindingKey);
    assert.ok(
      ["wall", "start_cap", "end_cap"].includes(binding.systemRole),
      `${label}: systemRole should be a supported runtime role`,
    );

    if (binding.segmentIndex !== undefined) {
      assert.ok(
        binding.segmentIndex >= 0 && binding.segmentIndex < spec.profile.segments.length,
        `${label}: segmentIndex should be in range`,
      );
      const segment = spec.profile.segments[binding.segmentIndex];
      if (segment.id !== undefined) {
        assert.equal(binding.segmentId, segment.id, `${label}: segmentId should echo the originating segment id`);
      }
      if (segment.tag !== undefined) {
        assert.equal(binding.segmentTag, segment.tag, `${label}: segmentTag should echo the originating segment tag`);
      }
    } else {
      assert.equal(binding.segmentId, undefined, `${label}: runtime-owned bindings should not claim a segmentId`);
      assert.equal(binding.segmentTag, undefined, `${label}: runtime-owned bindings should not claim a segmentTag`);
    }
  }
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

test("BuildExtrudedShape emits stable face bindings and runtime-owned semantic appearance for wall start_cap and end_cap roles", async () => {
  const module = await createModule();
  const spec = createRoundedPrismSpec();
  const result = module.BuildExtrudedShape(spec, {});

  assertCanonicalGeneratedResult(result, "extruded semantic metadata");
  assertStableFaceBindings(result, spec, "extruded semantic metadata");
  assert.ok(result.extrudedShape?.shapeValidation, "extruded semantic metadata: shape validation should be present");
  assert.equal(result.extrudedShape.shapeValidation.exact.isValid, true, "extruded semantic metadata: exact shape should validate");
  assert.equal(result.extrudedShape.shapeValidation.mesh.isWatertight, true, "extruded semantic metadata: mesh should be watertight");

  const roleSet = new Set(result.extrudedShape.faceBindings.map((binding) => binding.systemRole));
  assert.ok(roleSet.has("wall"), "extruded semantic metadata: wall bindings should be present");
  assert.ok(roleSet.has("start_cap"), "extruded semantic metadata: start_cap binding should be present");
  assert.ok(roleSet.has("end_cap"), "extruded semantic metadata: end_cap binding should be present");
  assert.ok(
    result.extrudedShape.faceBindings.some((binding) => binding.segmentId === "arc-wall"),
    "extruded semantic metadata: caller segment provenance should be preserved for wall faces",
  );
  assert.ok(
    result.extrudedShape.faceBindings.some(
      (binding) => binding.systemRole === "start_cap" && binding.segmentIndex === undefined,
    ),
    "extruded semantic metadata: runtime-owned start_cap should not claim caller provenance",
  );
  assert.ok(
    result.extrudedShape.faceBindings.some(
      (binding) => binding.systemRole === "end_cap" && binding.segmentIndex === undefined,
    ),
    "extruded semantic metadata: runtime-owned end_cap should not claim caller provenance",
  );

  const faceColors = faceColorKeyMap(result.geometries[0]);
  const wallTagKeys = new Set(
    result.extrudedShape.faceBindings
      .filter((binding) => binding.systemRole === "wall" && binding.segmentTag === "wall")
      .map((binding) => faceColors.get(binding.faceId)),
  );
  const curvedWallKey = faceColors.get(
    result.extrudedShape.faceBindings.find((binding) => binding.segmentId === "arc-wall").faceId,
  );
  const startCapKey = faceColors.get(
    result.extrudedShape.faceBindings.find((binding) => binding.systemRole === "start_cap").faceId,
  );
  const endCapKey = faceColors.get(
    result.extrudedShape.faceBindings.find((binding) => binding.systemRole === "end_cap").faceId,
  );

  assert.equal(wallTagKeys.size, 1, "extruded semantic metadata: matching wall tags should collapse to one appearance group");
  assert.notEqual(curvedWallKey, [...wallTagKeys][0], "extruded semantic metadata: distinct wall semantics should keep distinct colors");
  assert.notEqual(startCapKey, [...wallTagKeys][0], "extruded semantic metadata: cap color should stay distinct from wall color");
  assert.notEqual(endCapKey, [...wallTagKeys][0], "extruded semantic metadata: cap color should stay distinct from wall color");
  assert.notEqual(startCapKey, endCapKey, "extruded semantic metadata: start and end caps should remain visually distinguishable");
  assert.ok(result.materials.length >= 4, "extruded semantic metadata: materials should reflect grouped wall/cap appearances");
});
