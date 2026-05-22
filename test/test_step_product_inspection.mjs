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

function assertNoViewerGeometryFields(result, label) {
  for (const key of ["rootNodes", "geometries", "materials", "stats"]) {
    assert(!hasOwn(result, key), `${label}: inspection result must not expose ${key}`);
  }
}

async function main() {
  const factory = loadOcctFactory();
  const m = await factory();

  assert.equal(typeof m.InspectStepProduct, "function", "InspectStepProduct must exist");

  const simplePart = new Uint8Array(readFileSync(resolve("test", "simple_part.step")));
  const inspected = m.InspectStepProduct(simplePart, {});

  assert.equal(inspected.status, "ok", "simple_part.step inspection should succeed");
  assert.equal(inspected.sourceFormat, "step", "inspection source format should be step");
  assert.equal(inspected.classification, "single_part", "simple_part.step should classify as single_part");
  assert.equal(inspected.rootCount, 1, "simple_part.step should have one root");
  assert.equal(inspected.uniquePartCount, 1, "simple_part.step should have one unique part");
  assert.equal(inspected.partOccurrenceCount, 1, "simple_part.step should have one part occurrence");
  assert.equal(inspected.assemblyPresent, false, "simple_part.step should not expose assembly structure");
  assert(Array.isArray(inspected.productTree) && inspected.productTree.length > 0, "inspection should expose productTree");
  assertNoViewerGeometryFields(inspected, "simple_part.step");

  const invalid = m.InspectStepProduct(new Uint8Array([0, 1, 2, 3]), {});
  assert.equal(invalid.status, "error", "invalid STEP bytes should return status=error");
  assert(typeof invalid.error?.code === "string" && invalid.error.code.length > 0, "invalid STEP should expose error.code");
  assert(typeof invalid.error?.message === "string" && invalid.error.message.length > 0, "invalid STEP should expose error.message");
  assertNoViewerGeometryFields(invalid, "invalid STEP");

  console.log("PASS test_step_product_inspection");
}

main().catch((error) => {
  console.error("FAIL:", error.message ?? error);
  process.exit(1);
});
