import test from "node:test";
import assert from "node:assert/strict";
import { loadOcctFactory } from "./load_occt_factory.mjs";

const factory = loadOcctFactory();

async function createModule() {
  return factory();
}

function createValidLocal2DSpec() {
  return {
    version: 1,
    start: [-2, 0],
    segments: [
      {
        kind: "line",
        id: "base",
        tag: "bottom",
        end: [2, 0],
      },
      {
        kind: "line",
        id: "right-wall",
        tag: "wall",
        end: [2, 2],
      },
      {
        kind: "arc_center",
        id: "crown",
        tag: "cap",
        center: [0, 2],
        end: [-2, 2],
      },
      {
        kind: "line",
        id: "left-wall",
        tag: "wall",
        end: [-2, 0],
      },
    ],
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

test("ValidateProfile2DSpec accepts a closed line-and-arc profile in generic local 2D coordinates", async () => {
  const module = await createModule();
  const result = module.ValidateProfile2DSpec(createValidLocal2DSpec());

  assert.deepEqual(result, {
    ok: true,
    diagnostics: [],
  });
});

test("ValidateProfile2DSpec rejects open loops and malformed arcs with typed diagnostics", async () => {
  const module = await createModule();
  const spec = createValidLocal2DSpec();
  spec.segments = [
    {
      kind: "line",
      end: [2, 0],
    },
    {
      kind: "arc_center",
      id: "bad-center-arc",
      center: [3, 1],
      end: [1, 3],
    },
    {
      kind: "arc_3pt",
      id: "bad-three-point-arc",
      through: [0, 4],
      end: [-1, 5],
    },
  ];

  const result = module.ValidateProfile2DSpec(spec);

  assert.equal(result?.ok, false);
  assertTypedDiagnostics(result);

  const invalidArcDiagnostics = result.diagnostics.filter((diagnostic) => diagnostic.code === "invalid-arc");
  assert.ok(invalidArcDiagnostics.length >= 2, "expected invalid-arc diagnostics for both malformed arc kinds");
  assert.ok(invalidArcDiagnostics.some((diagnostic) => diagnostic.segmentIndex === 1));
  assert.ok(invalidArcDiagnostics.some((diagnostic) => diagnostic.segmentIndex === 2));

  const profileNotClosed = findDiagnostic(result, "profile-not-closed");
  assert.ok(profileNotClosed, "expected profile-not-closed diagnostic");
  assert.equal(profileNotClosed.path, "segments");
});
