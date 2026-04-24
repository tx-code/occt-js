import test from "node:test";
import assert from "node:assert/strict";
import { loadOcctFactory } from "./load_occt_factory.mjs";

const factory = loadOcctFactory();

async function createModule() {
  return factory();
}

function createRevolvedSeedSpec() {
  return {
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
  };
}

function createHelicalCutSpec() {
  return {
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
  };
}

function createValidSpec() {
  return {
    version: 1,
    units: "mm",
    seed: {
      family: "revolved",
      spec: createRevolvedSeedSpec(),
    },
    steps: [
      {
        op: "cut",
        operand: {
          family: "helical-sweep",
          spec: createHelicalCutSpec(),
        },
      },
    ],
  };
}

function findDiagnostic(result, code) {
  return result.diagnostics.find((diagnostic) => diagnostic.code === code);
}

function assertTypedDiagnostics(result) {
  assert.equal(typeof result?.ok, "boolean");
  assert.ok(Array.isArray(result?.diagnostics), "diagnostics should be an array");

  for (const diagnostic of result.diagnostics) {
    assert.ok(diagnostic && typeof diagnostic === "object", "diagnostic should be an object");
    assert.equal(typeof diagnostic.code, "string");
    assert.ok(diagnostic.code.length > 0);
    assert.equal(typeof diagnostic.message, "string");
    assert.ok(diagnostic.message.length > 0);
    assert.equal(diagnostic.severity, "error");
    if (diagnostic.path !== undefined) {
      assert.equal(typeof diagnostic.path, "string");
      assert.ok(diagnostic.path.length > 0);
    }
    if (diagnostic.segmentIndex !== undefined) {
      assert.equal(typeof diagnostic.segmentIndex, "number");
      assert.ok(diagnostic.segmentIndex >= 0);
    }
  }
}

test("ValidateCompositeShapeSpec accepts a generic revolve + helical cut pipeline", async () => {
  const module = await createModule();
  const result = module.ValidateCompositeShapeSpec(createValidSpec());

  assert.deepEqual(result, {
    ok: true,
    diagnostics: [],
  });
});

test("ValidateCompositeShapeSpec rejects unsupported units, operation kinds, and malformed transforms", async () => {
  const module = await createModule();
  const spec = createValidSpec();
  spec.units = "cm";
  spec.seed.family = "lathe";
  spec.steps[0].op = "subtract";
  spec.steps[0].operand.transform = [1, 0, 0];

  const result = module.ValidateCompositeShapeSpec(spec);

  assert.equal(result?.ok, false);
  assertTypedDiagnostics(result);
  assert.equal(findDiagnostic(result, "unsupported-unit")?.path, "units");
  assert.equal(findDiagnostic(result, "unsupported-operand-family")?.path, "seed.family");
  assert.equal(findDiagnostic(result, "unsupported-step-op")?.path, "steps[0].op");
  assert.equal(findDiagnostic(result, "invalid-transform")?.path, "steps[0].operand.transform");
});

test("ValidateCompositeShapeSpec reports nested operand validation failures with prefixed paths", async () => {
  const module = await createModule();
  const spec = createValidSpec();
  spec.seed.spec.profile.segments[0].end = [-1, 0];
  spec.steps[0].operand.spec.helix.turns = 0;

  const result = module.ValidateCompositeShapeSpec(spec);

  assert.equal(result?.ok, false);
  assertTypedDiagnostics(result);
  assert.equal(findDiagnostic(result, "negative-radius")?.path, "seed.spec.profile.segments[0].end[0]");
  assert.equal(findDiagnostic(result, "invalid-helix-turns")?.path, "steps[0].operand.spec.helix.turns");
});
