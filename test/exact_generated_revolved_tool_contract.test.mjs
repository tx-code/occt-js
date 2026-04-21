import test from "node:test";
import assert from "node:assert/strict";
import { loadOcctFactory } from "./load_occt_factory.mjs";

const factory = loadOcctFactory();

async function createModule() {
  return factory();
}

function createEndmillLikeSpec() {
  return {
    version: 1,
    units: "mm",
    profile: {
      plane: "XZ",
      start: [0, 0],
      closure: "explicit",
      segments: [
        { kind: "line", id: "tip", tag: "tip", end: [3, 0] },
        { kind: "line", id: "corner-entry", tag: "cutting", end: [4, 1] },
        { kind: "arc_center", id: "corner", tag: "corner", center: [3, 1], end: [3, 2] },
        { kind: "line", id: "flute", tag: "cutting", end: [3, 12] },
        { kind: "line", id: "axis-top", tag: "closure", end: [0, 12] },
        { kind: "line", id: "axis-bottom", tag: "closure", end: [0, 0] },
      ],
    },
    revolve: {
      angleDeg: 360,
    },
  };
}

function createBallLikeSpec() {
  return {
    version: 1,
    units: "mm",
    profile: {
      plane: "XZ",
      start: [0, 0],
      closure: "explicit",
      segments: [
        { kind: "arc_center", id: "ball", tag: "tip", center: [0, 5], end: [5, 5] },
        { kind: "line", id: "flute", tag: "cutting", end: [5, 12] },
        { kind: "line", id: "axis-top", tag: "closure", end: [0, 12] },
        { kind: "line", id: "axis-bottom", tag: "closure", end: [0, 0] },
      ],
    },
    revolve: {
      angleDeg: 360,
    },
  };
}

function createDrillLikeSpec() {
  return {
    version: 1,
    units: "mm",
    profile: {
      plane: "XZ",
      start: [0, 0],
      closure: "explicit",
      segments: [
        { kind: "line", id: "tip", tag: "tip", end: [3, 2] },
        { kind: "line", id: "body", tag: "cutting", end: [3, 10] },
        { kind: "line", id: "axis-top", tag: "closure", end: [0, 10] },
        { kind: "line", id: "axis-bottom", tag: "closure", end: [0, 0] },
      ],
    },
    revolve: {
      angleDeg: 360,
    },
  };
}

function createDrillLikePartialSpec() {
  return {
    version: 1,
    units: "inch",
    profile: {
      plane: "XZ",
      start: [0, 0],
      closure: "auto_axis",
      segments: [
        { kind: "line", id: "tip-land", tag: "tip", end: [1.5, 0] },
        { kind: "arc_3pt", id: "flute-profile", tag: "cutting", through: [4.5, 3], end: [1, 8] },
        { kind: "line", id: "neck", tag: "neck", end: [1, 12] },
      ],
    },
    revolve: {
      angleDeg: 210,
    },
  };
}

function createInvalidSpec() {
  return {
    version: 1,
    units: "cm",
    profile: {
      plane: "XZ",
      start: [-1, 0],
      closure: "explicit",
      segments: [
        { kind: "line", end: [3, 0] },
        { kind: "line", end: [0, 0] },
      ],
    },
    revolve: {
      angleDeg: 360,
    },
  };
}

function assertCanonicalExactGeneratedPayload(result, label) {
  assert.equal(result?.success, true, `${label}: success should be true`);
  assert.equal(result?.sourceFormat, "generated-revolved-shape", `${label}: sourceFormat should be generated-revolved-shape`);
  assert.equal(typeof result?.exactModelId, "number", `${label}: exactModelId should be numeric`);
  assert.ok(Number.isInteger(result.exactModelId) && result.exactModelId > 0, `${label}: exactModelId should be positive`);
  assert.ok(Array.isArray(result?.rootNodes), `${label}: rootNodes should be an array`);
  assert.ok(Array.isArray(result?.geometries), `${label}: geometries should be an array`);
  assert.ok(Array.isArray(result?.materials), `${label}: materials should be an array`);
  assert.ok(Array.isArray(result?.exactGeometryBindings), `${label}: exactGeometryBindings should be an array`);
  assert.equal(result.exactGeometryBindings.length, result.geometries.length, `${label}: exactGeometryBindings should align with geometries`);
  assert.equal(result?.revolvedShape?.hasStableFaceBindings, true, `${label}: stable bindings should be available`);
  assert.ok(Array.isArray(result?.revolvedShape?.faceBindings), `${label}: faceBindings should be an array`);
  assert.ok(result.revolvedShape.faceBindings.length > 0, `${label}: faceBindings should not be empty`);
  assert.ok(result?.revolvedShape?.shapeValidation, `${label}: shape validation should be available`);
  assert.equal(result.revolvedShape.shapeValidation.exact.isValid, true, `${label}: exact shape validation should pass`);
  assert.equal(result.revolvedShape.shapeValidation.mesh.isWatertight, true, `${label}: generated mesh should be watertight`);
}

