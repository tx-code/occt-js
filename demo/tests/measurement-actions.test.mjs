import test from "node:test";
import assert from "node:assert/strict";
import {
  deriveDemoMeasurementActions,
  runDemoMeasurementAction,
} from "../src/lib/measurement-actions.js";

const IDENTITY_MATRIX = Object.freeze([
  1, 0, 0, 0,
  0, 1, 0, 0,
  0, 0, 1, 0,
  0, 0, 0, 1,
]);

function makeRef({
  exactModelId = 17,
  exactShapeHandle = 33,
  kind = "face",
  elementId = 1,
  nodeId = "node:part",
  geometryId = "geo:part",
  transform = IDENTITY_MATRIX,
} = {}) {
  return {
    exactModelId,
    exactShapeHandle,
    kind,
    elementId,
    nodeId,
    geometryId,
    transform: transform.slice(),
  };
}

function makeItem({
  actorId = "workpiece",
  actorLabel = "Workpiece",
  mode = "face",
  exactRef = makeRef({ kind: mode }),
} = {}) {
  return {
    actorId,
    actorLabel,
    mode,
    exactRef,
    info: {},
  };
}

test("deriveDemoMeasurementActions exposes an explicit demo-local action matrix and typed unsupported analysis", () => {
  const counterboreFace = makeItem({
    actorId: "tool",
    actorLabel: "Generated Tool",
    mode: "face",
    exactRef: makeRef({
      exactModelId: 29,
      kind: "face",
      geometryId: "geo:counterbore",
      elementId: 9,
    }),
  });
  const pairFace = makeItem({
    mode: "face",
    exactRef: makeRef({
      exactModelId: 17,
      kind: "face",
      geometryId: "geo:pair-face",
      elementId: 7,
    }),
  });

  const single = deriveDemoMeasurementActions({
    items: [counterboreFace],
  });
  assert.deepEqual(
    single.actions.map((action) => action.id),
    ["face-area", "radius", "diameter", "hole", "counterbore", "countersink", "chamfer"],
  );
  assert.equal(single.unsupportedReason, null);

  const pair = deriveDemoMeasurementActions({
    items: [pairFace, counterboreFace],
  });
  assert.deepEqual(
    pair.actions.map((action) => action.id),
    [
      "distance",
      "clearance",
      "angle",
      "thickness",
      "step-depth",
      "center-to-center",
      "surface-to-center",
      "midpoint",
      "symmetry",
    ],
  );
  assert.equal(pair.unsupportedReason, null);

  assert.deepEqual(
    pair.actions
      .filter((action) => ["clearance", "step-depth", "center-to-center", "surface-to-center"].includes(action.id))
      .map((action) => [action.id, action.label]),
    [
      ["clearance", "Clearance Check"],
      ["step-depth", "Step Depth Check"],
      ["center-to-center", "Center Spacing"],
      ["surface-to-center", "Surface to Center"],
    ],
  );

  const unsupported = deriveDemoMeasurementActions({
    items: [
      pairFace,
      makeItem({
        actorId: "tool",
        actorLabel: "Generated Tool",
        mode: "edge",
        exactRef: makeRef({
          exactModelId: 29,
          kind: "edge",
          geometryId: "geo:mixed-edge",
          elementId: 13,
        }),
      }),
    ],
  });
  assert.deepEqual(unsupported.actions, []);
  assert.equal(
    unsupported.unsupportedReason?.message,
    "Select one face or edge, or a supported face/face or edge/edge pair to expose exact and CAM sample actions.",
  );
});

