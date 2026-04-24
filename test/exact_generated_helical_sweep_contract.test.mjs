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

function assertCanonicalExactGeneratedPayload(result, label) {
  assert.equal(result?.success, true, `${label}: success should be true`);
  assert.equal(result?.sourceFormat, "generated-helical-sweep", `${label}: sourceFormat should be generated-helical-sweep`);
  assert.equal(typeof result?.exactModelId, "number", `${label}: exactModelId should be numeric`);
  assert.ok(Number.isInteger(result.exactModelId) && result.exactModelId > 0, `${label}: exactModelId should be positive`);
  assert.ok(Array.isArray(result?.rootNodes), `${label}: rootNodes should be an array`);
  assert.ok(Array.isArray(result?.geometries), `${label}: geometries should be an array`);
  assert.ok(Array.isArray(result?.materials), `${label}: materials should be an array`);
  assert.ok(Array.isArray(result?.exactGeometryBindings), `${label}: exactGeometryBindings should be an array`);
  assert.equal(result.exactGeometryBindings.length, result.geometries.length, `${label}: exactGeometryBindings should align with geometries`);
  assert.ok(result?.helicalSweep && typeof result.helicalSweep === "object", `${label}: helicalSweep metadata should exist`);
}

function familyForFaceId(module, result, faceId) {
  const handle = result.exactGeometryBindings[0].exactShapeHandle;
  const family = module.GetExactGeometryType(result.exactModelId, handle, "face", faceId);
  assert.equal(family?.ok, true, `exact family lookup for face ${faceId} should succeed`);
  return family.family;
}

test("OpenExactHelicalSweep returns retained exact handles for a generated helical sweep", async () => {
  const module = await createModule();
  const result = module.OpenExactHelicalSweep(createHelicalSweepSpec(), {});

  try {
    assertCanonicalExactGeneratedPayload(result, "generated helical exact open");
    assert.equal(result.geometries.length, 1, "generated helical exact open should export one geometry");
    assert.equal(result.exactGeometryBindings.length, 1, "generated helical exact open should export one exact geometry binding");
    assert.equal(result.exactGeometryBindings[0].exactShapeHandle, 1, "first generated helical exact shape handle should be 1");
  } finally {
    if (result?.exactModelId) {
      module.ReleaseExactModel(result.exactModelId);
    }
  }
});

test("OpenExactHelicalSweep keeps sweep and cap bindings aligned with representative exact families", async () => {
  const module = await createModule();
  const result = module.OpenExactHelicalSweep(createHelicalSweepSpec(), {});

  try {
    assertCanonicalExactGeneratedPayload(result, "generated helical semantic exact mapping");
    assert.equal(result.helicalSweep.hasStableFaceBindings, true, "generated helical semantic exact mapping: stable bindings should be enabled");
    assert.ok(Array.isArray(result.helicalSweep.faceBindings), "generated helical semantic exact mapping: faceBindings should exist");

    const startCap = result.helicalSweep.faceBindings.find((binding) => binding.systemRole === "start_cap");
    const endCap = result.helicalSweep.faceBindings.find((binding) => binding.systemRole === "end_cap");
    const sweep = result.helicalSweep.faceBindings.find((binding) => binding.systemRole === "sweep");

    assert.ok(startCap, "generated helical semantic exact mapping: start_cap binding should exist");
    assert.ok(endCap, "generated helical semantic exact mapping: end_cap binding should exist");
    assert.ok(sweep, "generated helical semantic exact mapping: sweep binding should exist");

    assert.equal(familyForFaceId(module, result, startCap.faceId), "plane");
    assert.equal(familyForFaceId(module, result, endCap.faceId), "plane");

    const sweepFamily = familyForFaceId(module, result, sweep.faceId);
    assert.notEqual(sweepFamily, "line");
  } finally {
    if (result?.exactModelId) {
      module.ReleaseExactModel(result.exactModelId);
    }
  }
});

test("OpenExactHelicalSweep supports polyline section profiles and retains exact handles", async () => {
  const module = await createModule();
  const result = module.OpenExactHelicalSweep(createThreadLikePolylineSpec(), {});

  try {
    assertCanonicalExactGeneratedPayload(result, "generated helical polyline exact open");
    assert.equal(result.helicalSweep.sectionKind, "polyline");
    assert.equal(result.helicalSweep.sectionPointCount, 3);
    assert.ok(result.helicalSweep.hasStableFaceBindings, "generated helical polyline exact open: stable bindings should be enabled");
    assert.ok(Array.isArray(result.helicalSweep.faceBindings), "generated helical polyline exact open: faceBindings should exist");
  } finally {
    if (result?.exactModelId) {
      module.ReleaseExactModel(result.exactModelId);
    }
  }
});
