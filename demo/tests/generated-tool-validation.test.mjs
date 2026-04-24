import test from "node:test";
import assert from "node:assert/strict";

import { buildGeneratedToolValidationRows } from "../src/lib/generated-tool-validation.js";

test("buildGeneratedToolValidationRows exposes exact and mesh closure summaries", () => {
  const rows = buildGeneratedToolValidationRows({
    sourceFormat: "generated-revolved-shape",
    revolvedShape: {
      shapeValidation: {
        exact: {
          isValid: true,
          isClosed: true,
          isSolid: true,
          shapeType: "solid",
        },
        mesh: {
          isWatertight: true,
          isManifold: true,
          boundaryEdgeCount: 0,
          nonManifoldEdgeCount: 0,
        },
      },
    },
  });

  assert.deepEqual(rows, [
    ["Exact", "Pass"],
    ["Closed", "Yes"],
    ["Solid", "Yes"],
    ["Shape Type", "Solid"],
    ["Watertight", "Yes"],
    ["Manifold", "Yes"],
    ["Boundary Edges", 0],
    ["Non-Manifold", 0],
  ]);
});

test("buildGeneratedToolValidationRows returns an empty list when validation metadata is absent", () => {
  assert.deepEqual(buildGeneratedToolValidationRows({ sourceFormat: "step" }), []);
});

test("buildGeneratedToolValidationRows supports generated helical sweep metadata", () => {
  const rows = buildGeneratedToolValidationRows({
    sourceFormat: "generated-helical-sweep",
    helicalSweep: {
      shapeValidation: {
        exact: {
          isValid: true,
          isClosed: true,
          isSolid: true,
          shapeType: "solid",
        },
        mesh: {
          isWatertight: true,
          isManifold: true,
          boundaryEdgeCount: 0,
          nonManifoldEdgeCount: 0,
        },
      },
    },
  });

  assert.deepEqual(rows, [
    ["Exact", "Pass"],
    ["Closed", "Yes"],
    ["Solid", "Yes"],
    ["Shape Type", "Solid"],
    ["Watertight", "Yes"],
    ["Manifold", "Yes"],
    ["Boundary Edges", 0],
    ["Non-Manifold", 0],
  ]);
});

test("buildGeneratedToolValidationRows supports generated composite shape metadata", () => {
  const rows = buildGeneratedToolValidationRows({
    sourceFormat: "generated-composite-shape",
    compositeShape: {
      shapeValidation: {
        exact: {
          isValid: true,
          isClosed: true,
          isSolid: true,
          shapeType: "solid",
        },
        mesh: {
          isWatertight: true,
          isManifold: true,
          boundaryEdgeCount: 0,
          nonManifoldEdgeCount: 0,
        },
      },
    },
  });

  assert.deepEqual(rows, [
    ["Exact", "Pass"],
    ["Closed", "Yes"],
    ["Solid", "Yes"],
    ["Shape Type", "Solid"],
    ["Watertight", "Yes"],
    ["Manifold", "Yes"],
    ["Boundary Edges", 0],
    ["Non-Manifold", 0],
  ]);
});
