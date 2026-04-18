import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { loadOcctFactory } from "./load_occt_factory.mjs";

const FIXTURES = [
  { name: "as1_pe_203.brep", opener: "OpenExactBrepModel" },
  { name: "ANC101.stp", opener: "OpenExactStepModel" },
];

const factory = loadOcctFactory();

async function loadFixture(name) {
  return new Uint8Array(await readFile(new URL(`./${name}`, import.meta.url)));
}

async function createModule() {
  return factory();
}

function getExactRef(result, geometryIndex, kind, elementId) {
  return {
    exactModelId: result.exactModelId,
    exactShapeHandle: result.exactGeometryBindings[geometryIndex].exactShapeHandle,
    kind,
    elementId,
  };
}

function describeExactHole(module, ref) {
  return module.DescribeExactHole(
    ref.exactModelId,
    ref.exactShapeHandle,
    ref.kind,
    ref.elementId,
  );
}

function assertPlacementFrame(frame) {
  assert.ok(frame && typeof frame === "object");
  for (const key of ["origin", "normal", "xDir", "yDir"]) {
    assert.ok(Array.isArray(frame[key]) && frame[key].length === 3, `${key} should be a 3D vector`);
  }
}

function assertHoleResult(result) {
  assert.equal(result?.ok, true);
  assert.equal(result?.kind, "hole");
  assert.equal(result?.profile, "cylindrical");
  assert.equal(typeof result?.radius, "number");
  assert.ok(result.radius > 0);
  assert.equal(typeof result?.diameter, "number");
  assert.ok(result.diameter > 0);
  assertPlacementFrame(result.frame);
  assert.ok(Array.isArray(result?.anchors) && result.anchors.length >= 2);
  assert.ok(Array.isArray(result?.axisDirection) && result.axisDirection.length === 3);
}

function collectCylinderFaceIds(module, result, geometryIndex) {
  const ids = new Set();
  const handle = result.exactGeometryBindings[geometryIndex].exactShapeHandle;
  const geometry = result.geometries[geometryIndex];
  for (const face of geometry.faces ?? []) {
    const family = module.GetExactGeometryType(result.exactModelId, handle, "face", face.id);
    if (family?.ok === true && family.family === "cylinder") {
      ids.add(face.id);
    }
  }
  return ids;
}

function findSupportedHolePair(module, result) {
  for (let geometryIndex = 0; geometryIndex < result.geometries.length; geometryIndex += 1) {
    const geometry = result.geometries[geometryIndex];
    const cylinderFaceIds = collectCylinderFaceIds(module, result, geometryIndex);
    if (cylinderFaceIds.size === 0) {
      continue;
    }

    for (const edge of geometry.edges ?? []) {
      const edgeFamily = module.GetExactGeometryType(
        result.exactModelId,
        result.exactGeometryBindings[geometryIndex].exactShapeHandle,
        "edge",
        edge.id,
      );
      if (edgeFamily?.ok !== true || edgeFamily.family !== "circle") {
        continue;
      }

      const supportingFaceId = (edge.ownerFaceIds ?? []).find((faceId) => cylinderFaceIds.has(faceId));
      if (!supportingFaceId) {
        continue;
      }

      const edgeRef = getExactRef(result, geometryIndex, "edge", edge.id);
      const faceRef = getExactRef(result, geometryIndex, "face", supportingFaceId);
      const edgeHole = describeExactHole(module, edgeRef);
      const faceHole = describeExactHole(module, faceRef);
      if (edgeHole?.ok === true && faceHole?.ok === true) {
        return {
          geometryIndex,
          edgeRef,
          faceRef,
          edgeHole,
          faceHole,
        };
      }
    }
  }

  return null;
}

