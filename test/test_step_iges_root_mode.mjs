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

function flattenNodes(nodes) {
  const result = [];
  const stack = [...nodes];
  while (stack.length > 0) {
    const node = stack.pop();
    result.push(node);
    if (node.children?.length) {
      stack.push(...node.children);
    }
  }
  return result;
}

function rootSignature(result) {
  return result.rootNodes.map((node) => ({
    name: node.name,
    isAssembly: node.isAssembly,
    childCount: node.children.length,
    meshCount: node.meshes.length,
  }));
}

function assertUnitMetadata(result, label) {
  const hasSourceUnit = hasOwn(result, "sourceUnit");
  const hasUnitScale = hasOwn(result, "unitScaleToMeters");
  assert.equal(hasSourceUnit, hasUnitScale, `${label}: unit metadata should appear as a pair`);

  if (hasSourceUnit) {
    assert(typeof result.sourceUnit === "string" && result.sourceUnit.length > 0, `${label}: sourceUnit should be a non-empty string`);
    assert(typeof result.unitScaleToMeters === "number" && result.unitScaleToMeters > 0, `${label}: unitScaleToMeters should be a positive number`);
  }
}

function assertSameUnitMetadata(direct, generic, label) {
  assertUnitMetadata(direct, `${label} direct`);
  assertUnitMetadata(generic, `${label} generic`);
  assert.equal(hasOwn(direct, "sourceUnit"), hasOwn(generic, "sourceUnit"), `${label}: direct and generic should agree on sourceUnit presence`);
  assert.equal(hasOwn(direct, "unitScaleToMeters"), hasOwn(generic, "unitScaleToMeters"), `${label}: direct and generic should agree on unitScaleToMeters presence`);

  if (hasOwn(direct, "sourceUnit")) {
    assert.equal(direct.sourceUnit, generic.sourceUnit, `${label}: direct and generic sourceUnit should match`);
    assert.equal(direct.unitScaleToMeters, generic.unitScaleToMeters, `${label}: direct and generic unitScaleToMeters should match`);
  }
}

function assertReadParity(module, format, fixtureBytes, params, directMethod, label) {
  const direct = module[directMethod](fixtureBytes, params);
  const generic = module.ReadFile(format, fixtureBytes, params);

  assert(direct.success, `${label}: direct import should succeed`);
  assert(generic.success, `${label}: generic import should succeed`);
  assert.deepEqual(rootSignature(direct), rootSignature(generic), `${label}: direct and generic root signatures should match`);
  assertSameUnitMetadata(direct, generic, label);

  return { direct, generic };
}

async function main() {
  const factory = loadOcctFactory();
  const m = await factory();

  const multiRootStep = new Uint8Array(readFileSync(resolve("test", "two_free_shapes.step")));
  const igesFixture = new Uint8Array(readFileSync(resolve("test", "cube_10x10.igs")));
  const realisticMultiRootStep = new Uint8Array(readFileSync(resolve("test", "chassis-2roots.stp")));
  const inchStep = new Uint8Array(readFileSync(resolve("test", "as1-oc-214_inches.stp")));

  const stepDefault = assertReadParity(m, "step", multiRootStep, {}, "ReadStepFile", "STEP default two_free_shapes.step").direct;
  assert.equal(stepDefault.rootNodes.length, 1, "default STEP rootMode should return one root");
  assert(stepDefault.rootNodes[0].isAssembly, "default STEP one-shape root should be an assembly wrapper");
  assert.equal(stepDefault.rootNodes[0].children.length, 2, "default STEP one-shape root should expose both free shapes as children");

  const stepOneShape = assertReadParity(m, "step", multiRootStep, { rootMode: "one-shape" }, "ReadStepFile", "STEP one-shape two_free_shapes.step").direct;
  assert.equal(stepOneShape.rootNodes.length, 1, "STEP one-shape should return one root");
  assert(stepOneShape.rootNodes[0].isAssembly, "STEP one-shape should preserve the synthetic assembly wrapper");
  assert.equal(stepOneShape.rootNodes[0].children.length, 2, "STEP one-shape should expose both free shapes as children");

  const stepMultiple = assertReadParity(m, "step", multiRootStep, { rootMode: "multiple-shapes" }, "ReadStepFile", "STEP multiple-shapes two_free_shapes.step").direct;
  assert.equal(stepMultiple.rootNodes.length, 2, "STEP multiple-shapes should return both free shapes as roots");
  assert(stepMultiple.rootNodes.every((node) => node.children.length === 0), "STEP multiple-shapes roots should remain direct free-shape nodes for this fixture");

  const realisticDefault = assertReadParity(m, "step", realisticMultiRootStep, {}, "ReadStepFile", "STEP default chassis-2roots.stp").direct;
  assert.equal(realisticDefault.rootNodes.length, 1, "default realistic STEP rootMode should return one root");
  assert(realisticDefault.rootNodes[0].isAssembly, "default realistic STEP rootMode should preserve the synthetic assembly wrapper");

  const realisticOneShape = assertReadParity(m, "step", realisticMultiRootStep, { rootMode: "one-shape" }, "ReadStepFile", "STEP one-shape chassis-2roots.stp").direct;
  assert.equal(realisticOneShape.rootNodes.length, 1, "STEP one-shape should return one logical root for chassis-2roots.stp");

  const realisticMultiple = assertReadParity(m, "step", realisticMultiRootStep, { rootMode: "multiple-shapes" }, "ReadStepFile", "STEP multiple-shapes chassis-2roots.stp").direct;
  assert.equal(realisticMultiple.rootNodes.length, 2, "realistic STEP multiple-shapes should return both free shapes as roots");

  const inchStepDefault = assertReadParity(m, "step", inchStep, {}, "ReadStepFile", "STEP default as1-oc-214_inches.stp").direct;
  const inchNodes = flattenNodes(inchStepDefault.rootNodes);
  assert(inchNodes.length > 0, "inch STEP import should produce at least one node");

  const igesDefault = assertReadParity(m, "iges", igesFixture, {}, "ReadIgesFile", "IGES default cube_10x10.igs").direct;
  assert.equal(igesDefault.rootNodes.length, 1, "default IGES rootMode should return one root");

  const igesOneShape = assertReadParity(m, "iges", igesFixture, { rootMode: "one-shape" }, "ReadIgesFile", "IGES one-shape cube_10x10.igs").direct;
  assert.equal(igesOneShape.rootNodes.length, 1, "IGES one-shape should return one root");

  const igesMultiple = assertReadParity(m, "iges", igesFixture, { rootMode: "multiple-shapes" }, "ReadIgesFile", "IGES multiple-shapes cube_10x10.igs").direct;
  assert.equal(igesMultiple.rootNodes.length, 1, "IGES multiple-shapes should remain one root for cube_10x10.igs");

  console.log("PASS test_step_iges_root_mode");
}

main().catch((error) => {
  console.error("FAIL:", error.message ?? error);
  process.exit(1);
});
