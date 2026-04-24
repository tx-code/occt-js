import test from "node:test";
import assert from "node:assert/strict";
import {
  buildMeasurementOverlayState,
  resolveActiveMeasurementOverlay,
} from "../src/lib/measurement-overlay.js";

function makeDistanceRun(overrides = {}) {
  return {
    id: "measurement-1",
    actionId: "distance",
    label: "Distance",
    status: "success",
    placement: {
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
    },
    ...overrides,
  };
}

test("buildMeasurementOverlayState translates placement DTOs into visible guide geometry", () => {
  const overlay = buildMeasurementOverlayState(makeDistanceRun());

  assert.equal(overlay.ok, true);
  assert.equal(overlay.code, null);
  assert.equal(overlay.kind, "distance");
  assert.equal(overlay.anchorCount, 2);
  assert.ok(overlay.guideSegmentCount >= 1);
  assert.ok(overlay.frameSegmentCount >= 2);
  assert.equal(overlay.batches.length, 2);
  assert.deepEqual(
    overlay.batches.map((batch) => batch.layer),
    ["measurement-overlay-visible", "measurement-overlay-xray"],
  );
  assert.ok(overlay.batches.every((batch) => Array.isArray(batch.points) || ArrayBuffer.isView(batch.points)));
  assert.ok(overlay.batches.every((batch) => batch.points.length >= 6));
});

test("buildMeasurementOverlayState reuses distance overlay grammar for center-to-center compositions", () => {
  const overlay = buildMeasurementOverlayState({
    id: "measurement-center-spacing",
    actionId: "center-to-center",
    label: "Center to Center",
    status: "success",
    placement: {
      ok: true,
      kind: "distance",
      value: 20,
      frame: {
        origin: [10, 0, 0],
        normal: [0, 1, 0],
        xDir: [1, 0, 0],
        yDir: [0, 0, 1],
      },
      anchors: [
        { role: "attach", point: [0, 0, 0] },
        { role: "attach", point: [20, 0, 0] },
      ],
    },
  });

  assert.equal(overlay.ok, true);
  assert.equal(overlay.kind, "distance");
  assert.ok(overlay.guideSegmentCount >= 1);
  assert.ok(overlay.batches.every((batch) => batch.points.length >= 6));
});

test("buildMeasurementOverlayState gives supported helper results a minimal axis guide when frame and axis data exist", () => {
  const overlay = buildMeasurementOverlayState({
    id: "measurement-3",
    actionId: "counterbore",
    label: "Counterbore",
    status: "success",
    placement: {
      ok: true,
      kind: "counterbore",
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
    },
  });

  assert.equal(overlay.ok, true);
  assert.equal(overlay.kind, "counterbore");
  assert.ok(overlay.guideSegmentCount >= 1);
  assert.ok(overlay.batches.every((batch) => batch.points.length >= 6));
});

test("buildMeasurementOverlayState keeps panel-only semantics explicit when placement is unavailable", () => {
  const overlay = buildMeasurementOverlayState({
    id: "measurement-2",
    actionId: "face-area",
    label: "Face Area",
    status: "success",
    placement: null,
  });

  assert.equal(overlay.ok, false);
  assert.equal(overlay.code, "panel-only");
  assert.equal(overlay.batches.length, 0);
  assert.match(overlay.message, /panel-only/i);
});

test("resolveActiveMeasurementOverlay follows the active run and clears deterministically", () => {
  const distanceOverlay = buildMeasurementOverlayState(makeDistanceRun({
    id: "measurement-1",
  }));
  const panelOnlyOverlay = buildMeasurementOverlayState({
    id: "measurement-2",
    actionId: "face-area",
    label: "Face Area",
    status: "success",
    placement: null,
  });
  const measurementRuns = [
    {
      ...makeDistanceRun({
        id: "measurement-1",
      }),
      overlay: distanceOverlay,
    },
    {
      id: "measurement-2",
      actionId: "face-area",
      label: "Face Area",
      status: "success",
      placement: null,
      overlay: panelOnlyOverlay,
    },
  ];

  let activeOverlay = resolveActiveMeasurementOverlay({
    measurementRuns,
    activeMeasurementId: "measurement-1",
  });
  assert.equal(activeOverlay.ok, true);
  assert.equal(activeOverlay.kind, "distance");

  activeOverlay = resolveActiveMeasurementOverlay({
    measurementRuns,
    activeMeasurementId: "measurement-2",
  });
  assert.equal(activeOverlay.ok, false);
  assert.equal(activeOverlay.code, "panel-only");

  activeOverlay = resolveActiveMeasurementOverlay({
    measurementRuns,
    activeMeasurementId: null,
  });
  assert.equal(activeOverlay.ok, false);
  assert.equal(activeOverlay.code, "no-active-measurement");
  assert.deepEqual(activeOverlay.batches, []);
});
