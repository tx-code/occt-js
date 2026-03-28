import test from "node:test";
import assert from "node:assert/strict";
import { applyOrientationToResult, getOcctFormatFromFileName, resolveAutoOrientedResult } from "../src/lib/auto-orient.js";

function makeTranslation(tx, ty, tz) {
  return [
    1, 0, 0, 0,
    0, 1, 0, 0,
    0, 0, 1, 0,
    tx, ty, tz, 1,
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

test("resolveAutoOrientedResult skips orientation when disabled or unavailable", async () => {
  const result = { rootNodes: [{ id: "root", transform: makeTranslation(0, 0, 0), children: [], meshes: [] }] };

  assert.equal(
    await resolveAutoOrientedResult({ occt: {}, format: "step", bytes: new Uint8Array(), result, autoOrientEnabled: true }),
    result
  );

  assert.equal(
    await resolveAutoOrientedResult({
      occt: { AnalyzeOptimalOrientation: () => ({ success: true, transform: makeTranslation(2, 0, 0) }) },
      format: "step",
      bytes: new Uint8Array(),
      result,
      autoOrientEnabled: false,
    }),
    result
  );
});

test("resolveAutoOrientedResult applies successful orientation analysis", async () => {
  const result = { rootNodes: [{ id: "root", transform: makeTranslation(1, 0, 0), children: [], meshes: [] }] };
  const oriented = await resolveAutoOrientedResult({
    occt: { AnalyzeOptimalOrientation: () => ({ success: true, transform: makeTranslation(2, 3, 4) }) },
    format: "step",
    bytes: new Uint8Array(),
    result,
    autoOrientEnabled: true,
  });

  assert.deepEqual(oriented.rootNodes[0].transform, makeTranslation(3, 3, 4));
});
