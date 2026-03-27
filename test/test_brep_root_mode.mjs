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

  const brepFixture = new Uint8Array(readFileSync(resolve("test", "as1_pe_203.brep")));

  const brepDefault = m.ReadBrepFile(brepFixture, {});
  assert(brepDefault.success, "ReadBrepFile default import should succeed");
  assert(brepDefault.rootNodes.length === 1, `default BREP rootMode should return one root, got ${brepDefault.rootNodes.length}`);

  const brepOneShape = m.ReadBrepFile(brepFixture, { rootMode: "one-shape" });
  assert(brepOneShape.success, "ReadBrepFile one-shape import should succeed");
  assert(brepOneShape.rootNodes.length === 1, `BREP one-shape should return one root, got ${brepOneShape.rootNodes.length}`);

  const brepMultiple = m.ReadBrepFile(brepFixture, { rootMode: "multiple-shapes" });
  assert(brepMultiple.success, "ReadBrepFile multiple-shapes import should succeed");
  assert(brepMultiple.rootNodes.length > 1, `BREP multiple-shapes should return more than one root, got ${brepMultiple.rootNodes.length}`);

  const brepDispatch = m.ReadFile("brep", brepFixture, { rootMode: "multiple-shapes" });
  assert(brepDispatch.success, "ReadFile(brep) multiple-shapes import should succeed");
  assert(brepDispatch.rootNodes.length === brepMultiple.rootNodes.length, "ReadFile(brep) should match ReadBrepFile root count");

  console.log("PASS test_brep_root_mode");
}

main().catch((error) => {
  console.error("FAIL:", error.message ?? error);
  process.exit(1);
});
