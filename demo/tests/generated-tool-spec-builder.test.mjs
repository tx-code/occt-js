import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

import { createOcctCore } from "@tx-code/occt-core";
import { loadOcctFactory } from "../../test/load_occt_factory.mjs";
import { buildGeneratedToolDemoSpec } from "../src/lib/generated-tool-spec-builder.js";
import {
  GENERATED_TOOL_PRESETS,
  getGeneratedToolPresetCatalog,
} from "../src/lib/generated-tool-presets.js";

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

test("buildGeneratedToolDemoSpec emits a tapered flat profile with a smaller tip diameter", () => {
  const spec = buildGeneratedToolDemoSpec({
    shape: "taper-flat",
    units: "mm",
    diameter: 10,
    tipDiameter: 4,
    cuttingEdgeHeight: 18,
    shankDiameter: 10,
    length: 24,
  });

  assert.deepEqual(spec.profile.segments, [
    { kind: "line", id: "tip-flat", tag: "tip", end: [2, 0] },
    { kind: "line", id: "taper-flank", tag: "cutting", end: [5, 18] },
    { kind: "line", id: "shank", tag: "shank", end: [5, 24] },
    { kind: "line", id: "axis-top", tag: "closure", end: [0, 24] },
    { kind: "line", id: "axis-bottom", tag: "closure", end: [0, 0] },
  ]);
});

