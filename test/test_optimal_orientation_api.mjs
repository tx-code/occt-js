import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { loadOcctFactory } from "./load_occt_factory.mjs";

const GOLDEN = JSON.parse(readFileSync(resolve("test", "orientation_reference_golden.json"), "utf8"));

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

function assertNumberArray(value, expectedLength, label) {
  assert(Array.isArray(value), `${label}: should be an array`);
  assert.equal(value.length, expectedLength, `${label}: should have length ${expectedLength}`);
  for (let index = 0; index < value.length; index += 1) {
    assert(typeof value[index] === "number", `${label}[${index}]: should be numeric`);
  }
}

function assertOrientationContract(result, label) {
  assert(result && typeof result === "object", `${label}: result should be an object`);
  assert.equal(result.success, true, `${label}: success should be true`);
  assertNumberArray(result.transform, 16, `${label}: transform`);
  assert(result.localFrame && typeof result.localFrame === "object", `${label}: localFrame should be present`);
  assertNumberArray(result.localFrame.origin, 3, `${label}: localFrame.origin`);
  assertNumberArray(result.localFrame.xDir, 3, `${label}: localFrame.xDir`);
  assertNumberArray(result.localFrame.yDir, 3, `${label}: localFrame.yDir`);
  assertNumberArray(result.localFrame.zDir, 3, `${label}: localFrame.zDir`);
  assert(result.bbox && typeof result.bbox === "object", `${label}: bbox should be present`);
  assert(typeof result.bbox.dx === "number", `${label}: bbox.dx should be numeric`);
  assert(typeof result.bbox.dy === "number", `${label}: bbox.dy should be numeric`);
  assert(typeof result.bbox.dz === "number", `${label}: bbox.dz should be numeric`);
  assert(typeof result.strategy === "string" && result.strategy.length > 0, `${label}: strategy should be a non-empty string`);
  assert(typeof result.confidence === "number", `${label}: confidence should be numeric`);
  assert(result.stage1 && typeof result.stage1 === "object", `${label}: stage1 should be present`);
  assert(typeof result.stage1.usedCylinderSupport === "boolean", `${label}: stage1.usedCylinderSupport should be boolean`);
  assertNumberArray(result.stage1.detectedAxis, 3, `${label}: stage1.detectedAxis`);
  assert(result.stage2 && typeof result.stage2 === "object", `${label}: stage2 should be present`);
  assert(typeof result.stage2.rotationAroundZDeg === "number", `${label}: stage2.rotationAroundZDeg should be numeric`);

  const hasSourceUnit = hasOwn(result, "sourceUnit");
  const hasUnitScale = hasOwn(result, "unitScaleToMeters");
  assert.equal(hasSourceUnit, hasUnitScale, `${label}: unit metadata should appear as a pair`);
  if (hasSourceUnit) {
    assert(typeof result.sourceUnit === "string" && result.sourceUnit.length > 0, `${label}: sourceUnit should be a non-empty string`);
    assert(typeof result.unitScaleToMeters === "number" && result.unitScaleToMeters > 0, `${label}: unitScaleToMeters should be positive`);
  }
}

async function main() {
  const factory = loadOcctFactory();
  const m = await factory();

  const stepBytes = new Uint8Array(readFileSync(resolve("test", "simple_part.step")));

  const unsupported = m.AnalyzeOptimalOrientation("stl", stepBytes, {});
  assert(!unsupported.success, "unsupported format should fail");
  assert(/Unsupported format/i.test(unsupported.error), "unsupported format should explain the failure");

  const unsupportedMode = m.AnalyzeOptimalOrientation("step", stepBytes, { mode: "presentation" });
  assert(!unsupportedMode.success, "unsupported orientation mode should fail");
  assert(/Unsupported orientation mode/i.test(unsupportedMode.error), "unsupported orientation mode should explain the failure");

  for (const format of ["step", "iges", "brep"]) {
    const fixture = GOLDEN[format].fixture;
    const bytes = new Uint8Array(readFileSync(resolve("test", fixture)));
    const result = m.AnalyzeOptimalOrientation(format, bytes, { mode: "manufacturing" });
    assertOrientationContract(result, `AnalyzeOptimalOrientation(${format})`);

    if (format === "iges") {
      const repeated = m.AnalyzeOptimalOrientation(format, bytes, { mode: "manufacturing" });
      assertOrientationContract(repeated, `AnalyzeOptimalOrientation(${format}) repeat`);
      assert.equal(repeated.strategy, result.strategy, "repeat IGES orientation should keep strategy stable");
      assert.equal(repeated.sourceUnit, result.sourceUnit, "repeat IGES orientation should keep source unit stable");
      assert.equal(repeated.unitScaleToMeters, result.unitScaleToMeters, "repeat IGES orientation should keep unit scale stable");
      assert.equal(repeated.bbox.dx, result.bbox.dx, "repeat IGES orientation should keep bbox.dx stable");
      assert.equal(repeated.bbox.dy, result.bbox.dy, "repeat IGES orientation should keep bbox.dy stable");
      assert.equal(repeated.bbox.dz, result.bbox.dz, "repeat IGES orientation should keep bbox.dz stable");
    }
  }

  console.log("PASS test_optimal_orientation_api");
}

main().catch((error) => {
  console.error("FAIL:", error.message ?? error);
  process.exit(1);
});
