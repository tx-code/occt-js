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
    ],
  };
}

function assertCanonicalExactGeneratedPayload(result, label) {
  assert.equal(result?.success, true, `${label}: success should be true`);
  assert.equal(result?.sourceFormat, "generated-composite-shape", `${label}: sourceFormat should be generated-composite-shape`);
  assert.equal(typeof result?.exactModelId, "number", `${label}: exactModelId should be numeric`);
  assert.ok(Number.isInteger(result.exactModelId) && result.exactModelId > 0, `${label}: exactModelId should be positive`);
  assert.ok(Array.isArray(result?.rootNodes), `${label}: rootNodes should be an array`);
  assert.ok(Array.isArray(result?.geometries), `${label}: geometries should be an array`);
  assert.ok(Array.isArray(result?.materials), `${label}: materials should be an array`);
  assert.ok(Array.isArray(result?.exactGeometryBindings), `${label}: exactGeometryBindings should be an array`);
  assert.equal(result.exactGeometryBindings.length, result.geometries.length, `${label}: exactGeometryBindings should align with geometries`);
  assert.ok(result?.compositeShape && typeof result.compositeShape === "object", `${label}: compositeShape metadata should exist`);
}

test("OpenExactCompositeShape returns retained exact handles for a generated composite shape", async () => {
  const module = await createModule();
  const result = module.OpenExactCompositeShape(createCompositeSpec(), {});

  try {
    assertCanonicalExactGeneratedPayload(result, "generated composite exact open");
    assert.equal(result.geometries.length, 1, "generated composite exact open should export one geometry");
    assert.equal(result.exactGeometryBindings.length, 1, "generated composite exact open should export one exact geometry binding");
    assert.equal(result.exactGeometryBindings[0].exactShapeHandle, 1, "first generated composite exact shape handle should be 1");
  } finally {
    if (result?.exactModelId) {
      module.ReleaseExactModel(result.exactModelId);
    }
  }
});

test("OpenExactCompositeShape supports exact-family lookup through retained handles", async () => {
  const module = await createModule();
  const result = module.OpenExactCompositeShape(createCompositeSpec(), {});

  try {
    assertCanonicalExactGeneratedPayload(result, "generated composite exact family lookup");
    const geometry = result.geometries[0];
    assert.ok(Array.isArray(geometry?.faces) && geometry.faces.length > 0, "generated composite exact family lookup: at least one face should exist");

    const representativeFaceId = geometry.faces[0].id;
    const exactShapeHandle = result.exactGeometryBindings[0].exactShapeHandle;
    const family = module.GetExactGeometryType(result.exactModelId, exactShapeHandle, "face", representativeFaceId);

    assert.equal(family?.ok, true);
    assert.notEqual(family?.family, "line");
  } finally {
    if (result?.exactModelId) {
      module.ReleaseExactModel(result.exactModelId);
    }
  }
});
