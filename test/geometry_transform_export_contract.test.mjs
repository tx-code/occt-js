import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import { loadOcctFactory } from "./load_occt_factory.mjs";

const factory = loadOcctFactory();
const __dirname = dirname(fileURLToPath(import.meta.url));

async function createModule() {
  return factory();
}

function fixtureBytes(name) {
  return new Uint8Array(readFileSync(resolve(__dirname, name)));
}

function geometryBounds(result) {
  assert.equal(result.success, true, result.error ?? "read should succeed");
  const values = [];
  for (const geometry of result.geometries) {
    const positions = Array.from(geometry.positions);
    for (let index = 0; index < positions.length; index += 3) {
      values.push([positions[index], positions[index + 1], positions[index + 2]]);
    }
  }
  assert.ok(values.length > 0, "read result should contain vertices");
  return values.reduce(
    (bounds, point) => ({
      min: [
        Math.min(bounds.min[0], point[0]),
        Math.min(bounds.min[1], point[1]),
        Math.min(bounds.min[2], point[2]),
      ],
      max: [
        Math.max(bounds.max[0], point[0]),
        Math.max(bounds.max[1], point[1]),
        Math.max(bounds.max[2], point[2]),
      ],
    }),
    {
      min: [Infinity, Infinity, Infinity],
      max: [-Infinity, -Infinity, -Infinity],
    },
  );
}

function assertNear(actual, expected, label) {
  assert.ok(
    Math.abs(actual - expected) < 0.05,
    `${label}: expected ${expected}, got ${actual}`,
  );
}

test("TransformStepFile applies an affine matrix and returns STEP bytes that can be reopened", async () => {
  const module = await createModule();
  assert.equal(typeof module.TransformStepFile, "function");

  const source = fixtureBytes("simple_part.step");
  const before = geometryBounds(module.ReadStepFile(source, {}));
  const transform = [
    1, 0, 0, 0,
    0, 1, 0, 0,
    0, 0, 1, 0,
    25, -10, 5, 1,
  ];

  const exported = module.TransformStepFile(source, transform, {});

  assert.equal(exported.success, true, exported.error ?? "transform should succeed");
  assert.equal(exported.format, "step");
  assert.ok(exported.content instanceof Uint8Array);
  assert.ok(exported.content.byteLength > 0);

  const after = geometryBounds(module.ReadStepFile(exported.content, {}));
  assertNear(after.min[0], before.min[0] + 25, "min x");
  assertNear(after.max[0], before.max[0] + 25, "max x");
  assertNear(after.min[1], before.min[1] - 10, "min y");
  assertNear(after.max[1], before.max[1] - 10, "max y");
  assertNear(after.min[2], before.min[2] + 5, "min z");
  assertNear(after.max[2], before.max[2] + 5, "max z");
});

test("TransformFile normalizes stp to STEP transform export", async () => {
  const module = await createModule();
  assert.equal(typeof module.TransformFile, "function");

  const source = fixtureBytes("simple_part.step");
  const exported = module.TransformFile(
    "stp",
    source,
    [
      1, 0, 0, 0,
      0, 1, 0, 0,
      0, 0, 1, 0,
      3, 0, 0, 1,
    ],
    {},
  );

  assert.equal(exported.success, true, exported.error ?? "transform should succeed");
  assert.equal(exported.format, "step");
  assert.ok(exported.content instanceof Uint8Array);
  assert.equal(module.ReadStepFile(exported.content, {}).success, true);
});

test("TransformBrepFile applies an affine matrix and returns BREP bytes that can be reopened", async () => {
  const module = await createModule();
  assert.equal(typeof module.TransformBrepFile, "function");

  const source = fixtureBytes("as1_pe_203.brep");
  const before = geometryBounds(module.ReadBrepFile(source, {}));
  const transform = [
    1, 0, 0, 0,
    0, 1, 0, 0,
    0, 0, 1, 0,
    7, 11, -3, 1,
  ];

  const exported = module.TransformBrepFile(source, transform, {});

  assert.equal(exported.success, true, exported.error ?? "transform should succeed");
  assert.equal(exported.format, "brep");
  assert.ok(exported.content instanceof Uint8Array);
  assert.ok(exported.content.byteLength > 0);

  const after = geometryBounds(module.ReadBrepFile(exported.content, {}));
  assertNear(after.min[0], before.min[0] + 7, "min x");
  assertNear(after.max[0], before.max[0] + 7, "max x");
  assertNear(after.min[1], before.min[1] + 11, "min y");
  assertNear(after.max[1], before.max[1] + 11, "max y");
  assertNear(after.min[2], before.min[2] - 3, "min z");
  assertNear(after.max[2], before.max[2] - 3, "max z");
});
