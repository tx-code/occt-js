import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { loadOcctFactory } from "./load_occt_factory.mjs";

const factory = loadOcctFactory();

async function loadFixture(name) {
  return new Uint8Array(await readFile(new URL(`./${name}`, import.meta.url)));
}

async function createModule() {
  return factory();
}

function assertExactGeometryBindings(result, label) {
  assert.equal(result?.success, true, `${label}: success should be true`);
  assert.ok(Array.isArray(result?.geometries), `${label}: geometries should be an array`);
  assert.ok(Array.isArray(result?.exactGeometryBindings), `${label}: exactGeometryBindings should be an array`);
  assert.equal(
    result.exactGeometryBindings.length,
    result.geometries.length,
    `${label}: exactGeometryBindings should stay aligned with geometries`,
  );

  for (const [index, binding] of result.exactGeometryBindings.entries()) {
    assert.equal(
      typeof binding?.exactShapeHandle,
      "number",
      `${label}: binding ${index} should expose a numeric exactShapeHandle`,
    );
    assert.ok(
      Number.isInteger(binding.exactShapeHandle) && binding.exactShapeHandle > 0,
      `${label}: binding ${index} should expose a positive exactShapeHandle`,
    );
  }
}

test("exact open exposes one exactGeometryBinding per exported geometry", async () => {
  const module = await createModule();
  const stepBytes = await loadFixture("simple_part.step");

  const result = module.OpenExactStepModel(stepBytes, {});

  assertExactGeometryBindings(result, "simple_part.step");
});

test("reused geometry definitions do not inflate exactGeometryBindings beyond geometries.length", async () => {
  const module = await createModule();
  const assemblyBytes = await loadFixture("assembly.step");

  const result = module.OpenExactStepModel(assemblyBytes, {});

  assertExactGeometryBindings(result, "assembly.step");
  assert.ok(
    Number.isFinite(result?.stats?.reusedInstanceCount) && result.stats.reusedInstanceCount > 0,
    "assembly.step should exercise reused geometry definitions",
  );
});

test("stateless ReadStepFile remains exactGeometryBindings-free", async () => {
  const module = await createModule();
  const stepBytes = await loadFixture("simple_part.step");

  const stateless = module.ReadStepFile(stepBytes, {});

  assert.equal(stateless?.success, true);
  assert.equal("exactGeometryBindings" in stateless, false);
  assert.ok(Array.isArray(stateless?.geometries));
});
