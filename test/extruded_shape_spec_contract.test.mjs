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
    profile: {
      start: [0, 0],
      segments: [
        { kind: "line", id: "base", tag: "base", end: [4, 0] },
        { kind: "line", id: "right", tag: "wall", end: [4, 2] },
        { kind: "line", id: "top", tag: "wall", end: [0, 2] },
        { kind: "line", id: "left", tag: "wall", end: [0, 0] },
      ],
    },
    extrusion: {
      depth: 6,
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

test("ValidateExtrudedShapeSpec accepts a minimal closed shared-profile prism spec", async () => {
  const module = await createModule();
  const result = module.ValidateExtrudedShapeSpec(createValidSpec());

  assert.deepEqual(result, {
    ok: true,
    diagnostics: [],
  });
});

test("ValidateExtrudedShapeSpec rejects unsupported units non-positive depth and invalid profile input", async () => {
  const module = await createModule();
  const spec = createValidSpec();
  spec.units = "cm";
  spec.extrusion.depth = 0;
  spec.profile.segments.pop();

  const result = module.ValidateExtrudedShapeSpec(spec);

  assert.equal(result?.ok, false);
  assertTypedDiagnostics(result);

  const unsupportedUnit = findDiagnostic(result, "unsupported-unit");
  assert.ok(unsupportedUnit, "expected unsupported-unit diagnostic");
  assert.equal(unsupportedUnit.path, "units");

  const invalidDepth = findDiagnostic(result, "invalid-extrusion-depth");
  assert.ok(invalidDepth, "expected invalid-extrusion-depth diagnostic");
  assert.equal(invalidDepth.path, "extrusion.depth");

  const profileNotClosed = findDiagnostic(result, "profile-not-closed");
  assert.ok(profileNotClosed, "expected profile-not-closed diagnostic");
  assert.equal(profileNotClosed.path, "profile.segments");
});
