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

function assertCanonicalExactGeneratedPayload(result, label) {
  assert.equal(result?.success, true, `${label}: success should be true`);
  assert.equal(result?.sourceFormat, "generated-extruded-shape", `${label}: sourceFormat should be generated-extruded-shape`);
  assert.equal(typeof result?.exactModelId, "number", `${label}: exactModelId should be numeric`);
  assert.ok(Number.isInteger(result.exactModelId) && result.exactModelId > 0, `${label}: exactModelId should be positive`);
  assert.ok(Array.isArray(result?.rootNodes), `${label}: rootNodes should be an array`);
  assert.ok(Array.isArray(result?.geometries), `${label}: geometries should be an array`);
  assert.ok(Array.isArray(result?.materials), `${label}: materials should be an array`);
  assert.ok(Array.isArray(result?.exactGeometryBindings), `${label}: exactGeometryBindings should be an array`);
  assert.equal(result.exactGeometryBindings.length, result.geometries.length, `${label}: exactGeometryBindings should align with geometries`);
  assert.ok(result?.extrudedShape && typeof result.extrudedShape === "object", `${label}: extrudedShape metadata should exist`);
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

test("OpenExactExtrudedShape returns retained exact handles for a generated extruded shape", async () => {
  const module = await createModule();
  const result = module.OpenExactExtrudedShape(createRoundedPrismSpec(), {});

  try {
    assertCanonicalExactGeneratedPayload(result, "generated extruded exact open");
    assert.equal(result.geometries.length, 1, "generated extruded exact open should export one geometry");
    assert.equal(result.exactGeometryBindings.length, 1, "generated extruded exact open should export one exact geometry binding");
    assert.equal(result.exactGeometryBindings[0].exactShapeHandle, 1, "first generated extruded exact shape handle should be 1");
  } finally {
    if (result?.exactModelId) {
      module.ReleaseExactModel(result.exactModelId);
    }
  }
});

test("OpenExactExtrudedShape exposes representative exact families for a generated extruded shape", async () => {
  const module = await createModule();
  const result = module.OpenExactExtrudedShape(createRoundedPrismSpec(), {});

  try {
    assertCanonicalExactGeneratedPayload(result, "generated extruded exact families");

    const cylinderFace = findRepresentativeFace(module, result, "cylinder");
    assert.ok(cylinderFace, "generated extruded shape should expose at least one cylindrical exact face");

    const radius = module.MeasureExactRadius(
      result.exactModelId,
      cylinderFace.exactShapeHandle,
      cylinderFace.kind,
      cylinderFace.elementId,
    );
    assert.equal(radius?.ok, true);
    assert.ok(radius.radius > 0);

    const planeFace = findRepresentativeFace(module, result, "plane");
    assert.ok(planeFace, "generated extruded shape should expose at least one planar exact face");
  } finally {
    if (result?.exactModelId) {
      module.ReleaseExactModel(result.exactModelId);
    }
  }
});
