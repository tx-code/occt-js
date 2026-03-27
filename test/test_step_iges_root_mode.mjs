import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { loadOcctFactory } from "./load_occt_factory.mjs";

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

async function main() {
  const factory = loadOcctFactory();
  const m = await factory();

  const multiRootStep = new Uint8Array(readFileSync(resolve("test", "two_free_shapes.step")));
  const igesFixture = new Uint8Array(readFileSync(resolve("test", "cube_10x10.igs")));

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
