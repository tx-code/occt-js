import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

import { buildCamToolRevolvedSpec, createOcctCore } from "../src/index.js";
import { loadOcctFactory } from "../../../test/load_occt_factory.mjs";

test("buildCamToolRevolvedSpec families build watertight closed solids through the root Wasm carrier", async () => {
  const factory = loadOcctFactory();
  const wasmBinary = new Uint8Array(await readFile(new URL("../../../dist/occt-js.wasm", import.meta.url)));

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
    const spec = buildCamToolRevolvedSpec(entry.definition);
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