function findUnsupportedHoleCandidate(module, result, excluded = new Set()) {
  for (let geometryIndex = 0; geometryIndex < result.geometries.length; geometryIndex += 1) {
    const geometry = result.geometries[geometryIndex];
    const handle = result.exactGeometryBindings[geometryIndex].exactShapeHandle;

    for (const edge of geometry.edges ?? []) {
      const family = module.GetExactGeometryType(result.exactModelId, handle, "edge", edge.id);
      if (family?.ok !== true || family.family !== "circle") {
        continue;
      }
      const key = `${geometryIndex}:edge:${edge.id}`;
      if (excluded.has(key)) {
        continue;
      }
      const ref = getExactRef(result, geometryIndex, "edge", edge.id);
      const hole = describeExactHole(module, ref);
      if (hole?.ok === false && hole.code === "unsupported-geometry") {
        return { ref, hole };
      }
    }

    for (const face of geometry.faces ?? []) {
      const family = module.GetExactGeometryType(result.exactModelId, handle, "face", face.id);
      if (family?.ok !== true || family.family !== "cylinder") {
        continue;
      }
      const key = `${geometryIndex}:face:${face.id}`;
      if (excluded.has(key)) {
        continue;
      }
      const ref = getExactRef(result, geometryIndex, "face", face.id);
      const hole = describeExactHole(module, ref);
      if (hole?.ok === false && hole.code === "unsupported-geometry") {
        return { ref, hole };
      }
    }
  }

  return null;
}

async function openFixture(module, fixture) {
  const bytes = await loadFixture(fixture.name);
  const result = module[fixture.opener](bytes, {});
  assert.equal(result?.success, true, `${fixture.name} should open as an exact model fixture`);
  return result;
}

async function loadSupportedHoleFixture(module) {
  for (const fixture of FIXTURES) {
    const result = await openFixture(module, fixture);
    const pair = findSupportedHolePair(module, result);
    if (pair) {
      return { fixture, result, pair };
    }
    module.ReleaseExactModel(result.exactModelId);
  }

  throw new Error("No shipped exact fixture exposed a supported cylindrical hole pair.");
}

async function loadUnsupportedHoleFixture(module, excluded = new Set()) {
  for (const fixture of FIXTURES) {
    const result = await openFixture(module, fixture);
    const candidate = findUnsupportedHoleCandidate(module, result, excluded);
    if (candidate) {
      return { fixture, result, candidate };
    }
    module.ReleaseExactModel(result.exactModelId);
  }

  throw new Error("No shipped exact fixture exposed an unsupported circular or cylindrical hole candidate.");
}

test("exact hole helper describes a cylindrical hole from a circular edge ref", async () => {
  const module = await createModule();
  const { result, pair } = await loadSupportedHoleFixture(module);

  try {
    assertHoleResult(pair.edgeHole);
    assert.ok(pair.edgeHole.anchors.some((anchor) => anchor.role === "center"));
  } finally {
    module.ReleaseExactModel(result.exactModelId);
  }
});

test("exact hole helper accepts a cylindrical face ref for the same supported hole", async () => {
  const module = await createModule();
  const { result, pair } = await loadSupportedHoleFixture(module);

  try {
    assertHoleResult(pair.faceHole);
    assert.equal(pair.faceHole.profile, pair.edgeHole.profile);
    assert.ok(Math.abs(pair.faceHole.radius - pair.edgeHole.radius) < 1e-6);
    assert.ok(Math.abs(pair.faceHole.diameter - pair.edgeHole.diameter) < 1e-6);
    if (pair.faceHole.depth !== undefined && pair.edgeHole.depth !== undefined) {
      assert.ok(Math.abs(pair.faceHole.depth - pair.edgeHole.depth) < 1e-6);
    }
    if (pair.faceHole.isThrough !== undefined && pair.edgeHole.isThrough !== undefined) {
      assert.equal(pair.faceHole.isThrough, pair.edgeHole.isThrough);
    }
  } finally {
    module.ReleaseExactModel(result.exactModelId);
  }
});

test("exact hole helper failures stay explicit for unsupported or non-hole geometry", async () => {
  const module = await createModule();
  const supported = await loadSupportedHoleFixture(module);
  const excluded = new Set([
    `${supported.pair.geometryIndex}:edge:${supported.pair.edgeRef.elementId}`,
    `${supported.pair.geometryIndex}:face:${supported.pair.faceRef.elementId}`,
  ]);
  module.ReleaseExactModel(supported.result.exactModelId);

  const { result, candidate } = await loadUnsupportedHoleFixture(module, excluded);

  try {
    assert.equal(candidate.hole?.ok, false);
    assert.equal(candidate.hole?.code, "unsupported-geometry");
    assert.equal(typeof candidate.hole?.message, "string");
    assert.ok(candidate.hole.message.length > 0);
  } finally {
    module.ReleaseExactModel(result.exactModelId);
  }
});