test("runDemoMeasurementAction composes center-to-center over shipped exact center queries", async () => {
  const firstCenterFace = makeItem({
    actorId: "workpiece",
    actorLabel: "Workpiece",
    mode: "face",
    exactRef: makeRef({
      exactModelId: 17,
      exactShapeHandle: 33,
      kind: "face",
      elementId: 7,
      geometryId: "geo:first-center-face",
    }),
  });
  const secondCenterFace = makeItem({
    actorId: "tool",
    actorLabel: "Generated Tool",
    mode: "face",
    exactRef: makeRef({
      exactModelId: 29,
      exactShapeHandle: 47,
      kind: "face",
      elementId: 12,
      geometryId: "geo:second-center-face",
    }),
  });
  const calls = [];
  const core = {
    async measureExactCenter(ref) {
      calls.push(["measureExactCenter", ref.elementId]);
      if (ref.elementId === 7) {
        return {
          ok: true,
          family: "cylinder",
          center: [0, 0, 0],
          axisDirection: [0, 0, 1],
          ref,
        };
      }
      return {
        ok: true,
        family: "cylinder",
        center: [20, 0, 0],
        axisDirection: [0, 0, 1],
        ref,
      };
    },
  };

  const availability = deriveDemoMeasurementActions({
    items: [firstCenterFace, secondCenterFace],
  });

  const result = await runDemoMeasurementAction({
    core,
    actionId: "center-to-center",
    items: [firstCenterFace, secondCenterFace],
    availability,
  });

  assert.deepEqual(calls, [
    ["measureExactCenter", 7],
    ["measureExactCenter", 12],
  ]);
  assert.equal(result.status, "success");
  assert.equal(result.code, null);
  assert.equal(result.value, 20);
  assert.equal(result.summary, "Center spacing 20.000");
  assert.equal(result.measurement?.ok, true);
  assert.equal(result.measurement?.kind, "center-to-center");
  assert.equal(result.placement?.ok, true);
  assert.equal(result.placement?.kind, "distance");
  assert.deepEqual(
    result.placement?.anchors?.map((anchor) => anchor.point),
    [
      [0, 0, 0],
      [20, 0, 0],
    ],
  );
});

test("runDemoMeasurementAction composes supported surface-to-center as a face-pair variant", async () => {
  const supportFace = makeItem({
    actorId: "workpiece",
    actorLabel: "Workpiece",
    mode: "face",
    exactRef: makeRef({
      exactModelId: 17,
      exactShapeHandle: 33,
      kind: "face",
      elementId: 7,
      geometryId: "geo:support-face",
    }),
  });
  const centerFace = makeItem({
    actorId: "tool",
    actorLabel: "Generated Tool",
    mode: "face",
    exactRef: makeRef({
      exactModelId: 29,
      exactShapeHandle: 47,
      kind: "face",
      elementId: 12,
      geometryId: "geo:center-face",
    }),
  });
  const calls = [];
  const core = {
    async getExactGeometryType(ref) {
      calls.push(["getExactGeometryType", ref.elementId]);
      if (ref.elementId === 7) {
        return { ok: true, family: "plane", ref };
      }
      return { ok: true, family: "cylinder", ref };
    },
    async measureExactCenter(ref) {
      calls.push(["measureExactCenter", ref.elementId]);
      return {
        ok: true,
        family: "cylinder",
        center: [0, 0, 25],
        axisDirection: [0, 0, 1],
        ref,
      };
    },
    async measureExactDistance(refA, refB) {
      calls.push(["measureExactDistance", refA.elementId, refB.elementId]);
      return {
        ok: true,
        value: 5,
        pointA: [0, 0, 0],
        pointB: [0, 0, 5],
        workingPlaneOrigin: [0, 0, 0],
        workingPlaneNormal: [0, 0, 1],
        refA,
        refB,
      };
    },
    async evaluateExactFaceNormal(ref, point) {
      calls.push(["evaluateExactFaceNormal", ref.elementId, point]);
      return {
        ok: true,
        point: [0, 0, 0],
        normal: [0, 0, 1],
        ref,
      };
    },
  };

  const availability = deriveDemoMeasurementActions({
    items: [supportFace, centerFace],
  });

  const result = await runDemoMeasurementAction({
    core,
    actionId: "surface-to-center",
    items: [supportFace, centerFace],
    availability,
  });

  assert.deepEqual(calls, [
    ["getExactGeometryType", 7],
    ["getExactGeometryType", 12],
    ["measureExactCenter", 12],
    ["measureExactDistance", 7, 12],
    ["evaluateExactFaceNormal", 7, [0, 0, 0]],
  ]);
  assert.equal(result.status, "success");
  assert.equal(result.code, null);
  assert.equal(result.value, 25);
  assert.equal(result.summary, "Surface-to-center offset 25.000");
  assert.equal(result.measurement?.ok, true);
  assert.equal(result.measurement?.kind, "surface-to-center");
  assert.equal(result.placement?.ok, true);
  assert.equal(result.placement?.kind, "distance");
  assert.deepEqual(
    result.placement?.anchors?.map((anchor) => anchor.point),
    [
      [0, 0, 0],
      [0, 0, 25],
    ],
  );
});

