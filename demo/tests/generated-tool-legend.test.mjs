import test from "node:test";
import assert from "node:assert/strict";
import { buildGeneratedToolLegend } from "../src/lib/generated-tool-legend.js";

test("buildGeneratedToolLegend groups normalized generated-tool face bindings into semantic legend rows", () => {
  const legend = buildGeneratedToolLegend({
    sourceFormat: "generated-revolved-tool",
    geometries: [{
      id: "geo_0",
      color: [0.8, 0.82, 0.86, 1],
      faces: [
        { id: 1, color: [0.14, 0.61, 0.72, 1] },
        { id: 2, color: [0.14, 0.61, 0.72, 1] },
        { id: 3, color: [0.45, 0.49, 0.54, 1] },
      ],
    }],
    generatedTool: {
      units: "mm",
      angleDeg: 360,
      closure: "explicit",
      faceBindings: [
        {
          geometryIndex: 0,
          geometryId: "geo_0",
          faceId: 1,
          systemRole: "profile",
          segmentIndex: 1,
          segmentId: "flute",
          segmentTag: "cutting",
        },
        {
          geometryIndex: 0,
          geometryId: "geo_0",
          faceId: 2,
          systemRole: "profile",
          segmentIndex: 1,
          segmentId: "flute",
          segmentTag: "cutting",
        },
        {
          geometryIndex: 0,
          geometryId: "geo_0",
          faceId: 3,
          systemRole: "closure",
        },
      ],
    },
  });

  assert.equal(legend.units, "mm");
  assert.equal(legend.angleLabel, "360°");
  assert.equal(legend.closure, "Explicit");
  assert.equal(legend.entries.length, 2);
  assert.equal(legend.entries[0].label, "Cutting");
  assert.equal(legend.entries[0].faceCount, 2);
  assert.equal(legend.entries[1].label, "Closure");
  assert.equal(legend.entries[1].faceCount, 1);
});

test("buildGeneratedToolLegend returns null when generated-tool metadata is absent", () => {
  assert.equal(buildGeneratedToolLegend({ sourceFormat: "step" }), null);
});
