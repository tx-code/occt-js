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
  for (const key of ["rootNodes", "geometries", "materials", "stats"]) {
    assert(!hasOwn(result, key), `${label}: strict rejection must not expose ${key}`);
  }
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
  assert.equal(assembly.success, false, "assembly.step should be rejected by strict import");
  assert.equal(assembly.rejection?.code, "assembly_not_allowed", "assembly.step should expose assembly rejection code");
  assert.equal(assembly.inspection?.classification, "assembly", "assembly rejection should include inspection result");
  assertNoViewerGeometryFields(assembly, "assembly.step");

  console.log("PASS test_step_strict_part_import");
}

main().catch((error) => {
  console.error("FAIL:", error.message ?? error);
  process.exit(1);
});
