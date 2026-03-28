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

  const stepBytes = new Uint8Array(readFileSync(resolve("test", "simple_part.step")));

  const unsupported = m.AnalyzeOptimalOrientation("stl", stepBytes, {});
  assert(!unsupported.success, "unsupported format should fail");
  assert(/Unsupported format/i.test(unsupported.error), "unsupported format should explain the failure");

  const result = m.AnalyzeOptimalOrientation("step", stepBytes, { mode: "manufacturing" });
  assert(result.success, "AnalyzeOptimalOrientation(step) should succeed for simple_part.step");
  assert(Array.isArray(result.transform) && result.transform.length === 16, "orientation result should expose a 4x4 transform");
  assert(result.localFrame && Array.isArray(result.localFrame.origin), "orientation result should expose a localFrame");
  assert(result.bbox && typeof result.bbox.dx === "number", "orientation result should expose bbox dimensions");
  assert(typeof result.strategy === "string" && result.strategy.length > 0, "orientation result should expose strategy");
  assert(typeof result.confidence === "number", "orientation result should expose confidence");

  console.log("PASS test_optimal_orientation_api");
}

main().catch((error) => {
  console.error("FAIL:", error.message ?? error);
  process.exit(1);
});
