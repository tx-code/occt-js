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

function assertCanonicalExactPayload(result, format, label) {
  assert.equal(result?.success, true, `${label}: success should be true`);
  assert.equal(result?.sourceFormat, format, `${label}: sourceFormat should be normalized`);
  assert.equal(typeof result?.exactModelId, "number", `${label}: exactModelId should be numeric`);
  assert.ok(Array.isArray(result?.rootNodes), `${label}: rootNodes should be an array`);
  assert.ok(Array.isArray(result?.geometries), `${label}: geometries should be an array`);
  assert.ok(Array.isArray(result?.materials), `${label}: materials should be an array`);
  assert.ok(Array.isArray(result?.warnings), `${label}: warnings should be an array`);
  assert.equal(typeof result?.stats, "object", `${label}: stats should be present`);
}

test("exact open APIs return mesh payload plus exactModelId", async () => {
  const module = await createModule();

  const stepBytes = await loadFixture("simple_part.step");
  const igesBytes = await loadFixture("cube_10x10.igs");
  const brepBytes = await loadFixture("as1_pe_203.brep");

  const stepResult = module.OpenExactStepModel(stepBytes, {});
  const igesResult = module.OpenExactIgesModel(igesBytes, {});
  const brepResult = module.OpenExactBrepModel(brepBytes, {});

  assertCanonicalExactPayload(stepResult, "step", "STEP exact open");
  assertCanonicalExactPayload(igesResult, "iges", "IGES exact open");
  assertCanonicalExactPayload(brepResult, "brep", "BREP exact open");
});

test("exact lifecycle lane does not change stateless ReadStepFile output", async () => {
  const module = await createModule();
  const stepBytes = await loadFixture("simple_part.step");

  const stateless = module.ReadStepFile(stepBytes, {});

  assert.equal(stateless?.success, true);
  assert.equal("exactModelId" in stateless, false);
  assert.ok(Array.isArray(stateless?.rootNodes));
  assert.ok(Array.isArray(stateless?.geometries));
});

test("releaseExactModel succeeds for a fresh exact handle", async () => {
  const module = await createModule();
  const stepBytes = await loadFixture("simple_part.step");

  const result = module.OpenExactStepModel(stepBytes, {});
  const released = module.ReleaseExactModel(result.exactModelId);

  assert.deepEqual(released, { ok: true });
});