function findRepresentativeFace(module, result, expectedFamily) {
  const geometry = result.geometries?.[0];
  const exactShapeHandle = result.exactGeometryBindings?.[0]?.exactShapeHandle;
  if (!geometry || !exactShapeHandle) {
    return null;
  }

  for (const face of geometry.faces ?? []) {
    const family = module.GetExactGeometryType(result.exactModelId, exactShapeHandle, "face", face.id);
    if (family?.ok === true && family.family === expectedFamily) {
      return { exactShapeHandle, kind: "face", elementId: face.id };
    }
  }

  return null;
}

function familyForSegmentId(module, result, segmentId) {
  const binding = result.revolvedShape.faceBindings.find((candidate) => candidate.segmentId === segmentId);
  assert.ok(binding, `binding for segment ${segmentId} should exist`);

  const handle = result.exactGeometryBindings[0].exactShapeHandle;
  const family = module.GetExactGeometryType(result.exactModelId, handle, "face", binding.faceId);
  assert.equal(family?.ok, true, `exact family lookup for ${segmentId} should succeed`);
  return family.family;
}

test("OpenExactRevolvedShape returns retained exact handles for a generated revolved shape", async () => {
  const module = await createModule();
  const result = module.OpenExactRevolvedShape(createEndmillLikeSpec(), {});

  try {
    assertCanonicalExactGeneratedPayload(result, "generated exact open");
    assert.equal(result.geometries.length, 1, "generated exact open should export one geometry");
    assert.equal(result.exactGeometryBindings.length, 1, "generated exact open should export one exact geometry binding");
    assert.equal(result.exactGeometryBindings[0].exactShapeHandle, 1, "first generated exact shape handle should be 1");
  } finally {
    if (result?.exactModelId) {
      module.ReleaseExactModel(result.exactModelId);
    }
  }
});

test("OpenExactRevolvedShape registers generated revolved shapes in the exact store and supports representative exact queries", async () => {
  const module = await createModule();
  const result = module.OpenExactRevolvedShape(createEndmillLikeSpec(), {});

  try {
    assertCanonicalExactGeneratedPayload(result, "generated exact query");

    const diagnostics = module.GetExactModelDiagnostics();
    const entry = diagnostics.liveExactModels.find((candidate) => candidate.exactModelId === result.exactModelId);
    assert.equal(typeof entry, "object");
    assert.equal(entry.sourceFormat, "generated-revolved-shape");
    assert.equal(entry.exactGeometryCount, 1);

    const cylinderFace = findRepresentativeFace(module, result, "cylinder");
    assert.ok(cylinderFace, "generated revolved shape should expose at least one cylindrical exact face");

    const radius = module.MeasureExactRadius(
      result.exactModelId,
      cylinderFace.exactShapeHandle,
      cylinderFace.kind,
      cylinderFace.elementId,
    );
    assert.equal(radius?.ok, true);
    assert.ok(radius.radius > 0);
  } finally {
    if (result?.exactModelId) {
      module.ReleaseExactModel(result.exactModelId);
    }
  }
});

