const ACTION_PRESENTATION = Object.freeze({
  distance: Object.freeze({
    id: "distance",
    label: "Distance",
    category: "measurement",
  }),
  angle: Object.freeze({
    id: "angle",
    label: "Angle",
    category: "measurement",
  }),
  thickness: Object.freeze({
    id: "thickness",
    label: "Thickness",
    category: "measurement",
  }),
  clearance: Object.freeze({
    id: "clearance",
    label: "Clearance Check",
    category: "measurement",
  }),
  "step-depth": Object.freeze({
    id: "step-depth",
    label: "Step Depth Check",
    category: "measurement",
  }),
  "center-to-center": Object.freeze({
    id: "center-to-center",
    label: "Center Spacing",
    category: "measurement",
  }),
  "surface-to-center": Object.freeze({
    id: "surface-to-center",
    label: "Surface to Center",
    category: "measurement",
  }),
  "face-area": Object.freeze({
    id: "face-area",
    label: "Face Area",
    category: "measurement",
  }),
  "edge-length": Object.freeze({
    id: "edge-length",
    label: "Edge Length",
    category: "measurement",
  }),
  radius: Object.freeze({
    id: "radius",
    label: "Radius",
    category: "measurement",
  }),
  diameter: Object.freeze({
    id: "diameter",
    label: "Diameter",
    category: "measurement",
  }),
  hole: Object.freeze({
    id: "hole",
    label: "Hole",
    category: "helper",
  }),
  counterbore: Object.freeze({
    id: "counterbore",
    label: "Counterbore",
    category: "helper",
  }),
  countersink: Object.freeze({
    id: "countersink",
    label: "Countersink",
    category: "helper",
  }),
  chamfer: Object.freeze({
    id: "chamfer",
    label: "Chamfer",
    category: "helper",
  }),
  midpoint: Object.freeze({
    id: "midpoint",
    label: "Midpoint",
    category: "helper",
  }),
  symmetry: Object.freeze({
    id: "symmetry",
    label: "Symmetry",
    category: "helper",
  }),
  "equal-distance": Object.freeze({
    id: "equal-distance",
    label: "Equal Distance",
    category: "helper",
  }),
});

const DIRECT_ACTION_DEFINITIONS = Object.freeze({
  "face-area": Object.freeze({
    invokeMethodName: "measureExactFaceArea",
    placementMethodName: null,
  }),
  "edge-length": Object.freeze({
    invokeMethodName: "measureExactEdgeLength",
    placementMethodName: null,
  }),
  radius: Object.freeze({
    invokeMethodName: "measureExactRadius",
    placementMethodName: "suggestExactRadiusPlacement",
  }),
  diameter: Object.freeze({
    invokeMethodName: "measureExactRadius",
    placementMethodName: "suggestExactDiameterPlacement",
  }),
  hole: Object.freeze({
    invokeMethodName: "describeExactHole",
    placementMethodName: null,
  }),
  counterbore: Object.freeze({
    invokeMethodName: "describeExactCounterbore",
    placementMethodName: null,
  }),
  countersink: Object.freeze({
    invokeMethodName: "describeExactCountersink",
    placementMethodName: null,
  }),
  chamfer: Object.freeze({
    invokeMethodName: "describeExactChamfer",
    placementMethodName: null,
  }),
  distance: Object.freeze({
    invokeMethodName: "measureExactDistance",
    placementMethodName: "suggestExactDistancePlacement",
  }),
  clearance: Object.freeze({
    invokeMethodName: "measureExactDistance",
    placementMethodName: "suggestExactDistancePlacement",
  }),
  angle: Object.freeze({
    invokeMethodName: "measureExactAngle",
    placementMethodName: "suggestExactAnglePlacement",
  }),
  thickness: Object.freeze({
    invokeMethodName: "measureExactThickness",
    placementMethodName: "suggestExactThicknessPlacement",
  }),
  "step-depth": Object.freeze({
    invokeMethodName: "measureExactThickness",
    placementMethodName: "suggestExactThicknessPlacement",
  }),
  midpoint: Object.freeze({
    invokeMethodName: "suggestExactMidpointPlacement",
    placementMethodName: null,
  }),
  symmetry: Object.freeze({
    invokeMethodName: "suggestExactSymmetryPlacement",
    placementMethodName: null,
  }),
});

