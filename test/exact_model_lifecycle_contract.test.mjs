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

function getRepresentativeExactRef(result) {
  const binding = Array.isArray(result?.exactGeometryBindings)
    ? result.exactGeometryBindings.find((entry) => Number.isInteger(entry?.exactShapeHandle) && entry.exactShapeHandle > 0)
    : null;
  const exactShapeHandle = binding?.exactShapeHandle ?? 1;

  for (const geometry of result?.geometries ?? []) {
    for (const face of geometry?.faces ?? []) {
      if (Number.isInteger(face?.id) && face.id > 0) {
        return { exactShapeHandle, kind: "face", elementId: face.id };
      }
    }
    for (const edge of geometry?.edges ?? []) {
      if (Number.isInteger(edge?.id) && edge.id > 0) {
        return { exactShapeHandle, kind: "edge", elementId: edge.id };
      }
    }
    for (const vertex of geometry?.vertices ?? []) {
      if (Number.isInteger(vertex?.id) && vertex.id > 0) {
        return { exactShapeHandle, kind: "vertex", elementId: vertex.id };
      }
    }
  }

  return { exactShapeHandle, kind: "face", elementId: 1 };
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

test("retainExactModel keeps a live handle valid until the final release", async () => {
  const module = await createModule();
  const stepBytes = await loadFixture("simple_part.step");
  const result = module.OpenExactStepModel(stepBytes, {});

  assert.equal(module.RetainExactModel(result.exactModelId)?.ok, true);
  assert.deepEqual(module.ReleaseExactModel(result.exactModelId), { ok: true });
  assert.deepEqual(module.ReleaseExactModel(result.exactModelId), { ok: true });
});

test("released and unknown handles fail with explicit lifecycle codes", async () => {
  const module = await createModule();
  const stepBytes = await loadFixture("simple_part.step");
  const result = module.OpenExactStepModel(stepBytes, {});

  assert.deepEqual(module.ReleaseExactModel(result.exactModelId), { ok: true });
  assert.deepEqual(module.RetainExactModel(result.exactModelId), {
    ok: false,
    code: "released-handle",
    message: "Exact model handle has already been released.",
  });
  assert.deepEqual(module.ReleaseExactModel(result.exactModelId), {
    ok: false,
    code: "released-handle",
    message: "Exact model handle has already been released.",
  });
  assert.deepEqual(module.RetainExactModel(999999), {
    ok: false,
    code: "invalid-handle",
    message: "Exact model handle is unknown.",
  });
  assert.deepEqual(module.ReleaseExactModel(999999), {
    ok: false,
    code: "invalid-handle",
    message: "Exact model handle is unknown.",
  });
});

test("GetExactModelDiagnostics reports live retained exact handles with stable metadata", async () => {
  const module = await createModule();
  const stepBytes = await loadFixture("simple_part.step");
  const result = module.OpenExactStepModel(stepBytes, {});

  const diagnostics = module.GetExactModelDiagnostics();
  const entry = diagnostics.liveExactModels.find((candidate) => candidate.exactModelId === result.exactModelId);

  assert.equal(diagnostics.liveExactModelCount, 1);
  assert.equal(diagnostics.releasedHandleCount, 0);
  assert.equal(typeof entry, "object");
  assert.equal(entry.refCount, 1);
  assert.equal(entry.sourceFormat, "step");
  assert.equal(typeof entry.sourceUnit, "string");
  assert.equal(typeof entry.unitScaleToMeters, "number");
  assert.equal(entry.exactGeometryCount, result.exactGeometryBindings.length);
  assert.deepEqual(module.ReleaseExactModel(result.exactModelId), { ok: true });
});

test("GetExactModelDiagnostics shrinks after final release and retains released-handle history", async () => {
  const module = await createModule();
  const stepBytes = await loadFixture("simple_part.step");
  const result = module.OpenExactStepModel(stepBytes, {});

  assert.deepEqual(module.RetainExactModel(result.exactModelId), { ok: true });
  const retainedDiagnostics = module.GetExactModelDiagnostics();
  assert.equal(retainedDiagnostics.liveExactModelCount, 1);
  assert.equal(retainedDiagnostics.releasedHandleCount, 0);
  assert.equal(
    retainedDiagnostics.liveExactModels.find((entry) => entry.exactModelId === result.exactModelId)?.refCount,
    2,
  );

  assert.deepEqual(module.ReleaseExactModel(result.exactModelId), { ok: true });
  const partiallyReleasedDiagnostics = module.GetExactModelDiagnostics();
  assert.equal(partiallyReleasedDiagnostics.liveExactModelCount, 1);
  assert.equal(partiallyReleasedDiagnostics.releasedHandleCount, 0);
  assert.equal(
    partiallyReleasedDiagnostics.liveExactModels.find((entry) => entry.exactModelId === result.exactModelId)?.refCount,
    1,
  );

  assert.deepEqual(module.ReleaseExactModel(result.exactModelId), { ok: true });
  const fullyReleasedDiagnostics = module.GetExactModelDiagnostics();
  assert.equal(fullyReleasedDiagnostics.liveExactModelCount, 0);
  assert.equal(fullyReleasedDiagnostics.releasedHandleCount, 1);
});

test("representative exact queries return released-handle after final release", async () => {
  const module = await createModule();
  const stepBytes = await loadFixture("simple_part.step");
  const result = module.OpenExactStepModel(stepBytes, {});
  const representativeRef = getRepresentativeExactRef(result);

  assert.deepEqual(module.ReleaseExactModel(result.exactModelId), { ok: true });
  assert.deepEqual(
    module.GetExactGeometryType(
      result.exactModelId,
      representativeRef.exactShapeHandle,
      representativeRef.kind,
      representativeRef.elementId,
    ),
    {
      ok: false,
      code: "released-handle",
      message: "Exact model handle has already been released.",
    },
  );
});

test("stateless ReadFile remains exact-handle-free after exact lane changes", async () => {
  const module = await createModule();
  const stepBytes = await loadFixture("simple_part.step");

  const stateless = module.ReadFile("step", stepBytes, {});

  assert.equal(stateless?.success, true);
  assert.equal("exactModelId" in stateless, false);
  assert.ok(Array.isArray(stateless?.rootNodes));
  assert.ok(Array.isArray(stateless?.geometries));
});