test("buildGeneratedToolDemoSpec emits a barrel profile with symmetric cutting arcs", () => {
  const spec = buildGeneratedToolDemoSpec({
    shape: "barrel",
    units: "mm",
    diameter: 10,
    neckDiameter: 6,
    cuttingEdgeHeight: 14,
    shankDiameter: 8,
    length: 22,
  });

  assert.deepEqual(spec.profile.segments, [
    { kind: "line", id: "tip-flat", tag: "tip", end: [3, 0] },
    { kind: "arc_center", id: "barrel-lower", tag: "cutting", center: [3, 2], end: [5, 2] },
    { kind: "line", id: "barrel-mid", tag: "cutting", end: [5, 12] },
    { kind: "arc_center", id: "barrel-upper", tag: "cutting", center: [3, 12], end: [3, 14] },
    { kind: "line", id: "shoulder", tag: "shank", end: [4, 14] },
    { kind: "line", id: "shank", tag: "shank", end: [4, 22] },
    { kind: "line", id: "axis-top", tag: "closure", end: [0, 22] },
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

test("buildGeneratedToolDemoSpec rejects lollipop heads that do not fit inside the requested tool length", () => {
  assert.throws(
    () => buildGeneratedToolDemoSpec({
      shape: "lollipop",
      units: "mm",
      diameter: 8,
      neckDiameter: 4,
      length: 6,
    }),
    /length must be at least the head diameter/i,
  );
});

test("generated tool presets expose stable group ids, labels, and parameter summaries", () => {
  assert.deepEqual(
    GENERATED_TOOL_PRESETS.map((preset) => ({
      id: preset.id,
      family: preset.family,
      groupId: preset.groupId,
      label: preset.label,
      parameterLabels: preset.parameters.map((parameter) => parameter.label),
    })),
    [
      {
        id: "endmill",
        family: "revolved",
        groupId: "freecad-aligned",
        label: "Endmill D6",
        parameterLabels: ["Diameter", "CuttingEdgeHeight", "ShankDiameter", "Length"],
      },
      {
        id: "bullnose",
        family: "revolved",
        groupId: "freecad-aligned",
        label: "Bullnose D8 R0.8",
        parameterLabels: ["Diameter", "CornerRadius", "CuttingEdgeHeight", "ShankDiameter", "Length"],
      },
      {
        id: "ballend",
        family: "revolved",
        groupId: "freecad-aligned",
        label: "Ballend D8",
        parameterLabels: ["Diameter", "CuttingEdgeHeight", "ShankDiameter", "Length"],
      },
      {
        id: "taper-flat",
        family: "revolved",
        groupId: "common-derived",
        label: "Taper Flat D1-D6",
        parameterLabels: ["TipDiameter", "Diameter", "CuttingEdgeHeight", "ShankDiameter", "Length"],
      },
      {
        id: "taper-ball",
        family: "revolved",
        groupId: "freecad-aligned",
        label: "Tapered Ball Nose D2 TD6",
        parameterLabels: ["Diameter", "TaperDiameter", "CuttingEdgeHeight", "ShankDiameter", "Length"],
      },
      {
        id: "barrel",
        family: "revolved",
        groupId: "common-derived",
        label: "Barrel D8 Neck4",
        parameterLabels: ["Diameter", "NeckDiameter", "CuttingEdgeHeight", "ShankDiameter", "Length"],
      },
      {
        id: "lollipop",
        family: "revolved",
        groupId: "common-derived",
        label: "Lollipop D6 Neck4",
        parameterLabels: ["Diameter", "NeckDiameter", "Length"],
      },
      {
        id: "drill",
        family: "revolved",
        groupId: "freecad-aligned",
        label: "Drill D6 118deg",
        parameterLabels: ["Diameter", "TipAngle", "Length"],
      },
      {
        id: "thread-mill-m6x1",
        family: "composite",
        groupId: "common-derived",
        label: "Thread Mill M6×1",
        parameterLabels: ["Diameter", "Crest", "NeckDiameter", "NeckLength", "ShankDiameter", "Length", "CuttingAngle", "Flutes"],
      },
    ],
  );
});

test("generated tool preset catalog groups presets into FreeCAD-aligned and common demo-only sections", () => {
  assert.deepEqual(
    getGeneratedToolPresetCatalog().map((group) => ({
      id: group.id,
      presetIds: group.presets.map((preset) => preset.id),
    })),
    [
      {
        id: "freecad-aligned",
        presetIds: ["endmill", "bullnose", "ballend", "taper-ball", "drill"],
      },
      {
        id: "common-derived",
        presetIds: ["taper-flat", "barrel", "lollipop", "thread-mill-m6x1"],
      },
    ],
  );
});

test("demo preset catalog builds watertight closed solids through the root runtime", async () => {
  const factory = loadOcctFactory();
  const wasmBinary = new Uint8Array(await readFile(new URL("../../dist/occt-js.wasm", import.meta.url)));
  const core = createOcctCore({
    factory,
    wasmBinary,
  });

  assert.equal(
    GENERATED_TOOL_PRESETS.some((preset) => preset.family === "composite"),
    true,
    "preset catalog should include at least one composite family sample",
  );

  for (const preset of GENERATED_TOOL_PRESETS) {
    const validation = preset.family === "helical"
      ? await core.validateHelicalSweepSpec(preset.spec)
      : (preset.family === "composite"
        ? await core.validateCompositeShapeSpec(preset.spec)
        : await core.validateRevolvedShapeSpec(preset.spec));
    assert.equal(validation.ok, true, `${preset.id}: ${preset.family} spec should validate`);

    const result = preset.family === "helical"
      ? await core.buildHelicalSweep(preset.spec, preset.buildOptions)
      : (preset.family === "composite"
        ? await core.buildCompositeShape(preset.spec, preset.buildOptions)
        : await core.buildRevolvedShape(preset.spec, preset.buildOptions));
    assert.equal(result.success, true, `${preset.id}: build should succeed`);

    const shapeValidation = preset.family === "helical"
      ? result.helicalSweep?.shapeValidation
      : (preset.family === "composite"
        ? result.compositeShape?.shapeValidation
        : result.revolvedShape?.shapeValidation);
    assert.ok(shapeValidation, `${preset.id}: shapeValidation should be present`);
    assert.equal(shapeValidation.exact.isValid, true, `${preset.id}: exact shape should be valid`);
    assert.equal(shapeValidation.exact.isClosed, true, `${preset.id}: exact shape should be closed`);
    assert.equal(shapeValidation.exact.isSolid, true, `${preset.id}: exact shape should contain a solid`);
    assert.equal(shapeValidation.mesh.isWatertight, true, `${preset.id}: mesh should be watertight`);
    assert.equal(shapeValidation.mesh.isManifold, true, `${preset.id}: mesh should be manifold`);
  }
});