test("OpenExactRevolvedShape keeps face bindings aligned with the exact face families they color", async () => {
  const module = await createModule();
  const cases = [
    {
      label: "bullnose",
      spec: createEndmillLikeSpec(),
      expectations: {
        tip: "plane",
        corner: "torus",
        flute: "cylinder",
        "axis-top": "plane",
      },
    },
    {
      label: "ball",
      spec: createBallLikeSpec(),
      expectations: {
        ball: "sphere",
        flute: "cylinder",
        "axis-top": "plane",
      },
    },
    {
      label: "drill",
      spec: createDrillLikeSpec(),
      expectations: {
        tip: "cone",
        body: "cylinder",
        "axis-top": "plane",
      },
    },
  ];

  for (const testCase of cases) {
    const result = module.OpenExactRevolvedShape(testCase.spec, {});
    try {
      assertCanonicalExactGeneratedPayload(result, `${testCase.label} exact family mapping`);
      for (const [segmentId, expectedFamily] of Object.entries(testCase.expectations)) {
        assert.equal(
          familyForSegmentId(module, result, segmentId),
          expectedFamily,
          `${testCase.label}: ${segmentId} should stay bound to a ${expectedFamily} face`,
        );
      }
    } finally {
      if (result?.exactModelId) {
        module.ReleaseExactModel(result.exactModelId);
      }
    }
  }
});

test("OpenExactRevolvedShape keeps auto_axis caller bindings aligned after the shared-kernel refactor", async () => {
  const module = await createModule();
  const result = module.OpenExactRevolvedShape(createDrillLikePartialSpec(), {});

  try {
    assertCanonicalExactGeneratedPayload(result, "partial revolve shared-kernel exact mapping");
    assert.equal(
      familyForSegmentId(module, result, "tip-land"),
      "plane",
      "partial revolve shared-kernel exact mapping: tip-land should stay bound to a plane face",
    );
    assert.equal(
      familyForSegmentId(module, result, "flute-profile"),
      "other",
      "partial revolve shared-kernel exact mapping: flute-profile should stay bound to the freeform revolved face",
    );
    assert.equal(
      familyForSegmentId(module, result, "neck"),
      "cylinder",
      "partial revolve shared-kernel exact mapping: neck should stay bound to a cylinder face",
    );

    const runtimeOwnedBindings = result.revolvedShape.faceBindings.filter((binding) =>
      ["closure", "axis", "start_cap", "end_cap"].includes(binding.systemRole),
    );
    assert.ok(runtimeOwnedBindings.length >= 3, "partial revolve shared-kernel exact mapping: runtime-owned closure/cap faces should still be present");
    assert.equal(
      runtimeOwnedBindings.some((binding) => binding.segmentId !== undefined || binding.segmentIndex !== undefined),
      false,
      "partial revolve shared-kernel exact mapping: runtime-owned closure/cap faces must not claim caller segments",
    );
  } finally {
    if (result?.exactModelId) {
      module.ReleaseExactModel(result.exactModelId);
    }
  }
});

test("OpenExactRevolvedShape keeps lifecycle and failure behavior explicit", async () => {
  const module = await createModule();

  const invalid = module.OpenExactRevolvedShape(createInvalidSpec(), {});
  assert.equal(invalid?.success, false);
  assert.equal(invalid?.sourceFormat, "generated-revolved-shape");
  assert.ok(Array.isArray(invalid?.diagnostics));
  assert.ok(invalid.diagnostics.some((diagnostic) => diagnostic.code === "unsupported-unit"));
  assert.equal("exactModelId" in invalid, false);
  assert.equal("exactGeometryBindings" in invalid, false);

  const opened = module.OpenExactRevolvedShape(createEndmillLikeSpec(), {});
  assertCanonicalExactGeneratedPayload(opened, "generated lifecycle");
  const representativeFace = findRepresentativeFace(module, opened, "cylinder") ?? {
    exactShapeHandle: opened.exactGeometryBindings[0].exactShapeHandle,
    kind: "face",
    elementId: opened.geometries[0].faces[0].id,
  };

  assert.deepEqual(module.ReleaseExactModel(opened.exactModelId), { ok: true });
  assert.deepEqual(
    module.GetExactGeometryType(
      opened.exactModelId,
      representativeFace.exactShapeHandle,
      representativeFace.kind,
      representativeFace.elementId,
    ),
    {
      ok: false,
      code: "released-handle",
      message: "Exact model handle has already been released.",
    },
  );
});
