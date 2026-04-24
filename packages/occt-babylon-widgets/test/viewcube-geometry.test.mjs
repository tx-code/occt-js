import test from "node:test";
import assert from "node:assert/strict";
import { VIEWS } from "../src/viewcube-geometry.js";

test("viewcube standard views follow the Z-up CAD convention", () => {
  assert.deepEqual(VIEWS.top, { alpha: 0, beta: 0.01 });
  assert.deepEqual(VIEWS.bottom, { alpha: 0, beta: Math.PI - 0.01 });
  assert.deepEqual(VIEWS.front, { alpha: Math.PI / 2, beta: Math.PI / 2 });
  assert.deepEqual(VIEWS.back, { alpha: -Math.PI / 2, beta: Math.PI / 2 });
  assert.deepEqual(VIEWS.left, { alpha: Math.PI, beta: Math.PI / 2 });
  assert.deepEqual(VIEWS.right, { alpha: 0, beta: Math.PI / 2 });
});
