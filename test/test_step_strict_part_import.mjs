import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { loadOcctFactory } from "./load_occt_factory.mjs";

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

assert.equal = function(actual, expected, message) {
  if (actual !== expected) {
    throw new Error(`${message} (got ${actual}, expected ${expected})`);
  }
};

function hasOwn(value, key) {
  return !!value && Object.prototype.hasOwnProperty.call(value, key);
}

function loadFixture(name) {
  return new Uint8Array(readFileSync(resolve("test", name)));
}

function assertNoViewerGeometryFields(result, label) {
  for (const key of ["rootNodes", "geometries", "materials", "stats", "triangleCount", "geometryCount", "meshCount"]) {
    assert(!hasOwn(result, key), `${label}: strict rejection must not expose ${key}`);
  }
}

function assertStrictRejection(result, expectedCode, label) {
  assert.equal(result.success, false, `${label} should be rejected by strict import`);
  assert.equal(result.sourceFormat, "step", `${label} rejection should keep sourceFormat=step`);
  assert.equal(result.rejection?.code, expectedCode, `${label} should expose ${expectedCode}`);
  assert(typeof result.error === "string" && result.error.length > 0, `${label} should expose an error message`);
  assert(typeof result.rejection?.message === "string" && result.rejection.message.length > 0, `${label} should expose a rejection message`);
  assertNoViewerGeometryFields(result, label);
}

async function main() {
  const factory = loadOcctFactory();
  const m = await factory();

  assert.equal(typeof m.ReadStepPartFile, "function", "ReadStepPartFile must exist");

  const singlePart = m.ReadStepPartFile(loadFixture("simple_part.step"), {});
  assert.equal(singlePart.success, true, "simple_part.step should import as a strict part");
  assert(Array.isArray(singlePart.rootNodes), "simple_part.step should expose viewer roots");
  assert(Array.isArray(singlePart.geometries), "simple_part.step should expose geometries");
  assert.equal(singlePart.inspection?.status, "ok", "strict success should include inspection status");
  assert.equal(singlePart.inspection?.classification, "single_part", "strict success should include single_part inspection");

  const assembly = m.ReadStepPartFile(loadFixture("assembly.step"), {});
  assertStrictRejection(assembly, "assembly_not_allowed", "assembly.step");
  assert.equal(assembly.inspection?.classification, "assembly", "assembly rejection should include inspection result");
  assert.equal(assembly.rejection?.classification, "assembly", "assembly rejection should summarize classification");

  const multiPart = m.ReadStepPartFile(loadFixture("two_free_shapes.step"), {});
  assertStrictRejection(multiPart, "multi_part_not_allowed", "two_free_shapes.step");
  assert.equal(multiPart.inspection?.classification, "multi_part", "multi-part rejection should include inspection result");
  assert.equal(multiPart.rejection?.classification, "multi_part", "multi-part rejection should summarize classification");

  const syntheticRootAttempt = m.ReadStepPartFile(loadFixture("two_free_shapes.step"), { rootMode: "one-shape" });
  assertStrictRejection(syntheticRootAttempt, "multi_part_not_allowed", "two_free_shapes.step rootMode=one-shape");
  assert.equal(
    syntheticRootAttempt.inspection?.classification,
    "multi_part",
    "synthetic viewer root must not make a multi-part STEP importable"
  );

  const invalid = m.ReadStepPartFile(new Uint8Array([0, 1, 2, 3]), {});
  assertStrictRejection(invalid, "inspection_failed", "invalid STEP bytes");
  assert.equal(invalid.inspection?.status, "error", "invalid bytes rejection should include failed inspection");
  assert.equal(invalid.inspection?.error?.code, "read_failed", "invalid bytes rejection should preserve read_failed");
  assert.equal(invalid.rejection?.inspectionErrorCode, "read_failed", "invalid bytes rejection should summarize read_failed");

  const selected = m.ReadStepPartFile(loadFixture("simple_part.step"), {
    selection: { kind: "occurrence", occurrenceRef: "occurrence:1" },
  });
  assertStrictRejection(selected, "selection_not_supported", "selected occurrence import");
  assert(!hasOwn(selected, "inspection"), "selection rejection should not inspect or import geometry");

  console.log("PASS test_step_strict_part_import");
}

main().catch((error) => {
  console.error("FAIL:", error.message ?? error);
  process.exit(1);
});
