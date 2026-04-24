import test from "node:test";
import assert from "node:assert/strict";
import { buildGeneratedToolLegend, resolveGeneratedToolLegendActiveKeys } from "../src/lib/generated-tool-legend.js";

test("buildGeneratedToolLegend groups normalized generated-tool face bindings into semantic legend rows", () => {
  const legend = buildGeneratedToolLegend({
    sourceFormat: "generated-revolved-shape",
    geometries: [{
      id: "geo_0",
      color: [0.8, 0.82, 0.86, 1],
      faces: [
        { id: 1, color: [0.14, 0.61, 0.72, 1] },
        { id: 2, color: [0.14, 0.61, 0.72, 1] },
        { id: 3, color: [0.45, 0.49, 0.54, 1] },
      ],
    }],
    revolvedShape: {
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
  assert.deepEqual(legend.entries[0].faceRefs, [{ geometryId: "geo_0", faceId: 1 }, { geometryId: "geo_0", faceId: 2 }]);
  assert.equal(legend.entries[1].label, "Closure");
  assert.equal(legend.entries[1].faceCount, 1);
});

test("buildGeneratedToolLegend returns null when generated-tool metadata is absent", () => {
  assert.equal(buildGeneratedToolLegend({ sourceFormat: "step" }), null);
});

test("resolveGeneratedToolLegendActiveKeys marks rows that correspond to selected faces", () => {
  const legend = buildGeneratedToolLegend({
    sourceFormat: "generated-revolved-shape",
    geometries: [{
      id: "geo_0",
      faces: [
        { id: 1, color: [0.14, 0.61, 0.72, 1] },
        { id: 2, color: [0.45, 0.49, 0.54, 1] },
      ],
    }],
    revolvedShape: {
      units: "mm",
      angleDeg: 360,
      closure: "explicit",
      faceBindings: [
        { geometryId: "geo_0", geometryIndex: 0, faceId: 1, systemRole: "profile", segmentTag: "cutting" },
        { geometryId: "geo_0", geometryIndex: 0, faceId: 2, systemRole: "closure" },
      ],
    },
  });

  const activeKeys = resolveGeneratedToolLegendActiveKeys(legend, {
    mode: "face",
    items: [{
      mode: "face",
      geometryId: "geo_0",
      faceId: 2,
      info: { faceId: 2 },
    }],
  });

  assert.equal(activeKeys.size, 1);
  assert.equal(activeKeys.has(legend.entries[1].key), true);
});

test("buildGeneratedToolLegend supports helical sweep metadata with sweep/cap semantics", () => {
  const legend = buildGeneratedToolLegend({
    sourceFormat: "generated-helical-sweep",
    geometries: [{
      id: "geo_0",
      color: [0.8, 0.82, 0.86, 1],
      faces: [
        { id: 1, color: [0.84, 0.66, 0.24, 1] },
        { id: 2, color: [0.26, 0.63, 0.88, 1] },
      ],
    }],
    helicalSweep: {
      units: "mm",
      pitch: 1,
      turns: 8,
      sectionKind: "polyline",
      faceBindings: [
        {
          geometryIndex: 0,
          geometryId: "geo_0",
          faceId: 1,
          systemRole: "sweep",
        },
        {
          geometryIndex: 0,
          geometryId: "geo_0",
          faceId: 2,
          systemRole: "start_cap",
        },
      ],
    },
  });

  assert.equal(legend.units, "mm");
  assert.equal(legend.entries.length, 2);
  assert.equal(legend.entries[0].label, "Sweep");
  assert.equal(legend.entries[1].label, "Start Cap");
});
