export const MEASUREMENT_OVERLAY_LAYERS = Object.freeze({
  visible: "measurement-overlay-visible",
  xray: "measurement-overlay-xray",
});

export const MEASUREMENT_OVERLAY_LAYER_STYLES = Object.freeze({
  [MEASUREMENT_OVERLAY_LAYERS.visible]: Object.freeze({
    mode: "base",
    capExtension: 0,
    widthScale: 1.16,
    renderingGroupId: 1,
    alphaIndex: 30,
    depthFunction: "lequal",
    blending: false,
    zOffset: -3,
    zOffsetUnits: -4,
  }),
  [MEASUREMENT_OVERLAY_LAYERS.xray]: Object.freeze({
    mode: "base",
    capExtension: 0,
    widthScale: 1.08,
    renderingGroupId: 1,
    alphaIndex: 29,
    depthFunction: "always",
    blending: true,
    zOffset: 0,
    zOffsetUnits: 0,
  }),
});

const WORLD_X = Object.freeze([1, 0, 0]);
const WORLD_Y = Object.freeze([0, 1, 0]);
const WORLD_Z = Object.freeze([0, 0, 1]);

function isPoint3(value) {
  return (Array.isArray(value) || ArrayBuffer.isView(value))
    && value.length >= 3
    && Number.isFinite(value[0])
    && Number.isFinite(value[1])
    && Number.isFinite(value[2]);
}

function toPoint3(value) {
  if (!isPoint3(value)) {
    return null;
  }
  return [value[0], value[1], value[2]];
}

function addPoint(left, right) {
  return [
    left[0] + right[0],
    left[1] + right[1],
    left[2] + right[2],
  ];
}

function subtractPoint(left, right) {
  return [
    left[0] - right[0],
    left[1] - right[1],
    left[2] - right[2],
  ];
}

function scaleDirection(direction, factor) {
  return [
    direction[0] * factor,
    direction[1] * factor,
    direction[2] * factor,
  ];
}

function vectorLength(vector) {
  return Math.hypot(vector[0], vector[1], vector[2]);
}

function normalizeDirection(direction, fallback = WORLD_X) {
  const vector = toPoint3(direction);
  const length = vector ? vectorLength(vector) : 0;
  if (length <= 0) {
    return fallback.slice();
  }
  return vector.map((value) => value / length);
}

