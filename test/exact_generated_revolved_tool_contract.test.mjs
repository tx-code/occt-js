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
  assert.equal(result?.sourceFormat, "generated-revolved-tool", `${label}: sourceFormat should be generated-revolved-tool`);
  assert.equal(typeof result?.exactModelId, "number", `${label}: exactModelId should be numeric`);
  assert.ok(Number.isInteger(result.exactModelId) && result.exactModelId > 0, `${label}: exactModelId should be positive`);
  assert.ok(Array.isArray(result?.rootNodes), `${label}: rootNodes should be an array`);
  assert.ok(Array.isArray(result?.geometries), `${label}: geometries should be an array`);
  assert.ok(Array.isArray(result?.materials), `${label}: materials should be an array`);
  assert.ok(Array.isArray(result?.exactGeometryBindings), `${label}: exactGeometryBindings should be an array`);
  assert.equal(result.exactGeometryBindings.length, result.geometries.length, `${label}: exactGeometryBindings should align with geometries`);
  assert.equal(result?.generatedTool?.hasStableFaceBindings, true, `${label}: stable bindings should be available`);
  assert.ok(Array.isArray(result?.generatedTool?.faceBindings), `${label}: faceBindings should be an array`);
  assert.ok(result.generatedTool.faceBindings.length > 0, `${label}: faceBindings should not be empty`);
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

test("OpenExactRevolvedTool returns retained exact handles for a generated revolved tool", async () => {
  const module = await createModule();
  const result = module.OpenExactRevolvedTool(createEndmillLikeSpec(), {});

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

test("OpenExactRevolvedTool registers generated tools in the exact store and supports representative exact queries", async () => {
  const module = await createModule();
  const result = module.OpenExactRevolvedTool(createEndmillLikeSpec(), {});

  try {
    assertCanonicalExactGeneratedPayload(result, "generated exact query");

    const diagnostics = module.GetExactModelDiagnostics();
    const entry = diagnostics.liveExactModels.find((candidate) => candidate.exactModelId === result.exactModelId);
    assert.equal(typeof entry, "object");
    assert.equal(entry.sourceFormat, "generated-revolved-tool");
    assert.equal(entry.exactGeometryCount, 1);

    const cylinderFace = findRepresentativeFace(module, result, "cylinder");
    assert.ok(cylinderFace, "generated revolved tool should expose at least one cylindrical exact face");

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

test("OpenExactRevolvedTool keeps lifecycle and failure behavior explicit", async () => {
  const module = await createModule();

  const invalid = module.OpenExactRevolvedTool(createInvalidSpec(), {});
  assert.equal(invalid?.success, false);
  assert.equal(invalid?.sourceFormat, "generated-revolved-tool");
  assert.ok(Array.isArray(invalid?.diagnostics));
  assert.ok(invalid.diagnostics.some((diagnostic) => diagnostic.code === "unsupported-unit"));
  assert.equal("exactModelId" in invalid, false);
  assert.equal("exactGeometryBindings" in invalid, false);

  const opened = module.OpenExactRevolvedTool(createEndmillLikeSpec(), {});
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
