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
assert.deepEqual = function(actual, expected, message) {
  const actualJson = JSON.stringify(actual);
  const expectedJson = JSON.stringify(expected);
  if (actualJson !== expectedJson) {
    throw new Error(message);
  }
};

function hasOwn(value, key) {
  return !!value && Object.prototype.hasOwnProperty.call(value, key);
}

function rootSignature(result) {
  return result.rootNodes.map((node) => ({
    name: node.name,
    isAssembly: node.isAssembly,
    childCount: node.children.length,
    meshCount: node.meshes.length,
  }));
}

function assertUnitMetadataAbsent(result, label) {
  assert.equal(hasOwn(result, "sourceUnit"), false, `${label}: BREP should not expose sourceUnit`);
  assert.equal(hasOwn(result, "unitScaleToMeters"), false, `${label}: BREP should not expose unitScaleToMeters`);
}

function assertReadParity(module, fixtureBytes, params, label) {
  const direct = module.ReadBrepFile(fixtureBytes, params);
  const generic = module.ReadFile("brep", fixtureBytes, params);

  assert(direct.success, `${label}: direct import should succeed`);
  assert(generic.success, `${label}: generic import should succeed`);
  assert.deepEqual(rootSignature(direct), rootSignature(generic), `${label}: direct and generic root signatures should match`);
  assertUnitMetadataAbsent(direct, `${label} direct`);
  assertUnitMetadataAbsent(generic, `${label} generic`);

  return { direct, generic };
}

async function main() {
  const factory = loadOcctFactory();
  const m = await factory();

  const brepFixture = new Uint8Array(readFileSync(resolve("test", "as1_pe_203.brep")));
  const multiRootFixture = new Uint8Array(readFileSync(resolve("test", "nonmanifold_cells.brep")));

  const brepDefault = assertReadParity(m, brepFixture, {}, "BREP default as1_pe_203.brep").direct;
  assert.equal(brepDefault.rootNodes.length, 1, "default BREP rootMode should return one root");

  const brepOneShape = assertReadParity(m, brepFixture, { rootMode: "one-shape" }, "BREP one-shape as1_pe_203.brep").direct;
  assert.equal(brepOneShape.rootNodes.length, 1, "BREP one-shape should return one root");

  const brepMultiple = assertReadParity(m, brepFixture, { rootMode: "multiple-shapes" }, "BREP multiple-shapes as1_pe_203.brep").direct;
  assert.equal(brepMultiple.rootNodes.length, 3, "BREP multiple-shapes should expose the three direct top-level children in as1_pe_203.brep");

  const isolatedDefault = assertReadParity(m, multiRootFixture, {}, "BREP default nonmanifold_cells.brep").direct;
  assert.equal(isolatedDefault.rootNodes.length, 1, "default realistic BREP rootMode should return one root");

  const isolatedOneShape = assertReadParity(m, multiRootFixture, { rootMode: "one-shape" }, "BREP one-shape nonmanifold_cells.brep").direct;
  assert.equal(isolatedOneShape.rootNodes.length, 1, "BREP one-shape should keep nonmanifold_cells.brep as one root");

  const isolatedMultiple = assertReadParity(m, multiRootFixture, { rootMode: "multiple-shapes" }, "BREP multiple-shapes nonmanifold_cells.brep").direct;
  assert.equal(isolatedMultiple.rootNodes.length, 15, "BREP multiple-shapes should expose the 15 direct top-level children in nonmanifold_cells.brep");

  console.log("PASS test_brep_root_mode");
}

main().catch((error) => {
  console.error("FAIL:", error.message ?? error);
  process.exit(1);
});
