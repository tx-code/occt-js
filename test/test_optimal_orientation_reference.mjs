import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { loadOcctFactory } from "./load_occt_factory.mjs";

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

function dot(a, b) {
  return a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
}

function length(v) {
  return Math.hypot(v[0], v[1], v[2]);
}

function assertOrthonormal(frame, label) {
  assert(Math.abs(length(frame.xDir) - 1) < 1e-4, `${label}: xDir should be unit length`);
  assert(Math.abs(length(frame.yDir) - 1) < 1e-4, `${label}: yDir should be unit length`);
  assert(Math.abs(length(frame.zDir) - 1) < 1e-4, `${label}: zDir should be unit length`);
  assert(Math.abs(dot(frame.xDir, frame.yDir)) < 1e-4, `${label}: x/y should be orthogonal`);
  assert(Math.abs(dot(frame.xDir, frame.zDir)) < 1e-4, `${label}: x/z should be orthogonal`);
  assert(Math.abs(dot(frame.yDir, frame.zDir)) < 1e-4, `${label}: y/z should be orthogonal`);
}

function assertSortedBbox(bbox, label) {
  assert(bbox.dx >= bbox.dy, `${label}: bbox.dx should be >= bbox.dy`);
  assert(bbox.dy >= bbox.dz, `${label}: bbox.dy should be >= bbox.dz`);
}

async function main() {
  const factory = loadOcctFactory();
  const m = await factory();

  const cases = [
    ["step", "ANC101.stp"],
    ["iges", "bearing.igs"],
    ["brep", "as1_pe_203.brep"],
  ];

  for (const [format, fixture] of cases) {
    const bytes = new Uint8Array(readFileSync(resolve("test", fixture)));
    const result = m.AnalyzeOptimalOrientation(format, bytes, { mode: "manufacturing" });
    assert(result.success, `${fixture}: orientation analysis should succeed`);
    assert(result.localFrame, `${fixture}: localFrame should be present`);
    assert(result.bbox, `${fixture}: bbox should be present`);
    assert(result.stage1, `${fixture}: stage1 diagnostics should be present`);
    assert(result.stage2, `${fixture}: stage2 diagnostics should be present`);
    assert(Array.isArray(result.stage1.detectedAxis) && result.stage1.detectedAxis.length === 3, `${fixture}: stage1.detectedAxis should be a 3D vector`);
    assert(typeof result.stage2.rotationAroundZDeg === "number", `${fixture}: stage2.rotationAroundZDeg should be numeric`);
    assertOrthonormal(result.localFrame, fixture);
    assertSortedBbox(result.bbox, fixture);
  }

  const stepBytes = new Uint8Array(readFileSync(resolve("test", "simple_part.step")));
  const preset = m.AnalyzeOptimalOrientation("step", stepBytes, {
    mode: "manufacturing",
    presetAxis: {
      origin: [0, 0, 0],
      direction: [1, 0, 0],
    },
  });
  assert(preset.success, "preset-axis analysis should succeed");
  assert(preset.stage1, "preset-axis analysis should still report stage1");
  assert(Array.isArray(preset.stage1.detectedAxis) && preset.stage1.detectedAxis.length === 3, "preset-axis analysis should expose detectedAxis");

  console.log("PASS test_optimal_orientation_reference");
}

main().catch((error) => {
  console.error("FAIL:", error.message ?? error);
  process.exit(1);
});