test("runDemoMeasurementAction normalizes success rows with stable refs and placement payloads", async () => {
  const workpieceFace = makeItem({
    actorId: "workpiece",
    actorLabel: "Workpiece",
    mode: "face",
    exactRef: makeRef({
      exactModelId: 17,
      exactShapeHandle: 33,
      kind: "face",
      elementId: 7,
      geometryId: "geo:workpiece",
    }),
  });
  const toolFace = makeItem({
    actorId: "tool",
    actorLabel: "Generated Tool",
    mode: "face",
    exactRef: makeRef({
      exactModelId: 29,
      exactShapeHandle: 47,
      kind: "face",
      elementId: 5,
      geometryId: "geo:tool",
      transform: [
        1, 0, 0, 0,
        0, 1, 0, 0,
        0, 0, 1, 0,
        0, 0, 40, 1,
      ],
    }),
  });
  const calls = [];
  const core = {
    async measureExactDistance(refA, refB) {
      calls.push(["measureExactDistance", refA, refB]);
      return {
        ok: true,
        value: 40,
        pointA: [0, 0, 0],
        pointB: [0, 0, 40],
        workingPlaneOrigin: [0, 0, 20],
        workingPlaneNormal: [0, 0, 1],
        refA,
        refB,
      };
    },
    async suggestExactDistancePlacement(refA, refB) {
      calls.push(["suggestExactDistancePlacement", refA, refB]);
      return {
        ok: true,
        kind: "distance",
        value: 40,
        frame: {
          origin: [0, 0, 20],
          normal: [1, 0, 0],
          xDir: [0, 0, 1],
          yDir: [0, 1, 0],
        },
        anchors: [
          { role: "attach", point: [0, 0, 0] },
          { role: "attach", point: [0, 0, 40] },
        ],
        refA,
        refB,
      };
    },
  };
  const availability = deriveDemoMeasurementActions({
    items: [workpieceFace, toolFace],
  });

  const result = await runDemoMeasurementAction({
    core,
    actionId: "distance",
    items: [workpieceFace, toolFace],
    availability,
  });

  assert.deepEqual(calls.map(([name]) => name), [
    "measureExactDistance",
    "suggestExactDistancePlacement",
  ]);
  assert.equal(result.actionId, "distance");
  assert.equal(result.status, "success");
  assert.equal(result.code, null);
  assert.equal(result.value, 40);
  assert.equal(result.summary, "Distance 40.000");
  assert.deepEqual(result.actorIds, ["tool", "workpiece"]);
  assert.deepEqual(
    result.refs.map((ref) => ({ actorId: ref.actorId, kind: ref.kind, elementId: ref.elementId })),
    [
      { actorId: "workpiece", kind: "face", elementId: 7 },
      { actorId: "tool", kind: "face", elementId: 5 },
    ],
  );
  assert.equal(result.measurement.ok, true);
  assert.equal(result.placement?.ok, true);
  assert.equal(result.placement?.kind, "distance");
});

test("runDemoMeasurementAction dispatches helper actions through package metadata and promotes helper geometry for overlay", async () => {
  const counterboreFace = makeItem({
    actorId: "tool",
    actorLabel: "Generated Tool",
    mode: "face",
    exactRef: makeRef({
      exactModelId: 29,
      exactShapeHandle: 47,
      kind: "face",
      elementId: 12,
      geometryId: "geo:counterbore",
    }),
  });
  const calls = [];
  const core = {
    async describeExactCounterbore(ref) {
      calls.push(["describeExactCounterbore", ref]);
      return {
        ok: true,
        kind: "counterbore",
        holeDiameter: 10,
        holeDepth: 20,
        frame: {
          origin: [0, 0, 0],
          normal: [1, 0, 0],
          xDir: [0, 0, 1],
          yDir: [0, 1, 0],
        },
        anchors: [
          { role: "center", point: [0, 0, 0] },
          { role: "attach", point: [0, 0, 5] },
        ],
        axisDirection: [0, 0, 1],
        counterboreDiameter: 16,
        counterboreDepth: 4,
        ref,
      };
    },
  };

  const availability = deriveDemoMeasurementActions({
    items: [counterboreFace],
  });

  const result = await runDemoMeasurementAction({
    core,
    actionId: "counterbore",
    items: [counterboreFace],
    availability,
  });

  assert.deepEqual(calls.map(([name]) => name), ["describeExactCounterbore"]);
  assert.equal(result.actionId, "counterbore");
  assert.equal(result.category, "helper");
  assert.equal(result.status, "success");
  assert.equal(result.code, null);
  assert.match(result.summary, /Counterbore/i);
  assert.equal(result.measurement?.ok, true);
  assert.equal(result.placement?.ok, true);
  assert.equal(result.placement?.kind, "counterbore");
});