const COMPOSED_ACTION_IDS = new Set([
  "center-to-center",
  "surface-to-center",
]);

function normalizeSelectionItems(items) {
  return Array.isArray(items) ? items.filter(Boolean) : [];
}

function getSelectionUnsupportedReason() {
  return {
    code: "unsupported-selection",
    message: "Select one face or edge, or a supported face/face or edge/edge pair to expose exact and CAM sample actions.",
  };
}

function toTitleCase(value) {
  return String(value ?? "")
    .split("-")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function resolveActionPresentation(actionId, fallbackCategory = "measurement") {
  const presentation = ACTION_PRESENTATION[actionId] ?? null;
  return {
    id: actionId,
    label: presentation?.label ?? toTitleCase(actionId),
    category: presentation?.category ?? fallbackCategory,
  };
}

function buildAction(actionId, refs) {
  const presentation = resolveActionPresentation(actionId);
  const directDefinition = DIRECT_ACTION_DEFINITIONS[actionId] ?? null;
  if (directDefinition) {
    return {
      id: actionId,
      label: presentation.label,
      category: presentation.category,
      arity: refs.length,
      execution: "direct",
      invokeMethodName: directDefinition.invokeMethodName,
      placementMethodName: directDefinition.placementMethodName,
      refs: refs.slice(),
    };
  }
  if (COMPOSED_ACTION_IDS.has(actionId)) {
    return {
      id: actionId,
      label: presentation.label,
      category: presentation.category,
      arity: refs.length,
      execution: "composed",
      invokeMethodName: null,
      placementMethodName: null,
      refs: refs.slice(),
    };
  }
  return null;
}

function buildSelectionActions(selectionItems) {
  const refs = selectionItems.map((item) => item.exactRef);
  const modes = selectionItems.map(getItemMode);

  if (selectionItems.length === 1) {
    const [mode] = modes;
    if (mode === "face") {
      return [
        "face-area",
        "radius",
        "diameter",
        "hole",
        "counterbore",
        "countersink",
        "chamfer",
      ].map((actionId) => buildAction(actionId, refs)).filter(Boolean);
    }

    if (mode === "edge") {
      return [
        "edge-length",
        "radius",
        "diameter",
        "hole",
      ].map((actionId) => buildAction(actionId, refs)).filter(Boolean);
    }

    return [];
  }

  if (selectionItems.length === 2) {
    if (modes.every((mode) => mode === "face")) {
      return [
        "distance",
        "clearance",
        "angle",
        "thickness",
        "step-depth",
        "center-to-center",
        "surface-to-center",
        "midpoint",
        "symmetry",
      ].map((actionId) => buildAction(actionId, refs)).filter(Boolean);
    }

    if (modes.every((mode) => mode === "edge")) {
      return [
        "distance",
        "angle",
        "midpoint",
        "symmetry",
      ].map((actionId) => buildAction(actionId, refs)).filter(Boolean);
    }

    return [];
  }

  return [];
}

export function createMeasurementRefKey(exactRef) {
  if (!exactRef || typeof exactRef !== "object") {
    return "";
  }
  return [
    exactRef.exactModelId ?? "",
    exactRef.exactShapeHandle ?? "",
    exactRef.kind ?? "",
    exactRef.elementId ?? "",
  ].join(":");
}

function getItemMode(item) {
  if (typeof item?.mode === "string" && item.mode.length > 0) {
    return item.mode;
  }
  return typeof item?.exactRef?.kind === "string" ? item.exactRef.kind : "";
}

export function deriveDemoMeasurementActions({
  items,
} = {}) {
  const selectionItems = normalizeSelectionItems(items);
  if (selectionItems.length === 0) {
    return {
      actions: [],
      unsupportedReason: getSelectionUnsupportedReason(),
    };
  }

  if (selectionItems.some((item) => !item?.exactRef)) {
    return {
      actions: [],
      unsupportedReason: {
        code: "missing-exact-ref",
        message: "The current selection is missing actor-scoped exact refs.",
      },
    };
  }

  const actions = buildSelectionActions(selectionItems);

  return {
    actions,
    unsupportedReason: actions.length > 0 ? null : getSelectionUnsupportedReason(),
  };
}

function formatValue(value) {
  return Number.isFinite(value) ? value.toFixed(3) : "";
}

function formatDegrees(value) {
  return Number.isFinite(value) ? `${((value * 180) / Math.PI).toFixed(1)}°` : "";
}

const WORLD_X = Object.freeze([1, 0, 0]);
const WORLD_Y = Object.freeze([0, 1, 0]);
const WORLD_Z = Object.freeze([0, 0, 1]);

function toPoint3(value) {
  if ((Array.isArray(value) || ArrayBuffer.isView(value)) && value.length >= 3) {
    const x = Number(value[0]);
    const y = Number(value[1]);
    const z = Number(value[2]);
    if (Number.isFinite(x) && Number.isFinite(y) && Number.isFinite(z)) {
      return [x, y, z];
    }
  }
  return null;
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

function dotProduct(left, right) {
  return (left[0] * right[0]) + (left[1] * right[1]) + (left[2] * right[2]);
}

function crossProduct(left, right) {
  return [
    (left[1] * right[2]) - (left[2] * right[1]),
    (left[2] * right[0]) - (left[0] * right[2]),
    (left[0] * right[1]) - (left[1] * right[0]),
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

function midpoint(left, right) {
  return [
    (left[0] + right[0]) / 2,
    (left[1] + right[1]) / 2,
    (left[2] + right[2]) / 2,
  ];
}

function distanceBetween(left, right) {
  return vectorLength(subtractPoint(right, left));
}

function choosePerpendicular(direction) {
  const normalized = normalizeDirection(direction, WORLD_X);
  const candidates = [WORLD_Z, WORLD_Y, WORLD_X];
  for (const candidate of candidates) {
    if (Math.abs(dotProduct(normalized, candidate)) < 0.95) {
      return candidate.slice();
    }
  }
  return WORLD_Y.slice();
}

function buildDistanceFrame(pointA, pointB, upHint = null) {
  const xDir = normalizeDirection(subtractPoint(pointB, pointA), WORLD_X);
  let upDir = normalizeDirection(upHint, choosePerpendicular(xDir));
  if (Math.abs(dotProduct(xDir, upDir)) > 0.95) {
    upDir = choosePerpendicular(xDir);
  }

  let normal = crossProduct(xDir, upDir);
  if (vectorLength(normal) <= 1e-6) {
    normal = choosePerpendicular(xDir);
  } else {
    normal = normalizeDirection(normal, choosePerpendicular(xDir));
  }

  const yDir = normalizeDirection(crossProduct(normal, xDir), choosePerpendicular(xDir));
  return {
    origin: midpoint(pointA, pointB),
    normal,
    xDir,
    yDir,
  };
}

function buildSyntheticDistancePlacement({
  pointA,
  pointB,
  value,
  upHint = null,
  refA,
  refB,
} = {}) {
  const safePointA = toPoint3(pointA);
  const safePointB = toPoint3(pointB);
  if (!safePointA || !safePointB) {
    return null;
  }

  return {
    ok: true,
    kind: "distance",
    value,
    frame: buildDistanceFrame(safePointA, safePointB, upHint),
    anchors: [
      { role: "attach", point: safePointA },
      { role: "attach", point: safePointB },
    ],
    refA,
    refB,
  };
}

function projectPointToPlane(point, planePoint, planeNormal) {
  const offset = subtractPoint(point, planePoint);
  const signedDistance = dotProduct(offset, planeNormal);
  return {
    signedDistance,
    projectedPoint: subtractPoint(point, scaleDirection(planeNormal, signedDistance)),
  };
}

function buildSuccessSummary(action, measurement, value) {
  switch (action.id) {
    case "clearance":
      if (Number.isFinite(value)) {
        return `Clearance check ${formatValue(value)}`;
      }
      return "Clearance check ready";
    case "step-depth":
      if (Number.isFinite(value)) {
        return `Step depth check ${formatValue(value)}`;
      }
      return "Step depth check ready";
    case "center-to-center":
      if (Number.isFinite(value)) {
        return `Center spacing ${formatValue(value)}`;
      }
      return "Center spacing ready";
    case "surface-to-center":
      if (Number.isFinite(value)) {
        return `Surface-to-center offset ${formatValue(value)}`;
      }
      return "Surface-to-center offset ready";
    case "distance":
    case "angle":
    case "thickness":
    case "face-area":
    case "edge-length":
    case "radius":
    case "diameter":
      if (Number.isFinite(value)) {
        return `${action.label} ${formatValue(value)}`;
      }
      return `${action.label} ready`;
    case "hole":
      return `Hole dia ${formatValue(measurement?.diameter)}${Number.isFinite(measurement?.depth) ? ` depth ${formatValue(measurement.depth)}` : ""}`;
    case "counterbore":
      return `Counterbore ${formatValue(measurement?.holeDiameter)} / ${formatValue(measurement?.counterboreDiameter)} x ${formatValue(measurement?.counterboreDepth)}`;
    case "countersink":
      return `Countersink ${formatValue(measurement?.holeDiameter)} / ${formatValue(measurement?.countersinkDiameter)} @ ${formatDegrees(measurement?.countersinkAngle)}`;
    case "chamfer":
      return `Chamfer ${formatValue(measurement?.distanceA)} x ${formatValue(measurement?.distanceB)}`;
    case "midpoint":
      return "Midpoint helper ready";
    case "symmetry":
      return "Symmetry helper ready";
    case "equal-distance":
      return `Equal Distance delta ${formatValue(measurement?.delta)}`;
    default:
      if (Number.isFinite(value)) {
        return `${action.label} ${formatValue(value)}`;
      }
      return `${action.label} ready`;
  }
}

function summarizeFailure(action, status, message) {
  if (status === "unsupported") {
    return `${action.label} unsupported: ${message}`;
  }
  return `${action.label} failed: ${message}`;
}

function buildRunRefs(items) {
  return normalizeSelectionItems(items).map((item) => ({
    actorId: item.actorId ?? null,
    actorLabel: item.actorLabel ?? item.actorId ?? null,
    kind: getItemMode(item),
    elementId: item?.exactRef?.elementId ?? null,
    exactRef: item?.exactRef ?? null,
  }));
}

function buildBaseResult(action, items) {
  return {
    actionId: action.id,
    category: action.category,
    label: action.label,
    actorIds: Array.from(
      new Set(
        normalizeSelectionItems(items)
          .map((item) => item?.actorId)
          .filter((actorId) => typeof actorId === "string" && actorId.length > 0),
      ),
    ).sort(),
    refs: buildRunRefs(items),
    value: null,
    measurement: null,
    placement: null,
    code: null,
  };
}

function buildSuccessResult(action, items, measurement, placement = null) {
  const value = normalizeSingleValue(action.id, measurement);
  const base = buildBaseResult(action, items);
  return {
    ...base,
    status: "success",
    value,
    measurement,
    placement,
    summary: buildSuccessSummary(action, measurement, value),
  };
}

function normalizeSingleValue(actionId, measurement) {
  if (actionId === "diameter") {
    if (Number.isFinite(measurement?.diameter)) {
      return measurement.diameter;
    }
    if (Number.isFinite(measurement?.radius)) {
      return measurement.radius * 2;
    }
  }

  if (actionId === "equal-distance" && Number.isFinite(measurement?.delta)) {
    return measurement.delta;
  }

  if (Number.isFinite(measurement?.value)) {
    return measurement.value;
  }
  if (Number.isFinite(measurement?.radius)) {
    return measurement.radius;
  }
  return null;
}

function isUnsupportedCode(code) {
  return typeof code === "string" && (
    code === "unsupported-selection" ||
    code === "missing-exact-ref" ||
    code === "released-handle" ||
    code === "parallel-geometry" ||
    code === "coincident-geometry" ||
    code.startsWith("unsupported-") ||
    code.startsWith("invalid-")
  );
}

function buildUnsupportedResult(action, items, code, message, measurement = null) {
  const base = buildBaseResult(action, items);
  return {
    ...base,
    status: "unsupported",
    code,
    measurement,
    summary: summarizeFailure(action, "unsupported", message),
  };
}

function buildFailureResult(action, items, code, message, measurement = null) {
  const base = buildBaseResult(action, items);
  return {
    ...base,
    status: "failure",
    code,
    measurement,
    summary: summarizeFailure(action, "failure", message),
  };
}

function normalizeCoreFailure(action, items, result, fallbackMessage) {
  const code = result?.code ?? "measurement-failed";
  const message = result?.message ?? fallbackMessage ?? `${action.label} could not be computed.`;
  if (isUnsupportedCode(code)) {
    return buildUnsupportedResult(action, items, code, message, result);
  }
  return buildFailureResult(action, items, code, message, result);
}

function resolveActionArgs(action, items) {
  const itemRefs = normalizeSelectionItems(items)
    .map((item) => item?.exactRef ?? null)
    .filter(Boolean);
  if (
    itemRefs.length > 0
    && (
      !Number.isFinite(action?.arity)
      || itemRefs.length === action.arity
    )
  ) {
    return itemRefs;
  }

  const actionRefs = Array.isArray(action?.refs) ? action.refs.filter(Boolean) : [];
  if (actionRefs.length > 0) {
    return actionRefs;
  }
  return itemRefs;
}

async function callCoreMethod(core, methodName, args) {
  if (!core || typeof core[methodName] !== "function") {
    throw new Error(`Measurement runtime does not expose ${methodName}().`);
  }
  return core[methodName](...args);
}

function supportsInlinePlacement(result) {
  return result?.ok === true
    && (
      (result.frame && Array.isArray(result.anchors))
      || (Array.isArray(result.anchors) && result.anchors.length > 0)
    );
}

function resolveUnknownAction(actionId, availability) {
  const fallback = resolveActionPresentation(actionId || "unknown-action");
  return {
    id: actionId || "unknown-action",
    label: fallback.label,
    category: fallback.category,
    invokeMethodName: "",
    placementMethodName: null,
    refs: [],
    unsupportedReason: availability?.unsupportedReason ?? getSelectionUnsupportedReason(),
  };
}

async function runDirectMeasurementAction({
  core,
  action,
  items,
} = {}) {
  const args = resolveActionArgs(action, normalizeSelectionItems(items));
  const measurement = await callCoreMethod(core, action.invokeMethodName, args);
  if (!measurement?.ok) {
    return normalizeCoreFailure(action, items, measurement, `${action.label} could not be computed.`);
  }

  let placement = null;
  if (action.placementMethodName) {
    const placementResult = await callCoreMethod(core, action.placementMethodName, args);
    placement = placementResult?.ok ? placementResult : null;
  } else if (supportsInlinePlacement(measurement)) {
    placement = measurement;
  }

  return buildSuccessResult(action, items, measurement, placement);
}

async function runCenterToCenterAction({
  core,
  action,
  items,
} = {}) {
  const args = resolveActionArgs(action, normalizeSelectionItems(items));
  if (args.length !== 2) {
    return buildUnsupportedResult(
      action,
      items,
      "unsupported-selection",
      "Center to Center requires two exact refs.",
    );
  }

  const [refA, refB] = args;
  const firstCenter = await callCoreMethod(core, "measureExactCenter", [refA]);
  if (!firstCenter?.ok) {
    return normalizeCoreFailure(
      action,
      items,
      firstCenter,
      "Center to Center requires both selections to expose exact centers.",
    );
  }

  const secondCenter = await callCoreMethod(core, "measureExactCenter", [refB]);
  if (!secondCenter?.ok) {
    return normalizeCoreFailure(
      action,
      items,
      secondCenter,
      "Center to Center requires both selections to expose exact centers.",
    );
  }

  const pointA = toPoint3(firstCenter.center);
  const pointB = toPoint3(secondCenter.center);
  if (!pointA || !pointB) {
    return buildFailureResult(
      action,
      items,
      "invalid-center-result",
      "Center to Center could not derive stable center points.",
      {
        ok: false,
        code: "invalid-center-result",
        firstCenter,
        secondCenter,
      },
    );
  }

  const axisHint = crossProduct(
    normalizeDirection(firstCenter.axisDirection, WORLD_Z),
    normalizeDirection(secondCenter.axisDirection, WORLD_Z),
  );
  const placement = buildSyntheticDistancePlacement({
    pointA,
    pointB,
    value: distanceBetween(pointA, pointB),
    upHint: vectorLength(axisHint) > 1e-6 ? axisHint : firstCenter.axisDirection,
    refA,
    refB,
  });
  if (!placement) {
    return buildFailureResult(
      action,
      items,
      "invalid-center-placement",
      "Center to Center could not derive a stable placement.",
      {
        ok: false,
        code: "invalid-center-placement",
        firstCenter,
        secondCenter,
      },
    );
  }

  const measurement = {
    ok: true,
    kind: "center-to-center",
    value: distanceBetween(pointA, pointB),
    pointA,
    pointB,
    workingPlaneOrigin: placement.frame.origin,
    workingPlaneNormal: placement.frame.normal,
    centerA: firstCenter,
    centerB: secondCenter,
    refA,
    refB,
  };
  return buildSuccessResult(action, items, measurement, placement);
}

function resolveSurfaceToCenterRefs(firstType, secondType, refs) {
  const [firstRef, secondRef] = refs;
  const firstIsPlane = firstType?.ok === true && firstType.family === "plane";
  const secondIsPlane = secondType?.ok === true && secondType.family === "plane";

  if (firstIsPlane && !secondIsPlane) {
    return {
      supportRef: firstRef,
      supportType: firstType,
      centerRef: secondRef,
      centerType: secondType,
    };
  }

  if (secondIsPlane && !firstIsPlane) {
    return {
      supportRef: secondRef,
      supportType: secondType,
      centerRef: firstRef,
      centerType: firstType,
    };
  }

  return null;
}

async function runSurfaceToCenterAction({
  core,
  action,
  items,
} = {}) {
  const args = resolveActionArgs(action, normalizeSelectionItems(items));
  if (args.length !== 2) {
    return buildUnsupportedResult(
      action,
      items,
      "unsupported-selection",
      "Surface to Center requires two face refs.",
    );
  }

  const [firstRef, secondRef] = args;
  const firstType = await callCoreMethod(core, "getExactGeometryType", [firstRef]);
  if (!firstType?.ok) {
    return normalizeCoreFailure(
      action,
      items,
      firstType,
      "Surface to Center could not analyze the first face.",
    );
  }

  const secondType = await callCoreMethod(core, "getExactGeometryType", [secondRef]);
  if (!secondType?.ok) {
    return normalizeCoreFailure(
      action,
      items,
      secondType,
      "Surface to Center could not analyze the second face.",
    );
  }

  const resolvedRefs = resolveSurfaceToCenterRefs(firstType, secondType, [firstRef, secondRef]);
  if (!resolvedRefs) {
    return buildUnsupportedResult(
      action,
      items,
      "unsupported-surface-to-center",
      "Surface to Center requires one planar support face and one center-capable face.",
      {
        ok: false,
        code: "unsupported-surface-to-center",
        firstType,
        secondType,
      },
    );
  }

  const centerMeasurement = await callCoreMethod(core, "measureExactCenter", [resolvedRefs.centerRef]);
  if (!centerMeasurement?.ok) {
    return normalizeCoreFailure(
      action,
      items,
      centerMeasurement,
      "Surface to Center requires the non-planar face to expose an exact center.",
    );
  }

  const supportDistance = await callCoreMethod(core, "measureExactDistance", [
    resolvedRefs.supportRef,
    resolvedRefs.centerRef,
  ]);
  if (!supportDistance?.ok) {
    return normalizeCoreFailure(
      action,
      items,
      supportDistance,
      "Surface to Center could not derive a support point on the selected face.",
    );
  }

  const supportPoint = toPoint3(supportDistance.pointA);
  if (!supportPoint) {
    return buildFailureResult(
      action,
      items,
      "invalid-support-point",
      "Surface to Center could not derive a stable point on the support plane.",
      {
        ok: false,
        code: "invalid-support-point",
        supportDistance,
      },
    );
  }

  const supportNormal = await callCoreMethod(core, "evaluateExactFaceNormal", [
    resolvedRefs.supportRef,
    supportPoint,
  ]);
  if (!supportNormal?.ok) {
    return normalizeCoreFailure(
      action,
      items,
      supportNormal,
      "Surface to Center could not evaluate the support face normal.",
    );
  }

  const centerPoint = toPoint3(centerMeasurement.center);
  const planePoint = toPoint3(supportNormal.point) ?? supportPoint;
  const planeNormal = normalizeDirection(
    supportNormal.normal,
    supportDistance.workingPlaneNormal ?? WORLD_Z,
  );
  if (!centerPoint) {
    return buildFailureResult(
      action,
      items,
      "invalid-center-result",
      "Surface to Center could not derive a stable center point.",
      {
        ok: false,
        code: "invalid-center-result",
        centerMeasurement,
      },
    );
  }

  const projection = projectPointToPlane(centerPoint, planePoint, planeNormal);
  const value = Math.abs(projection.signedDistance);
  const placement = buildSyntheticDistancePlacement({
    pointA: projection.projectedPoint,
    pointB: centerPoint,
    value,
    upHint: planeNormal,
    refA: resolvedRefs.supportRef,
    refB: resolvedRefs.centerRef,
  });
  if (!placement) {
    return buildFailureResult(
      action,
      items,
      "invalid-surface-placement",
      "Surface to Center could not derive a stable placement.",
      {
        ok: false,
        code: "invalid-surface-placement",
        centerMeasurement,
        supportDistance,
        supportNormal,
      },
    );
  }

  const measurement = {
    ok: true,
    kind: "surface-to-center",
    value,
    pointA: projection.projectedPoint,
    pointB: centerPoint,
    workingPlaneOrigin: placement.frame.origin,
    workingPlaneNormal: planeNormal,
    supportFace: {
      family: resolvedRefs.supportType.family,
      ref: resolvedRefs.supportRef,
    },
    centerSource: centerMeasurement,
    refA: resolvedRefs.supportRef,
    refB: resolvedRefs.centerRef,
  };
  return buildSuccessResult(action, items, measurement, placement);
}

async function runComposedMeasurementAction({
  core,
  action,
  items,
} = {}) {
  if (action.id === "center-to-center") {
    return runCenterToCenterAction({ core, action, items });
  }
  if (action.id === "surface-to-center") {
    return runSurfaceToCenterAction({ core, action, items });
  }
  return buildUnsupportedResult(
    action,
    items,
    "unsupported-action",
    `${action.label} is not wired into the demo action runner.`,
  );
}

export async function runDemoMeasurementAction({
  core,
  actionId,
  items,
  availability = null,
} = {}) {
  const action = availability?.actions?.find((entry) => entry.id === actionId) ?? null;
  if (!action) {
    const unknownAction = resolveUnknownAction(actionId, availability);
    return buildUnsupportedResult(
      unknownAction,
      items,
      unknownAction.unsupportedReason.code,
      unknownAction.unsupportedReason.message,
    );
  }

  try {
    if (action.execution === "composed") {
      return await runComposedMeasurementAction({
        core,
        action,
        items,
      });
    }
    return await runDirectMeasurementAction({
      core,
      action,
      items,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return buildFailureResult(action, items, "runtime-error", message);
  }
}
