import test from "node:test";
import assert from "node:assert/strict";

import { buildCamToolRevolvedSpec } from "../src/index.js";

test("buildCamToolRevolvedSpec emits a closed bullnose profile with stable semantic tags", () => {
  const spec = buildCamToolRevolvedSpec({
    shape: "bullnose",
    units: "mm",
    diameter: 6,
    cornerRadius: 0.75,
    cuttingEdgeHeight: 14,
    shankDiameter: 6,
    length: 18,
  });

  assert.deepEqual(spec.profile.start, [0, 0]);
  assert.equal(spec.profile.closure, "explicit");
  assert.equal(spec.revolve.angleDeg, 360);
  assert.deepEqual(spec.profile.segments, [
    { kind: "line", id: "tip-flat", tag: "tip", end: [2.25, 0] },
    { kind: "arc_center", id: "corner", tag: "corner", center: [2.25, 0.75], end: [3, 0.75] },
    { kind: "line", id: "flute", tag: "cutting", end: [3, 14] },
    { kind: "line", id: "shank", tag: "shank", end: [3, 18] },
    { kind: "line", id: "axis-top", tag: "closure", end: [0, 18] },
    { kind: "line", id: "axis-bottom", tag: "closure", end: [0, 0] },
  ]);
});

test("buildCamToolRevolvedSpec defaults ballend cuttingEdgeHeight to the tool radius", () => {
  const spec = buildCamToolRevolvedSpec({
    shape: "ballend",
    diameter: 10,
    length: 24,
  });

  assert.deepEqual(spec.profile.segments, [
    { kind: "arc_center", id: "ball", tag: "tip", center: [0, 5], end: [5, 5] },
    { kind: "line", id: "shank", tag: "shank", end: [5, 24] },
    { kind: "line", id: "axis-top", tag: "closure", end: [0, 24] },
    { kind: "line", id: "axis-bottom", tag: "closure", end: [0, 0] },
  ]);
});

test("buildCamToolRevolvedSpec rejects invalid bullnose corner radii before the Wasm runtime runs", () => {
  assert.throws(
    () => buildCamToolRevolvedSpec({
      shape: "bullnose",
      diameter: 6,
      cornerRadius: 3,
      cuttingEdgeHeight: 14,
      length: 18,
    }),
    /cornerRadius must be smaller than half the tool diameter/i,
  );
});

test("buildCamToolRevolvedSpec rejects drill tips that do not fit inside the requested tool length", () => {
  assert.throws(
    () => buildCamToolRevolvedSpec({
      shape: "drill",
      units: "inch",
      diameter: 0.5,
      tipAngle: 30,
      length: 0.25,
    }),
    /length must be at least the computed drill tip height/i,
  );
});
