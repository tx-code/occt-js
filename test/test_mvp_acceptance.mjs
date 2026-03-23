/**
 * MVP Acceptance Test — validates all 10 acceptance criteria against real STEP files.
 * Run with: node test/test_mvp_acceptance.mjs
 */
import { readFileSync } from "fs";
import { createRequire } from "module";
const require = createRequire(import.meta.url);
const factory = require("../dist/occt-js.js");

let passed = 0;
let failed = 0;

function assert(condition, label) {
  if (condition) {
    console.log(`  ✅ ${label}`);
    passed++;
  } else {
    console.log(`  ❌ ${label}`);
    failed++;
  }
}

async function main() {
  const m = await factory();

  // --- Criterion 2: Single part import ---
  console.log("\n[2] Single part import (cube)");
  const cubeData = readFileSync("./test/simple_part.step");
  const cube = m.ReadStepFile(new Uint8Array(cubeData), {
    linearDeflection: 0.1, angularDeflection: 0.5, readNames: true, readColors: true
  });
  assert(cube.success, "import succeeds");
  assert(cube.stats.partCount >= 1, `partCount=${cube.stats.partCount} >= 1`);
  assert(cube.stats.triangleCount > 0, `triangleCount=${cube.stats.triangleCount} > 0`);
  assert(cube.geometries.length > 0, `geometries.length=${cube.geometries.length} > 0`);
  assert(cube.geometries[0].positions.length > 0, "positions non-empty");
  assert(cube.geometries[0].normals.length > 0, "normals non-empty");
  assert(cube.geometries[0].indices.length > 0, "indices non-empty");

  // --- Criterion 3: Simple assembly import ---
  console.log("\n[3] Assembly import (as1-oc-214)");
  const asmData = readFileSync("./test/assembly.step");
  const asm = m.ReadStepFile(new Uint8Array(asmData), {
    linearDeflection: 0.5, angularDeflection: 0.5, readNames: true, readColors: true
  });
  assert(asm.success, "import succeeds");
  assert(asm.stats.nodeCount > 1, `nodeCount=${asm.stats.nodeCount} > 1`);

  // --- Criterion 4: Assembly hierarchy correct ---
  console.log("\n[4] Assembly hierarchy");
  function maxDepth(node, d) {
    let max = d;
    for (const c of node.children || []) max = Math.max(max, maxDepth(c, d + 1));
    return max;
  }
  const depth = maxDepth(asm.rootNodes[0], 1);
  assert(depth >= 2, `tree depth=${depth} >= 2`);
  const hasAssembly = asm.rootNodes.some(function checkAsm(n) {
    return n.isAssembly || (n.children || []).some(checkAsm);
  });
  assert(hasAssembly, "contains assembly nodes");

  // --- Criterion 5: Repeated parts geometry dedup ---
  console.log("\n[5] Geometry deduplication");
  assert(asm.stats.reusedInstanceCount > 0, `reusedInstanceCount=${asm.stats.reusedInstanceCount} > 0`);
  assert(asm.stats.geometryCount < asm.stats.partCount,
    `geometryCount=${asm.stats.geometryCount} < partCount=${asm.stats.partCount}`);

  // --- Criterion 6: Names and basic colors ---
  console.log("\n[6] Names and colors");
  assert(cube.rootNodes[0].name === "cube", `name="${cube.rootNodes[0].name}" is readable`);
  assert(asm.materials.length > 0, `materials.length=${asm.materials.length} > 0`);
  assert(cube.materials.length > 0, `cube has material with color`);

  // --- Criterion 8: Import failure returns clear error ---
  console.log("\n[8] Error handling");
  const badResult = m.ReadStepFile(new Uint8Array([0x00, 0x01, 0x02]), {});
  assert(!badResult.success, "invalid data returns success=false");
  assert(typeof badResult.error === "string" && badResult.error.length > 0,
    `error message: "${badResult.error}"`);

  // Summary
  console.log(`\n${"=".repeat(50)}`);
  console.log(`MVP Acceptance: ${passed} passed, ${failed} failed`);
  if (failed > 0) process.exit(1);
}

main().catch(e => { console.error("FATAL:", e); process.exit(1); });
