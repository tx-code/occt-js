import test from "node:test";
import assert from "node:assert/strict";
import { loadOcctFactory } from "./load_occt_factory.mjs";

const factory = loadOcctFactory();

async function createModule() {
  return factory();
}

function createValidSpec() {
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
      segments: 32,
    },
  };
}

function createPolylineSpec() {
  return {
    version: 1,
    units: "mm",
    helix: {
      radius: 8,
      pitch: 2,
      turns: 3,
      handedness: "right",
    },
    section: {
      kind: "polyline",
      points: [
        [0.0, 0.0],
        [0.35, 0.4],
        [0.7, 0.0],
      ],
    },
  };
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

function findDiagnostic(result, code) {
  return result.diagnostics.find((diagnostic) => diagnostic.code === code);
}

test("ValidateHelicalSweepSpec accepts a minimal generic circular-section helical sweep spec", async () => {
  const module = await createModule();
  const result = module.ValidateHelicalSweepSpec(createValidSpec());

  assert.deepEqual(result, {
    ok: true,
    diagnostics: [],
  });
});

test("ValidateHelicalSweepSpec accepts a generic polyline-section helical sweep spec", async () => {
  const module = await createModule();
  const result = module.ValidateHelicalSweepSpec(createPolylineSpec());

  assert.deepEqual(result, {
    ok: true,
    diagnostics: [],
  });
});

test("ValidateHelicalSweepSpec rejects unsupported units and invalid helix/section parameters with typed diagnostics", async () => {
  const module = await createModule();
  const spec = createValidSpec();
  spec.units = "cm";
  spec.helix.radius = 0;
  spec.helix.pitch = -2;
  spec.helix.turns = 0;
  spec.helix.handedness = "cw";
  spec.section.kind = "polygon";
  spec.section.radius = -0.1;
  spec.section.segments = 2;

  const result = module.ValidateHelicalSweepSpec(spec);

  assert.equal(result?.ok, false);
  assertTypedDiagnostics(result);

  assert.equal(findDiagnostic(result, "unsupported-unit")?.path, "units");
  assert.equal(findDiagnostic(result, "invalid-helix-radius")?.path, "helix.radius");
  assert.equal(findDiagnostic(result, "invalid-helix-pitch")?.path, "helix.pitch");
  assert.equal(findDiagnostic(result, "invalid-helix-turns")?.path, "helix.turns");
  assert.equal(findDiagnostic(result, "invalid-handedness")?.path, "helix.handedness");
  assert.equal(findDiagnostic(result, "unsupported-section-kind")?.path, "section.kind");
  assert.equal(findDiagnostic(result, "invalid-section-radius")?.path, "section.radius");
  assert.equal(findDiagnostic(result, "invalid-section-segments")?.path, "section.segments");
});

test("ValidateHelicalSweepSpec rejects malformed polyline section definitions", async () => {
  const module = await createModule();
  const spec = createPolylineSpec();
  spec.section.points = [
    [0, 0],
    [0.3, 0.3],
    [0.3, 0.3],
  ];

  const result = module.ValidateHelicalSweepSpec(spec);

  assert.equal(result?.ok, false);
  assertTypedDiagnostics(result);
  assert.equal(findDiagnostic(result, "invalid-section-points")?.path, "section.points");
});