test("runDemoMeasurementAction turns unsupported selections and kernel failures into typed rows", async () => {
  const firstFace = makeItem({
    mode: "face",
    exactRef: makeRef({
      exactModelId: 17,
      exactShapeHandle: 33,
      kind: "face",
      elementId: 7,
      geometryId: "geo:workpiece",
    }),
  });
  const edge = makeItem({
    actorId: "tool",
    actorLabel: "Generated Tool",
    mode: "edge",
    exactRef: makeRef({
      exactModelId: 29,
      exactShapeHandle: 47,
      kind: "edge",
      elementId: 2,
      geometryId: "geo:tool",
    }),
  });
  const unsupportedSelection = await runDemoMeasurementAction({
    core: {},
    actionId: "thickness",
    items: [firstFace, edge],
    availability: deriveDemoMeasurementActions({
      items: [firstFace, edge],
    }),
  });
  assert.equal(unsupportedSelection.status, "unsupported");
  assert.equal(unsupportedSelection.code, "unsupported-selection");
  assert.match(unsupportedSelection.summary, /Thickness/i);

  const typedFailure = await runDemoMeasurementAction({
    core: {
      async measureExactThickness() {
        return {
          ok: false,
          code: "unsupported-geometry",
          message: "Exact thickness only supports parallel planar face pairs.",
        };
      },
      async suggestExactThicknessPlacement() {
        throw new Error("placement should not run when measurement fails");
      },
    },
    actionId: "thickness",
    items: [
      firstFace,
      makeItem({
        actorId: "tool",
        actorLabel: "Generated Tool",
        mode: "face",
        exactRef: makeRef({
          exactModelId: 29,
          exactShapeHandle: 47,
          kind: "face",
          elementId: 8,
          geometryId: "geo:tool-face",
        }),
      }),
    ],
    availability: deriveDemoMeasurementActions({
      items: [
        firstFace,
        makeItem({
          actorId: "tool",
          actorLabel: "Generated Tool",
          mode: "face",
          exactRef: makeRef({
            exactModelId: 29,
            exactShapeHandle: 47,
            kind: "face",
            elementId: 8,
            geometryId: "geo:tool-face",
          }),
        }),
      ],
    }),
  });

  assert.equal(typedFailure.status, "unsupported");
  assert.equal(typedFailure.code, "unsupported-geometry");
  assert.equal(typedFailure.value, null);
  assert.equal(typedFailure.placement, null);
  assert.equal(typedFailure.measurement.ok, false);
  assert.match(typedFailure.summary, /parallel planar face pairs/i);
});

test("runDemoMeasurementAction keeps unsupported center semantics typed instead of dropping the demo action", async () => {
  const firstFace = makeItem({
    mode: "face",
    exactRef: makeRef({
      exactModelId: 17,
      exactShapeHandle: 33,
      kind: "face",
      elementId: 7,
      geometryId: "geo:first-face",
    }),
  });
  const secondFace = makeItem({
    actorId: "tool",
    actorLabel: "Generated Tool",
    mode: "face",
    exactRef: makeRef({
      exactModelId: 29,
      exactShapeHandle: 47,
      kind: "face",
      elementId: 12,
      geometryId: "geo:second-face",
    }),
  });

  const result = await runDemoMeasurementAction({
    core: {
      async measureExactCenter(ref) {
        if (ref.elementId === 7) {
          return {
            ok: false,
            code: "unsupported-geometry",
            message: "Exact center only supports circular and revolved geometry families.",
          };
        }
        return {
          ok: true,
          family: "cylinder",
          center: [20, 0, 0],
          axisDirection: [0, 0, 1],
          ref,
        };
      },
    },
    actionId: "center-to-center",
    items: [firstFace, secondFace],
    availability: deriveDemoMeasurementActions({
      items: [firstFace, secondFace],
    }),
  });

  assert.equal(result.status, "unsupported");
  assert.equal(result.code, "unsupported-geometry");
  assert.equal(result.value, null);
  assert.equal(result.placement, null);
  assert.equal(result.measurement.ok, false);
  assert.match(result.summary, /Center Spacing/i);
});

