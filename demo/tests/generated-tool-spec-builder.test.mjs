import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

import { createOcctCore } from "@tx-code/occt-core";
import { loadOcctFactory } from "../../test/load_occt_factory.mjs";
import { buildGeneratedToolDemoSpec } from "../src/lib/generated-tool-spec-builder.js";

test("buildGeneratedToolDemoSpec emits a closed bullnose profile with stable semantic tags", () => {
  const spec = buildGeneratedToolDemoSpec({
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

test("buildGeneratedToolDemoSpec defaults ballend cuttingEdgeHeight to the tool radius", () => {
  const spec = buildGeneratedToolDemoSpec({
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

test("buildGeneratedToolDemoSpec rejects invalid bullnose corner radii before runtime build", () => {
  assert.throws(
    () => buildGeneratedToolDemoSpec({
      shape: "bullnose",
      diameter: 6,
      cornerRadius: 3,
      cuttingEdgeHeight: 14,
      length: 18,
    }),
    /cornerRadius must be smaller than half the tool diameter/i,
  );
});

test("buildGeneratedToolDemoSpec rejects drill tips that do not fit inside the requested tool length", () => {
  assert.throws(
    () => buildGeneratedToolDemoSpec({
      shape: "drill",
      units: "inch",
      diameter: 0.5,
      tipAngle: 30,
      length: 0.25,
    }),
    /length must be at least the computed drill tip height/i,
  );
});

test("demo-local tool builder families build watertight closed solids through the root runtime", async () => {
  const factory = loadOcctFactory();
  const wasmBinary = new Uint8Array(await readFile(new URL("../../dist/occt-js.wasm", import.meta.url)));
  const core = createOcctCore({
    factory,
    wasmBinary,
  });

  const buildOptions = {
    linearDeflectionType: "bounding_box_ratio",
    linearDeflection: 0.001,
    angularDeflection: 0.35,
  };
  const cases = [
    {
      label: "endmill",
      definition: {
        shape: "endmill",
        units: "mm",
        diameter: 6,
        cuttingEdgeHeight: 14,
        shankDiameter: 6,
        length: 18,
      },
    },
    {
      label: "ballend",
      definition: {
        shape: "ballend",
        units: "mm",
        diameter: 10,
        cuttingEdgeHeight: 16,
        shankDiameter: 10,
        length: 22,
      },
    },
    {
      label: "bullnose",
      definition: {
        shape: "bullnose",
        units: "mm",
        diameter: 8,
        cornerRadius: 1,
        cuttingEdgeHeight: 12,
        shankDiameter: 8,
        length: 18,
      },
    },
    {
      label: "drill",
      definition: {
        shape: "drill",
        units: "inch",
        diameter: 0.25,
        tipAngle: 118,
        length: 1.5,
      },
    },
  ];

  for (const entry of cases) {
    const spec = buildGeneratedToolDemoSpec(entry.definition);
    const validation = await core.validateRevolvedToolSpec(spec);
    assert.equal(validation.ok, true, `${entry.label}: spec should validate`);

    const result = await core.buildRevolvedTool(spec, buildOptions);
    assert.equal(result.success, true, `${entry.label}: build should succeed`);

    const shapeValidation = result.generatedTool?.shapeValidation;
    assert.ok(shapeValidation, `${entry.label}: shapeValidation should be present`);
    assert.equal(shapeValidation.exact.isValid, true, `${entry.label}: exact shape should be valid`);
    assert.equal(shapeValidation.exact.isClosed, true, `${entry.label}: exact shape should be closed`);
    assert.equal(shapeValidation.exact.isSolid, true, `${entry.label}: exact shape should contain a solid`);
    assert.equal(shapeValidation.mesh.isWatertight, true, `${entry.label}: mesh should be watertight`);
    assert.equal(shapeValidation.mesh.isManifold, true, `${entry.label}: mesh should be manifold`);
  }
});
