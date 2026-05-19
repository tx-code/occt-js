import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { loadOcctFactory } from "./load_occt_factory.mjs";

const factory = loadOcctFactory();
const XDE_LABEL_PATH_PATTERN = /^\d+(?::\d+)+$/;

async function loadFixture(name) {
  return new Uint8Array(await readFile(new URL(`./${name}`, import.meta.url)));
}

async function createModule() {
  return factory();
}

function collectNodeIds(nodes, ids = []) {
  for (const node of nodes ?? []) {
    if (typeof node?.id === "string") {
      ids.push(node.id);
    }
    collectNodeIds(node?.children, ids);
  }
  return ids;
}

function assertOpaquePublicNodeIds(result, label) {
  const ids = collectNodeIds(result?.rootNodes);
  assert.ok(ids.length > 0, `${label}: should expose public node ids`);
  assert.equal(
    new Set(ids).size,
    ids.length,
    `${label}: public node ids should be unique per occurrence`,
  );
  for (const id of ids) {
    assert.doesNotMatch(
      id,
      XDE_LABEL_PATH_PATTERN,
      `${label}: should not expose XDE label path "${id}" as public node id`,
    );
  }
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
    const geometry = result.geometries[index];
    const expectedGeometryId = `geo_${index}`;
    assert.equal(
      geometry?.id,
      expectedGeometryId,
      `${label}: geometry ${index} should expose stable id ${expectedGeometryId}`,
    );
    assert.equal(
      binding?.geometryId,
      geometry.id,
      `${label}: binding ${index} should reference its geometry id`,
    );
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

test("STEP public node ids do not expose XDE label paths", async () => {
  const module = await createModule();
  const assemblyBytes = await loadFixture("assembly.step");

  const exact = module.OpenExactStepModel(assemblyBytes, {});
  const stateless = module.ReadStepFile(assemblyBytes, {});

  assertOpaquePublicNodeIds(exact, "OpenExactStepModel assembly.step");
  assertOpaquePublicNodeIds(stateless, "ReadStepFile assembly.step");
});

test("stateless ReadStepFile remains exactGeometryBindings-free", async () => {
  const module = await createModule();
  const stepBytes = await loadFixture("simple_part.step");

  const stateless = module.ReadStepFile(stepBytes, {});

  assert.equal(stateless?.success, true);
  assert.equal("exactGeometryBindings" in stateless, false);
  assert.ok(Array.isArray(stateless?.geometries));
});
