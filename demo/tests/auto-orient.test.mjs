import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { applyOrientationToResult, getOcctFormatFromFileName, resolveAutoOrientedResult } from "../src/lib/auto-orient.js";
import { loadOcctFactory } from "../../test/load_occt_factory.mjs";

const simplePartPath = fileURLToPath(new URL("../../test/simple_part.step", import.meta.url));

function makeTranslation(tx, ty, tz) {
  return [
    1, 0, 0, 0,
    0, 1, 0, 0,
    0, 0, 1, 0,
    tx, ty, tz, 1,
  ];
}

function makeRotationX90() {
  return [
    1, 0, 0, 0,
    0, 0, 1, 0,
    0, -1, 0, 0,
    0, 0, 0, 1,
  ];
}

function makeIdentity() {
  return [
    1, 0, 0, 0,
    0, 1, 0, 0,
    0, 0, 1, 0,
    0, 0, 0, 1,
  ];
}

function multiplyMatrices(left, right) {
  const out = new Array(16).fill(0);
  for (let row = 0; row < 4; row += 1) {
    for (let column = 0; column < 4; column += 1) {
      let sum = 0;
      for (let index = 0; index < 4; index += 1) {
        sum += left[index * 4 + row] * right[column * 4 + index];
      }
      out[column * 4 + row] = sum;
    }
  }
  return out;
}

test("getOcctFormatFromFileName maps supported CAD extensions", () => {
  assert.equal(getOcctFormatFromFileName("part.step"), "step");
  assert.equal(getOcctFormatFromFileName("part.STP"), "step");
  assert.equal(getOcctFormatFromFileName("part.igs"), "iges");
  assert.equal(getOcctFormatFromFileName("part.brep"), "brep");
  assert.equal(getOcctFormatFromFileName("part.stl"), null);
});

test("applyOrientationToResult pre-multiplies root node transforms", () => {
  const result = {
    rootNodes: [
      { id: "root", transform: makeTranslation(1, 2, 3), children: [], meshes: [] },
    ],
  };
  const orientation = { transform: makeTranslation(10, 20, 30) };

  const oriented = applyOrientationToResult(result, orientation);

  assert.notStrictEqual(oriented, result);
  assert.deepEqual(oriented.rootNodes[0].transform, makeTranslation(11, 22, 33));
  assert.deepEqual(result.rootNodes[0].transform, makeTranslation(1, 2, 3));
});

test("resolveAutoOrientedResult keeps orientation transforms in manufacturing Z-up coordinates", async () => {
  const result = {
    rootNodes: [
      { id: "root", transform: makeIdentity(), children: [], meshes: [] },
    ],
  };
  const oriented = await resolveAutoOrientedResult({
    occt: { AnalyzeOptimalOrientation: () => ({ success: true, transform: makeRotationX90() }) },
    format: "step",
    bytes: new Uint8Array(),
    result,
  });

  assert.deepEqual(oriented.rootNodes[0].transform, makeRotationX90());
});

test("resolveAutoOrientedResult returns raw result when orientation API is unavailable", async () => {
  const result = { rootNodes: [{ id: "root", transform: makeTranslation(0, 0, 0), children: [], meshes: [] }] };

  assert.equal(
    await resolveAutoOrientedResult({ occt: {}, format: "step", bytes: new Uint8Array(), result }),
    result
  );
});

test("resolveAutoOrientedResult returns raw result when analysis fails", async () => {
  const result = { rootNodes: [{ id: "root", transform: makeTranslation(0, 0, 0), children: [], meshes: [] }] };

  assert.equal(
    await resolveAutoOrientedResult({
      occt: { AnalyzeOptimalOrientation: () => ({ success: false, error: "boom" }) },
      format: "step",
      bytes: new Uint8Array(),
      result,
    }),
    result
  );
});

test("resolveAutoOrientedResult applies successful orientation analysis", async () => {
  const result = { rootNodes: [{ id: "root", transform: makeTranslation(1, 2, 3), children: [], meshes: [] }] };
  const oriented = await resolveAutoOrientedResult({
    occt: { AnalyzeOptimalOrientation: () => ({ success: true, transform: makeRotationX90() }) },
    format: "step",
    bytes: new Uint8Array(),
    result,
  });

  assert.deepEqual(
    oriented.rootNodes[0].transform,
    multiplyMatrices(makeRotationX90(), makeTranslation(1, 2, 3)),
  );
});

test("resolveAutoOrientedResult preserves the exact manufacturing orientation transform for simple_part", async () => {
  const occt = await loadOcctFactory()();
  const bytes = new Uint8Array(readFileSync(simplePartPath));
  const result = {
    rootNodes: [
      { id: "root", transform: makeIdentity(), children: [], meshes: [] },
    ],
  };
  const analysis = occt.AnalyzeOptimalOrientation("step", bytes, { mode: "manufacturing" });
  assert.equal(analysis?.success, true);

  const oriented = await resolveAutoOrientedResult({
    occt,
    format: "step",
    bytes,
    result,
  });

  const transform = oriented.rootNodes[0].transform;
  assert.equal(transform.length, 16);
  assert.deepEqual(transform, Array.from(analysis.transform));
});
