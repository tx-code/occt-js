import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { loadOcctFactory } from "./load_occt_factory.mjs";

const GOLDEN = JSON.parse(readFileSync(resolve("test", "orientation_reference_golden.json"), "utf8"));
const ABS_TOL = 1e-6;
const REL_TOL = 1e-5;

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

function hasOwn(value, key) {
  return !!value && Object.prototype.hasOwnProperty.call(value, key);
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

function assertNear(actual, expected, label, absTol = ABS_TOL, relTol = REL_TOL) {
  const tol = Math.max(absTol, Math.abs(expected) * relTol);
  assert(Math.abs(actual - expected) <= tol, `${label}: expected ${expected}, got ${actual}, tol=${tol}`);
}

function assertVectorNear(actual, expected, label) {
  assert(Array.isArray(actual) && actual.length === expected.length, `${label}: vector length mismatch`);
  for (let i = 0; i < expected.length; i += 1) {
    assertNear(actual[i], expected[i], `${label}[${i}]`);
  }
}

function assertOrientationContract(result, label) {
  assert(result.success, `${label}: orientation analysis should succeed`);
  assert(Array.isArray(result.transform) && result.transform.length === 16, `${label}: transform should be a 4x4 matrix`);
  assert(result.localFrame, `${label}: localFrame should be present`);
  assert(result.bbox, `${label}: bbox should be present`);
  assert(result.stage1, `${label}: stage1 diagnostics should be present`);
  assert(result.stage2, `${label}: stage2 diagnostics should be present`);
  assert(Array.isArray(result.stage1.detectedAxis) && result.stage1.detectedAxis.length === 3, `${label}: stage1.detectedAxis should be a 3D vector`);
  assert(typeof result.stage1.usedCylinderSupport === "boolean", `${label}: stage1.usedCylinderSupport should be boolean`);
  assert(typeof result.stage2.rotationAroundZDeg === "number", `${label}: stage2.rotationAroundZDeg should be numeric`);

  const hasSourceUnit = hasOwn(result, "sourceUnit");
  const hasUnitScale = hasOwn(result, "unitScaleToMeters");
  assert(hasSourceUnit === hasUnitScale, `${label}: unit metadata should appear as a pair`);
}

async function main() {
  const factory = loadOcctFactory();
  const m = await factory();

  const cases = ["step", "iges", "brep"];

  for (const format of cases) {
    const golden = GOLDEN[format];
    const fixture = golden.fixture;
    const bytes = new Uint8Array(readFileSync(resolve("test", fixture)));
    const result = m.AnalyzeOptimalOrientation(format, bytes, { mode: "manufacturing" });
    assertOrientationContract(result, fixture);
    assert(result.strategy === golden.strategy, `${fixture}: strategy should be ${golden.strategy}, got ${result.strategy}`);
    assert(result.stage1.usedCylinderSupport === golden.usedCylinderSupport, `${fixture}: usedCylinderSupport should be ${golden.usedCylinderSupport}`);
    assertNear(result.confidence, golden.confidence, `${fixture}: confidence`, 1e-9, 1e-9);
    assertNear(result.stage2.rotationAroundZDeg, golden.rotationAroundZDeg, `${fixture}: rotationAroundZDeg`, 1e-5, 1e-5);
    assertVectorNear(result.stage1.detectedAxis, golden.detectedAxis, `${fixture}: detectedAxis`);
    assertVectorNear(result.transform, golden.transform, `${fixture}: transform`);
    assertVectorNear(result.localFrame.origin, golden.localFrame.origin, `${fixture}: localFrame.origin`);
    assertVectorNear(result.localFrame.xDir, golden.localFrame.xDir, `${fixture}: localFrame.xDir`);
    assertVectorNear(result.localFrame.yDir, golden.localFrame.yDir, `${fixture}: localFrame.yDir`);
    assertVectorNear(result.localFrame.zDir, golden.localFrame.zDir, `${fixture}: localFrame.zDir`);
    assertNear(result.bbox.dx, golden.bbox.dx, `${fixture}: bbox.dx`);
    assertNear(result.bbox.dy, golden.bbox.dy, `${fixture}: bbox.dy`);
    assertNear(result.bbox.dz, golden.bbox.dz, `${fixture}: bbox.dz`);

    if (golden.strategy.startsWith("planar-base") || golden.strategy.startsWith("largest-planar-base")) {
      assert(hasOwn(result.stage1, "baseFaceId"), `${fixture}: planar-base strategies should report stage1.baseFaceId`);
      assert(typeof result.stage1.baseFaceId === "number" && result.stage1.baseFaceId > 0, `${fixture}: stage1.baseFaceId should be a positive number`);
    } else {
      assert(!hasOwn(result.stage1, "baseFaceId"), `${fixture}: non-planar strategies should omit stage1.baseFaceId`);
    }

    if (golden.sourceUnit) {
      assert(result.sourceUnit === golden.sourceUnit, `${fixture}: sourceUnit should be ${golden.sourceUnit}, got ${result.sourceUnit}`);
    } else {
      assert(!hasOwn(result, "sourceUnit"), `${fixture}: sourceUnit should be absent`);
    }
    if (golden.unitScaleToMeters !== undefined) {
      assertNear(result.unitScaleToMeters, golden.unitScaleToMeters, `${fixture}: unitScaleToMeters`, 1e-12, 1e-12);
    } else {
      assert(!hasOwn(result, "unitScaleToMeters"), `${fixture}: unitScaleToMeters should be absent`);
    }
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
  assertOrientationContract(preset, "preset-axis analysis");
  assert(Array.isArray(preset.stage1.detectedAxis) && preset.stage1.detectedAxis.length === 3, "preset-axis analysis should expose detectedAxis");
  assert(/^preset-axis/.test(preset.strategy), `preset-axis analysis should report a preset-axis strategy, got ${preset.strategy}`);
  assert(!hasOwn(preset.stage1, "baseFaceId"), "preset-axis analysis should not fabricate a planar baseFaceId");

  console.log("PASS test_optimal_orientation_reference");
}

main().catch((error) => {
  console.error("FAIL:", error.message ?? error);
  process.exit(1);
});