function pointDistance(left, right) {
  return vectorLength(subtractPoint(left, right));
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function flattenLines(lines, layer, color, width, id) {
  const points = [];
  const segmentColors = [];
  const segmentDashPeriods = [];
  const breakSegmentIndices = [];
  let hasAnyLine = false;

  for (const line of lines) {
    if (!Array.isArray(line) || line.length < 6 || line.length % 3 !== 0) {
      continue;
    }

    if (hasAnyLine) {
      const bridgeSegmentIndex = points.length / 3 - 1;
      breakSegmentIndices.push(bridgeSegmentIndex);
      segmentColors.push(...color);
      segmentDashPeriods.push(0);
    }

    for (let index = 0; index < line.length; index += 1) {
      points.push(line[index]);
    }

    const segmentCount = line.length / 3 - 1;
    for (let segmentIndex = 0; segmentIndex < segmentCount; segmentIndex += 1) {
      segmentColors.push(...color);
      segmentDashPeriods.push(0);
    }

    hasAnyLine = true;
  }

  if (points.length < 6) {
    return null;
  }

  return {
    id,
    layer,
    points,
    segmentColors,
    segmentDashPeriods,
    breakSegmentIndices,
    width,
  };
}

function getPlacementPoints(placement) {
  const anchors = Array.isArray(placement?.anchors)
    ? placement.anchors.map((anchor) => toPoint3(anchor?.point)).filter(Boolean)
    : [];
  const origin = toPoint3(placement?.frame?.origin);
  return origin ? [origin, ...anchors] : anchors;
}

function getPlacementScale(placement) {
  const points = getPlacementPoints(placement);
  let span = 0;

  for (let leftIndex = 0; leftIndex < points.length; leftIndex += 1) {
    for (let rightIndex = leftIndex + 1; rightIndex < points.length; rightIndex += 1) {
      span = Math.max(span, pointDistance(points[leftIndex], points[rightIndex]));
    }
  }

  const value = Number.isFinite(placement?.value) && placement.kind !== "angle"
    ? Math.abs(placement.value)
    : 0;
  const reference = Math.max(span, value, 5);
  return {
    markerHalfSize: clamp(reference * 0.06, 0.8, 8),
    frameSize: clamp(reference * 0.18, 1.6, 18),
  };
}

function dedupeAnchorPoints(anchors) {
  const seen = new Set();
  const points = [];

  for (const anchor of Array.isArray(anchors) ? anchors : []) {
    const point = toPoint3(anchor?.point);
    if (!point) {
      continue;
    }
    const key = point.map((value) => value.toFixed(6)).join(":");
    if (seen.has(key)) {
      continue;
    }
    seen.add(key);
    points.push(point);
  }

  return points;
}

function buildMarkerLines(points, frame, markerHalfSize) {
  const xDir = normalizeDirection(frame?.xDir, WORLD_X);
  const yDir = normalizeDirection(frame?.yDir, WORLD_Y);
  const lines = [];

  for (const point of points) {
    const xOffset = scaleDirection(xDir, markerHalfSize);
    const yOffset = scaleDirection(yDir, markerHalfSize);
    lines.push([
      ...subtractPoint(point, xOffset),
      ...addPoint(point, xOffset),
    ]);
    lines.push([
      ...subtractPoint(point, yOffset),
      ...addPoint(point, yOffset),
    ]);
  }

  return lines;
}

function buildFrameLines(frame, frameSize) {
  const origin = toPoint3(frame?.origin);
  if (!origin) {
    return [];
  }

  const xDir = normalizeDirection(frame?.xDir, WORLD_X);
  const yDir = normalizeDirection(frame?.yDir, WORLD_Y);
  return [
    [
      ...origin,
      ...addPoint(origin, scaleDirection(xDir, frameSize)),
    ],
    [
      ...origin,
      ...addPoint(origin, scaleDirection(yDir, frameSize)),
    ],
  ];
}

function getAnchorByRole(anchors, role) {
  return (Array.isArray(anchors) ? anchors : [])
    .filter((anchor) => anchor?.role === role)
    .map((anchor) => toPoint3(anchor?.point))
    .filter(Boolean);
}

function buildGuideLines(placement) {
  const anchors = Array.isArray(placement?.anchors) ? placement.anchors : [];
  const attachAnchors = getAnchorByRole(anchors, "attach");
  const anchorAnchors = getAnchorByRole(anchors, "anchor");
  const centerAnchors = getAnchorByRole(anchors, "center");

  if (placement?.kind === "distance" || placement?.kind === "thickness") {
    if (attachAnchors.length >= 2) {
      return [[...attachAnchors[0], ...attachAnchors[1]]];
    }
  }

  if (placement?.kind === "angle") {
    const origin = anchorAnchors[0]
      ?? centerAnchors[0]
      ?? toPoint3(placement?.frame?.origin);
    if (!origin || attachAnchors.length < 2) {
      return [];
    }
    return [
      [...origin, ...attachAnchors[0]],
      [...origin, ...attachAnchors[1]],
    ];
  }

  if (placement?.kind === "radius") {
    const center = centerAnchors[0] ?? toPoint3(placement?.frame?.origin);
    const anchor = anchorAnchors[0] ?? attachAnchors[0];
    if (!center || !anchor) {
      return [];
    }
    return [[...center, ...anchor]];
  }

  if (placement?.kind === "diameter") {
    if (anchorAnchors.length >= 2) {
      return [[...anchorAnchors[0], ...anchorAnchors[1]]];
    }
    const center = centerAnchors[0] ?? toPoint3(placement?.frame?.origin);
    const anchor = anchorAnchors[0] ?? attachAnchors[0];
    if (!center || !anchor) {
      return [];
    }
    const opposite = subtractPoint(center, subtractPoint(anchor, center));
    return [[...anchor, ...opposite]];
  }

  if (
    placement?.kind === "hole"
    || placement?.kind === "counterbore"
    || placement?.kind === "countersink"
    || placement?.kind === "chamfer"
  ) {
    const center = centerAnchors[0] ?? toPoint3(placement?.frame?.origin);
    const attach = attachAnchors[0] ?? anchorAnchors[0];
    if (center && attach) {
      return [[...center, ...attach]];
    }

    const axisDirection = normalizeDirection(placement?.axisDirection, WORLD_Z);
    if (!center) {
      return [];
    }

    const { frameSize } = getPlacementScale(placement);
    return [[
      ...center,
      ...addPoint(center, scaleDirection(axisDirection, Math.max(frameSize, 3))),
    ]];
  }

  return [];
}

function buildEmptyOverlay(code, message, kind = null) {
  return {
    ok: false,
    code,
    kind,
    message,
    anchorCount: 0,
    guideSegmentCount: 0,
    frameSegmentCount: 0,
    batches: [],
  };
}

export function buildMeasurementOverlayState(run) {
  if (!run) {
    return buildEmptyOverlay(
      "no-active-measurement",
      "No active measurement result is selected.",
    );
  }

  if (run.status !== "success") {
    return buildEmptyOverlay(
      "panel-only",
      `${run.label || "Measurement"} remains panel-only because scene guides are only rendered for successful placement-backed results.`,
      run.actionId ?? null,
    );
  }

  const placement = run.placement;
  if (!placement || placement.ok !== true) {
    return buildEmptyOverlay(
      "panel-only",
      `${run.label || "Measurement"} remains panel-only because no stable placement DTO is available.`,
      run.actionId ?? null,
    );
  }

  const { markerHalfSize, frameSize } = getPlacementScale(placement);
  const guideLines = buildGuideLines(placement);
  const frameLines = buildFrameLines(placement.frame, frameSize);
  const markerLines = buildMarkerLines(
    dedupeAnchorPoints(placement.anchors),
    placement.frame ?? {
      origin: toPoint3(placement?.frame?.origin) ?? [0, 0, 0],
      xDir: WORLD_X,
      yDir: WORLD_Y,
      normal: WORLD_Z,
    },
    markerHalfSize,
  );

  const allLines = [
    ...guideLines,
    ...frameLines,
    ...markerLines,
  ];

  if (allLines.length === 0) {
    return buildEmptyOverlay(
      "panel-only",
      `${run.label || "Measurement"} remains panel-only because placement data did not produce stable guide geometry.`,
      placement.kind ?? run.actionId ?? null,
    );
  }

  const visibleBatch = flattenLines(
    allLines,
    MEASUREMENT_OVERLAY_LAYERS.visible,
    [1.0, 0.78, 0.2, 0.95],
    1.6,
    `measurement-overlay:${run.id ?? run.actionId ?? "active"}:visible`,
  );
  const xrayBatch = flattenLines(
    allLines,
    MEASUREMENT_OVERLAY_LAYERS.xray,
    [1.0, 0.78, 0.2, 0.34],
    1.35,
    `measurement-overlay:${run.id ?? run.actionId ?? "active"}:xray`,
  );

  const batches = [visibleBatch, xrayBatch].filter(Boolean);
  if (batches.length === 0) {
    return buildEmptyOverlay(
      "panel-only",
      `${run.label || "Measurement"} remains panel-only because no overlay batches could be created.`,
      placement.kind ?? run.actionId ?? null,
    );
  }

  return {
    ok: true,
    code: null,
    kind: placement.kind ?? run.actionId ?? null,
    message: `${run.label || "Measurement"} overlay active.`,
    anchorCount: dedupeAnchorPoints(placement.anchors).length,
    guideSegmentCount: guideLines.length,
    frameSegmentCount: frameLines.length,
    batches,
  };
}

export function resolveActiveMeasurementOverlay({
  measurementRuns = [],
  activeMeasurementId = null,
} = {}) {
  if (!activeMeasurementId) {
    return buildEmptyOverlay(
      "no-active-measurement",
      "No active measurement result is selected.",
    );
  }

  const activeRun = (Array.isArray(measurementRuns) ? measurementRuns : [])
    .find((run) => run?.id === activeMeasurementId) ?? null;
  if (!activeRun) {
    return buildEmptyOverlay(
      "no-active-measurement",
      "No active measurement result is selected.",
    );
  }

  return activeRun.overlay ?? buildMeasurementOverlayState(activeRun);
}
