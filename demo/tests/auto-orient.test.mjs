import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { applyOrientationToResult, getOcctFormatFromFileName, resolveAutoOrientedResult } from "../src/lib/auto-orient.js";
import { loadOcctFactory } from "../../test/load_occt_factory.mjs";

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

test("resolveAutoOrientedResult compensates analysis z-up transforms for Babylon y-up", async () => {
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

  assert.deepEqual(oriented.rootNodes[0].transform, makeIdentity());
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

  assert.deepEqual(oriented.rootNodes[0].transform, makeTranslation(1, 2, 3));
});

test("resolveAutoOrientedResult keeps simple_part upright for Babylon's Y-up world", async () => {
  const occt = await loadOcctFactory()();
  const bytes = new Uint8Array(readFileSync(resolve("test", "simple_part.step")));
  const result = {
    rootNodes: [
      { id: "root", transform: makeIdentity(), children: [], meshes: [] },
    ],
  };

  const oriented = await resolveAutoOrientedResult({
    occt,
    format: "step",
    bytes,
    result,
  });

  const transform = oriented.rootNodes[0].transform;
  assert.equal(transform.length, 16);
  assert(Math.abs(transform[4]) < 1e-6, "viewer X basis should not leak into Y axis");
  assert(Math.abs(transform[5] - 1) < 1e-6, "viewer up should stay aligned with Babylon Y");
  assert(Math.abs(transform[6]) < 1e-6, "viewer Z basis should not leak into Y axis");
});
