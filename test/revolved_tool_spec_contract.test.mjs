import test from "node:test";
import assert from "node:assert/strict";
import { loadOcctFactory } from "./load_occt_factory.mjs";

const factory = loadOcctFactory();

async function createModule() {
  return factory();
}

function cloneSpec(spec) {
  return JSON.parse(JSON.stringify(spec));
}

function createValidSpec() {
  return {
    version: 1,
    units: "mm",
    profile: {
      plane: "XZ",
      start: [0, 0],
      closure: "explicit",
      segments: [
        {
          kind: "line",
          id: "base",
          tag: "shank",
          end: [4, 0],
        },
        {
          kind: "line",
          id: "body",
          tag: "cutting",
          end: [4, 6],
        },
        {
          kind: "arc_center",
          id: "tip-radius",
          tag: "corner",
          center: [2, 6],
          end: [0, 6],
        },
        {
          kind: "line",
          id: "axis-close",
          tag: "closure",
          end: [0, 0],
        },
      ],
    },
    revolve: {
      angleDeg: 360,
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

test("ValidateRevolvedShapeSpec accepts a minimal strict line-and-arc revolved shape spec", async () => {
  const module = await createModule();
  const result = module.ValidateRevolvedShapeSpec(createValidSpec());

  assert.deepEqual(result, {
    ok: true,
    diagnostics: [],
  });
});

test("ValidateRevolvedShapeSpec rejects unsupported units and negative radii with typed diagnostics", async () => {
  const module = await createModule();
  const spec = createValidSpec();
  spec.units = "cm";
  spec.profile.start = [-1, 0];

  const result = module.ValidateRevolvedShapeSpec(spec);

  assert.equal(result?.ok, false);
  assertTypedDiagnostics(result);

  const unsupportedUnit = findDiagnostic(result, "unsupported-unit");
  assert.ok(unsupportedUnit, "expected unsupported-unit diagnostic");
  assert.equal(unsupportedUnit.path, "units");

  const negativeRadius = findDiagnostic(result, "negative-radius");
  assert.ok(negativeRadius, "expected negative-radius diagnostic");
  assert.equal(negativeRadius.path, "profile.start[0]");
});

test("ValidateRevolvedShapeSpec rejects invalid arc definitions and explicit non-closed profiles", async () => {
  const module = await createModule();
  const spec = createValidSpec();
  spec.profile.segments = [
    {
      kind: "line",
      end: [4, 0],
    },
    {
      kind: "arc_center",
      id: "bad-center-arc",
      center: [4, 1],
      end: [3, 4],
    },
    {
      kind: "arc_3pt",
      id: "bad-three-point-arc",
      through: [3, 5],
      end: [3, 6],
    },
  ];

  const result = module.ValidateRevolvedShapeSpec(spec);

  assert.equal(result?.ok, false);
  assertTypedDiagnostics(result);

  const invalidArcDiagnostics = result.diagnostics.filter((diagnostic) => diagnostic.code === "invalid-arc");
  assert.ok(invalidArcDiagnostics.length >= 2, "expected invalid-arc diagnostics for both malformed arc kinds");
  assert.ok(invalidArcDiagnostics.some((diagnostic) => diagnostic.segmentIndex === 1));
  assert.ok(invalidArcDiagnostics.some((diagnostic) => diagnostic.segmentIndex === 2));

  const profileNotClosed = findDiagnostic(result, "profile-not-closed");
  assert.ok(profileNotClosed, "expected profile-not-closed diagnostic");
  assert.equal(profileNotClosed.path, "profile.segments");
});

test("ValidateRevolvedShapeSpec rejects invalid partial revolve ranges without touching scene-build APIs", async () => {
  const module = await createModule();

  for (const angleDeg of [0, -30, 361]) {
    const spec = cloneSpec(createValidSpec());
    spec.revolve.angleDeg = angleDeg;

    const result = module.ValidateRevolvedShapeSpec(spec);

    assert.equal(result?.ok, false, `angleDeg=${angleDeg} should fail validation`);
    assertTypedDiagnostics(result);
    assert.ok(findDiagnostic(result, "invalid-revolve-angle"));
    assert.equal(result.success, undefined);
    assert.equal(result.rootNodes, undefined);
  }
});

test("ValidateRevolvedShapeSpec still rejects negative radius and invalid revolve settings after shared-profile extraction", async () => {
  const module = await createModule();
  const spec = createValidSpec();
  spec.profile.start = [-2, 0];
  spec.profile.segments[3].end = [-2, 0];
  spec.revolve.angleDeg = 540;

  const result = module.ValidateRevolvedShapeSpec(spec);

  assert.equal(result?.ok, false);
  assertTypedDiagnostics(result);
  assert.ok(findDiagnostic(result, "negative-radius"));
  assert.ok(findDiagnostic(result, "invalid-revolve-angle"));
  assert.equal(findDiagnostic(result, "profile-not-closed"), undefined);
});
