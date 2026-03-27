import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { loadOcctFactory } from "./load_occt_factory.mjs";

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
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

async function main() {
  const factory = loadOcctFactory();
  const m = await factory();

  const multiRootStep = new Uint8Array(readFileSync(resolve("test", "two_free_shapes.step")));
  const igesFixture = new Uint8Array(readFileSync(resolve("test", "cube_10x10.igs")));
  const realisticMultiRootStep = new Uint8Array(readFileSync(resolve("test", "chassis-2roots.stp")));
  const inchStep = new Uint8Array(readFileSync(resolve("test", "as1-oc-214_inches.stp")));

  const stepDefault = m.ReadStepFile(multiRootStep, {});
  assert(stepDefault.success, "ReadStepFile default import should succeed for two_free_shapes.step");
  assert(stepDefault.rootNodes.length === 1, `default STEP rootMode should return one root, got ${stepDefault.rootNodes.length}`);
  assert(stepDefault.rootNodes[0].isAssembly, "default STEP one-shape root should be an assembly wrapper");
  assert(stepDefault.rootNodes[0].children.length === 2, `default STEP one-shape root should expose both free shapes as children, got ${stepDefault.rootNodes[0].children.length}`);

  const stepOneShape = m.ReadStepFile(multiRootStep, { rootMode: "one-shape" });
  assert(stepOneShape.success, "ReadStepFile one-shape import should succeed for two_free_shapes.step");
  assert(stepOneShape.rootNodes.length === 1, `STEP one-shape should return one root, got ${stepOneShape.rootNodes.length}`);
  assert(stepOneShape.rootNodes[0].children.length === 2, `STEP one-shape should expose both free shapes as children, got ${stepOneShape.rootNodes[0].children.length}`);

  const stepMultiple = m.ReadStepFile(multiRootStep, { rootMode: "multiple-shapes" });
  assert(stepMultiple.success, "ReadStepFile multiple-shapes import should succeed for two_free_shapes.step");
  assert(stepMultiple.rootNodes.length > 1, `STEP multiple-shapes should return more than one root, got ${stepMultiple.rootNodes.length}`);
  assert(stepMultiple.rootNodes.every((node) => node.children.length === 0), "STEP multiple-shapes roots should remain direct free-shape nodes for this fixture");

  const stepDispatch = m.ReadFile("step", multiRootStep, { rootMode: "multiple-shapes" });
  assert(stepDispatch.success, "ReadFile(step) multiple-shapes import should succeed");
  assert(stepDispatch.rootNodes.length === stepMultiple.rootNodes.length, "ReadFile(step) should match ReadStepFile root count");

  const realisticDefault = m.ReadStepFile(realisticMultiRootStep, {});
  assert(realisticDefault.success, "ReadStepFile default import should succeed for chassis-2roots.stp");
  assert(realisticDefault.rootNodes.length === 1, `default realistic STEP rootMode should return one root, got ${realisticDefault.rootNodes.length}`);

  const realisticMultiple = m.ReadStepFile(realisticMultiRootStep, { rootMode: "multiple-shapes" });
  assert(realisticMultiple.success, "ReadStepFile multiple-shapes import should succeed for chassis-2roots.stp");
  assert(realisticMultiple.rootNodes.length > 1, `realistic STEP multiple-shapes should return more than one root, got ${realisticMultiple.rootNodes.length}`);

  const realisticDispatch = m.ReadFile("step", realisticMultiRootStep, { rootMode: "multiple-shapes" });
  assert(realisticDispatch.success, "ReadFile(step) multiple-shapes import should succeed for chassis-2roots.stp");
  assert(realisticDispatch.rootNodes.length === realisticMultiple.rootNodes.length, "ReadFile(step) should match realistic STEP root count");

  const inchStepDefault = m.ReadStepFile(inchStep, {});
  assert(inchStepDefault.success, "ReadStepFile default import should succeed for as1-oc-214_inches.stp");
  assert(typeof inchStepDefault.sourceUnit === "string" && inchStepDefault.sourceUnit.length > 0, "inch STEP import should report sourceUnit");
  assert(typeof inchStepDefault.unitScaleToMeters === "number" && inchStepDefault.unitScaleToMeters > 0, "inch STEP import should report a positive unitScaleToMeters");
  const inchNodes = flattenNodes(inchStepDefault.rootNodes);
  assert(inchNodes.length > 0, "inch STEP import should produce at least one node");

  const igesDefault = m.ReadIgesFile(igesFixture, {});
  assert(igesDefault.success, "ReadIgesFile default import should succeed");
  assert(igesDefault.rootNodes.length === 1, `default IGES rootMode should return one root, got ${igesDefault.rootNodes.length}`);

  const igesDispatch = m.ReadFile("iges", igesFixture, {});
  assert(igesDispatch.success, "ReadFile(iges) default import should succeed");
  assert(igesDispatch.rootNodes.length === 1, `ReadFile(iges) default rootMode should return one root, got ${igesDispatch.rootNodes.length}`);

  console.log("PASS test_step_iges_root_mode");
}

main().catch((error) => {
  console.error("FAIL:", error.message ?? error);
  process.exit(1);
});