test("runDemoMeasurementAction normalizes missing composed core methods into typed runtime failures", async () => {
  const firstFace = makeItem({
    mode: "face",
    exactRef: makeRef({
      exactModelId: 17,
      exactShapeHandle: 33,
      kind: "face",
      elementId: 7,
      geometryId: "geo:first-face",
    }),
  });
  const secondFace = makeItem({
    actorId: "tool",
    actorLabel: "Generated Tool",
    mode: "face",
    exactRef: makeRef({
      exactModelId: 29,
      exactShapeHandle: 47,
      kind: "face",
      elementId: 12,
      geometryId: "geo:second-face",
    }),
  });

  const result = await runDemoMeasurementAction({
    core: {},
    actionId: "center-to-center",
    items: [firstFace, secondFace],
    availability: deriveDemoMeasurementActions({
      items: [firstFace, secondFace],
    }),
  });

  assert.equal(result.status, "failure");
  assert.equal(result.code, "runtime-error");
  assert.equal(result.value, null);
  assert.equal(result.placement, null);
  assert.match(result.summary, /measureExactCenter/i);
});

test("runDemoMeasurementAction keeps core refs aligned with the reported result when availability goes stale", async () => {
  const previousFirstFace = makeItem({
    actorId: "workpiece",
    actorLabel: "Workpiece",
    mode: "face",
    exactRef: makeRef({
      exactModelId: 17,
      exactShapeHandle: 33,
      kind: "face",
      elementId: 1,
      geometryId: "geo:old-first-face",
    }),
  });
  const previousSecondFace = makeItem({
    actorId: "tool",
    actorLabel: "Generated Tool",
    mode: "face",
    exactRef: makeRef({
      exactModelId: 29,
      exactShapeHandle: 47,
      kind: "face",
      elementId: 2,
      geometryId: "geo:old-second-face",
    }),
  });
  const nextFirstFace = makeItem({
    actorId: "workpiece",
    actorLabel: "Workpiece",
    mode: "face",
    exactRef: makeRef({
      exactModelId: 17,
      exactShapeHandle: 33,
      kind: "face",
      elementId: 101,
      geometryId: "geo:new-first-face",
    }),
  });
  const nextSecondFace = makeItem({
    actorId: "tool",
    actorLabel: "Generated Tool",
    mode: "face",
    exactRef: makeRef({
      exactModelId: 29,
      exactShapeHandle: 47,
      kind: "face",
      elementId: 202,
      geometryId: "geo:new-second-face",
    }),
  });
  const coreCalls = [];

  const result = await runDemoMeasurementAction({
    core: {
      async measureExactDistance(refA, refB) {
        coreCalls.push([refA.elementId, refB.elementId]);
        return {
          ok: true,
          value: 12,
          pointA: [0, 0, 0],
          pointB: [0, 0, 12],
          workingPlaneOrigin: [0, 0, 6],
          workingPlaneNormal: [0, 0, 1],
          refA,
          refB,
        };
      },
      async suggestExactDistancePlacement(refA, refB) {
        return {
          ok: true,
          kind: "distance",
          value: 12,
          frame: {
            origin: [0, 0, 6],
            normal: [1, 0, 0],
            xDir: [0, 0, 1],
            yDir: [0, 1, 0],
          },
          anchors: [
            { role: "attach", point: [0, 0, 0] },
            { role: "attach", point: [0, 0, 12] },
          ],
          refA,
          refB,
        };
      },
    },
    actionId: "distance",
    items: [nextFirstFace, nextSecondFace],
    availability: deriveDemoMeasurementActions({
      items: [previousFirstFace, previousSecondFace],
    }),
  });

  assert.deepEqual(coreCalls, [[101, 202]]);
  assert.deepEqual(
    result.refs.map((ref) => ref.elementId),
    [101, 202],
  );
  assert.equal(result.measurement?.refA?.elementId, 101);
  assert.equal(result.measurement?.refB?.elementId, 202);
});
