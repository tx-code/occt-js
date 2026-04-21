const EPSILON = 1e-9;
const FULL_REVOLVE_DEGREES = 360;
const SUPPORTED_SHAPES = new Set([
  "endmill",
  "ballend",
  "bullnose",
  "drill",
  "taper-flat",
  "taper-ball",
  "barrel",
  "lollipop",
]);

function assertObject(definition) {
  if (!definition || typeof definition !== "object" || Array.isArray(definition)) {
    throw new Error("Tool definition must be a plain object.");
  }
}

function normalizeShape(shape) {
  if (typeof shape !== "string") {
    throw new Error("Tool definition requires a shape string.");
  }

  const normalized = shape.trim().toLowerCase().replace(/[_\s]+/g, "-");
  if (normalized === "ballnose") {
    return "ballend";
  }
  if (normalized === "taperflat") {
    return "taper-flat";
  }
  if (normalized === "taperball") {
    return "taper-ball";
  }
  if (!SUPPORTED_SHAPES.has(normalized)) {
    throw new Error(`Unsupported tool shape: ${shape}. Supported shapes: ${[...SUPPORTED_SHAPES].join(", ")}.`);
  }
  return normalized;
}

function normalizeUnits(units) {
  if (units == null) {
    return "mm";
  }
  if (units === "mm" || units === "inch") {
    return units;
  }
  throw new Error(`Unsupported tool units: ${units}. Supported units: mm, inch.`);
}

function requireFiniteNumber(name, value) {
  const normalized = Number(value);
  if (!Number.isFinite(normalized)) {
    throw new Error(`${name} must be a finite number.`);
  }
  return normalized;
}

function requirePositive(name, value) {
  const normalized = requireFiniteNumber(name, value);
  if (normalized <= 0) {
    throw new Error(`${name} must be greater than zero.`);
  }
  return normalized;
}

function requireNonNegative(name, value) {
  const normalized = requireFiniteNumber(name, value);
  if (normalized < 0) {
    throw new Error(`${name} must be zero or greater.`);
  }
  return normalized;
}

function requireStrictlySmaller(name, value, upperBoundName, upperBound) {
  const normalized = requirePositive(name, value);
  if (normalized + EPSILON >= upperBound) {
    throw new Error(`${name} must be smaller than ${upperBoundName}.`);
  }
  return normalized;
}

function nearlyEqual(left, right) {
  return Math.abs(left - right) <= EPSILON;
}

function samePoint(left, right) {
  return nearlyEqual(left[0], right[0]) && nearlyEqual(left[1], right[1]);
}

function clonePoint(point) {
  return [point[0], point[1]];
}

function appendLine(segments, currentPoint, endPoint, id, tag) {
  const normalizedEnd = clonePoint(endPoint);
  if (samePoint(currentPoint, normalizedEnd)) {
    return normalizedEnd;
  }

  segments.push({
    kind: "line",
    id,
    tag,
    end: normalizedEnd,
  });
  return normalizedEnd;
}

function appendArcCenter(segments, currentPoint, centerPoint, endPoint, id, tag) {
  const normalizedCenter = clonePoint(centerPoint);
  const normalizedEnd = clonePoint(endPoint);
  if (samePoint(currentPoint, normalizedEnd)) {
    return normalizedEnd;
  }

  const startRadius = Math.hypot(currentPoint[0] - normalizedCenter[0], currentPoint[1] - normalizedCenter[1]);
  const endRadius = Math.hypot(normalizedEnd[0] - normalizedCenter[0], normalizedEnd[1] - normalizedCenter[1]);
  const tolerance = Math.max(EPSILON, startRadius * 1e-6, endRadius * 1e-6);

  if (startRadius <= EPSILON || endRadius <= EPSILON) {
    throw new Error(`${id} would create a degenerate arc.`);
  }
  if (Math.abs(startRadius - endRadius) > tolerance) {
    throw new Error(`${id} would create an invalid arc_center segment.`);
  }

  segments.push({
    kind: "arc_center",
    id,
    tag,
    center: normalizedCenter,
    end: normalizedEnd,
  });
  return normalizedEnd;
}

function finalizeSpec(units, segments, currentPoint, topZ) {
  let point = clonePoint(currentPoint);
  point = appendLine(segments, point, [0, topZ], "axis-top", "closure");
  point = appendLine(segments, point, [0, 0], "axis-bottom", "closure");

  if (!samePoint(point, [0, 0])) {
    throw new Error("Generated tool profile failed to close back to the revolve axis.");
  }

  return {
    version: 1,
    units,
    profile: {
      plane: "XZ",
      start: [0, 0],
      closure: "explicit",
      segments,
    },
    revolve: {
      angleDeg: FULL_REVOLVE_DEGREES,
    },
  };
}

function buildEndmillSpec(definition, units) {
  const diameter = requirePositive("diameter", definition.diameter);
  const length = requirePositive("length", definition.length);
  const cuttingEdgeHeight = requirePositive("cuttingEdgeHeight", definition.cuttingEdgeHeight);
  const shankDiameter = definition.shankDiameter == null
    ? diameter
    : requirePositive("shankDiameter", definition.shankDiameter);

  if (cuttingEdgeHeight - length > EPSILON) {
    throw new Error("cuttingEdgeHeight cannot exceed length.");
  }

  const cuttingRadius = diameter / 2;
  const shankRadius = shankDiameter / 2;
  const segments = [];
  let point = [0, 0];

  point = appendLine(segments, point, [cuttingRadius, 0], "tip", "tip");
  point = appendLine(segments, point, [cuttingRadius, cuttingEdgeHeight], "flute", "cutting");
  point = appendLine(segments, point, [shankRadius, cuttingEdgeHeight], "shoulder", "shank");
  point = appendLine(segments, point, [shankRadius, length], "shank", "shank");

  return finalizeSpec(units, segments, point, length);
}

function buildBallendSpec(definition, units) {
  const diameter = requirePositive("diameter", definition.diameter);
  const length = requirePositive("length", definition.length);
  const ballRadius = diameter / 2;
  const requestedCuttingEdgeHeight = definition.cuttingEdgeHeight == null
    ? ballRadius
    : requireNonNegative("cuttingEdgeHeight", definition.cuttingEdgeHeight);
  const cuttingEdgeHeight = nearlyEqual(requestedCuttingEdgeHeight, 0) ? ballRadius : requestedCuttingEdgeHeight;
  const shankDiameter = definition.shankDiameter == null
    ? diameter
    : requirePositive("shankDiameter", definition.shankDiameter);

  if (cuttingEdgeHeight + EPSILON < ballRadius) {
    throw new Error("Ballend cuttingEdgeHeight must be zero or at least the tool radius.");
  }
  if (cuttingEdgeHeight - length > EPSILON) {
    throw new Error("cuttingEdgeHeight cannot exceed length.");
  }

  const shankRadius = shankDiameter / 2;
  const segments = [];
  let point = [0, 0];

  point = appendArcCenter(segments, point, [0, ballRadius], [ballRadius, ballRadius], "ball", "tip");
  point = appendLine(segments, point, [ballRadius, cuttingEdgeHeight], "flute", "cutting");
  point = appendLine(segments, point, [shankRadius, cuttingEdgeHeight], "shoulder", "shank");
  point = appendLine(segments, point, [shankRadius, length], "shank", "shank");

  return finalizeSpec(units, segments, point, length);
}

function buildBullnoseSpec(definition, units) {
  const diameter = requirePositive("diameter", definition.diameter);
  const length = requirePositive("length", definition.length);
  const cuttingEdgeHeight = requirePositive("cuttingEdgeHeight", definition.cuttingEdgeHeight);
  const cornerRadius = requirePositive("cornerRadius", definition.cornerRadius);
  const shankDiameter = definition.shankDiameter == null
    ? diameter
    : requirePositive("shankDiameter", definition.shankDiameter);

  if (cuttingEdgeHeight - length > EPSILON) {
    throw new Error("cuttingEdgeHeight cannot exceed length.");
  }

  const outerRadius = diameter / 2;
  const flatRadius = outerRadius - cornerRadius;
  if (flatRadius <= EPSILON) {
    throw new Error("cornerRadius must be smaller than half the tool diameter.");
  }
  if (cuttingEdgeHeight + EPSILON < cornerRadius) {
    throw new Error("cuttingEdgeHeight must be at least the cornerRadius.");
  }

  const shankRadius = shankDiameter / 2;
  const segments = [];
  let point = [0, 0];

  point = appendLine(segments, point, [flatRadius, 0], "tip-flat", "tip");
  point = appendArcCenter(
    segments,
    point,
    [flatRadius, cornerRadius],
    [outerRadius, cornerRadius],
    "corner",
    "corner",
  );
  point = appendLine(segments, point, [outerRadius, cuttingEdgeHeight], "flute", "cutting");
  point = appendLine(segments, point, [shankRadius, cuttingEdgeHeight], "shoulder", "shank");
  point = appendLine(segments, point, [shankRadius, length], "shank", "shank");

  return finalizeSpec(units, segments, point, length);
}

function buildDrillSpec(definition, units) {
  const diameter = requirePositive("diameter", definition.diameter);
  const length = requirePositive("length", definition.length);
  const tipAngle = requirePositive("tipAngle", definition.tipAngle);
  if (tipAngle >= 180) {
    throw new Error("tipAngle must be less than 180 degrees.");
  }

  const radius = diameter / 2;
  const tipHeight = radius / Math.tan((tipAngle * Math.PI) / 360);
  if (!Number.isFinite(tipHeight) || tipHeight <= EPSILON) {
    throw new Error("tipAngle would create an invalid drill tip.");
  }
  if (tipHeight - length > EPSILON) {
    throw new Error("length must be at least the computed drill tip height.");
  }

  const segments = [];
  let point = [0, 0];

  point = appendLine(segments, point, [radius, tipHeight], "tip", "tip");
  point = appendLine(segments, point, [radius, length], "body", "cutting");

  return finalizeSpec(units, segments, point, length);
}

function buildTaperFlatSpec(definition, units) {
  const diameter = requirePositive("diameter", definition.diameter);
  const tipDiameter = requireStrictlySmaller("tipDiameter", definition.tipDiameter, "diameter", diameter);
  const length = requirePositive("length", definition.length);
  const cuttingEdgeHeight = requirePositive("cuttingEdgeHeight", definition.cuttingEdgeHeight);
  const shankDiameter = definition.shankDiameter == null
    ? diameter
    : requirePositive("shankDiameter", definition.shankDiameter);

  if (cuttingEdgeHeight - length > EPSILON) {
    throw new Error("cuttingEdgeHeight cannot exceed length.");
  }

  const tipRadius = tipDiameter / 2;
  const outerRadius = diameter / 2;
  const shankRadius = shankDiameter / 2;
  const segments = [];
  let point = [0, 0];

  point = appendLine(segments, point, [tipRadius, 0], "tip-flat", "tip");
  point = appendLine(segments, point, [outerRadius, cuttingEdgeHeight], "taper-flank", "cutting");
  point = appendLine(segments, point, [shankRadius, cuttingEdgeHeight], "shoulder", "shank");
  point = appendLine(segments, point, [shankRadius, length], "shank", "shank");

  return finalizeSpec(units, segments, point, length);
}

function buildTaperBallSpec(definition, units) {
  const diameter = requirePositive("diameter", definition.diameter);
  const tipDiameter = requireStrictlySmaller("tipDiameter", definition.tipDiameter, "diameter", diameter);
  const length = requirePositive("length", definition.length);
  const cuttingEdgeHeight = requirePositive("cuttingEdgeHeight", definition.cuttingEdgeHeight);
  const shankDiameter = definition.shankDiameter == null
    ? diameter
    : requirePositive("shankDiameter", definition.shankDiameter);

  const tipRadius = tipDiameter / 2;
  if (cuttingEdgeHeight + EPSILON < tipRadius) {
    throw new Error("cuttingEdgeHeight must be at least half the tipDiameter.");
  }
  if (cuttingEdgeHeight - length > EPSILON) {
    throw new Error("cuttingEdgeHeight cannot exceed length.");
  }

  const outerRadius = diameter / 2;
  const shankRadius = shankDiameter / 2;
  const segments = [];
  let point = [0, 0];

  point = appendArcCenter(segments, point, [0, tipRadius], [tipRadius, tipRadius], "ball-tip", "tip");
  point = appendLine(segments, point, [outerRadius, cuttingEdgeHeight], "taper-flank", "cutting");
  point = appendLine(segments, point, [shankRadius, cuttingEdgeHeight], "shoulder", "shank");
  point = appendLine(segments, point, [shankRadius, length], "shank", "shank");

  return finalizeSpec(units, segments, point, length);
}

function buildBarrelSpec(definition, units) {
  const diameter = requirePositive("diameter", definition.diameter);
  const neckDiameter = requireStrictlySmaller("neckDiameter", definition.neckDiameter, "diameter", diameter);
  const length = requirePositive("length", definition.length);
  const cuttingEdgeHeight = requirePositive("cuttingEdgeHeight", definition.cuttingEdgeHeight);
  const shankDiameter = definition.shankDiameter == null
    ? neckDiameter
    : requirePositive("shankDiameter", definition.shankDiameter);

  const outerRadius = diameter / 2;
  const neckRadius = neckDiameter / 2;
  const barrelBulge = outerRadius - neckRadius;
  if (cuttingEdgeHeight + EPSILON < barrelBulge * 2) {
    throw new Error("cuttingEdgeHeight must be at least twice the barrel bulge.");
  }
  if (cuttingEdgeHeight - length > EPSILON) {
    throw new Error("cuttingEdgeHeight cannot exceed length.");
  }

  const shankRadius = shankDiameter / 2;
  const upperArcStartZ = cuttingEdgeHeight - barrelBulge;
  const segments = [];
  let point = [0, 0];

  point = appendLine(segments, point, [neckRadius, 0], "tip-flat", "tip");
  point = appendArcCenter(segments, point, [neckRadius, barrelBulge], [outerRadius, barrelBulge], "barrel-lower", "cutting");
  point = appendLine(segments, point, [outerRadius, upperArcStartZ], "barrel-mid", "cutting");
  point = appendArcCenter(
    segments,
    point,
    [neckRadius, upperArcStartZ],
    [neckRadius, cuttingEdgeHeight],
    "barrel-upper",
    "cutting",
  );
  point = appendLine(segments, point, [shankRadius, cuttingEdgeHeight], "shoulder", "shank");
  point = appendLine(segments, point, [shankRadius, length], "shank", "shank");

  return finalizeSpec(units, segments, point, length);
}

function buildLollipopSpec(definition, units) {
  const diameter = requirePositive("diameter", definition.diameter);
  const neckDiameter = requireStrictlySmaller("neckDiameter", definition.neckDiameter, "diameter", diameter);
  const length = requirePositive("length", definition.length);

  const headRadius = diameter / 2;
  const transitionHeight = diameter;
  if (transitionHeight - length > EPSILON) {
    throw new Error("length must be at least the head diameter.");
  }

  const neckRadius = neckDiameter / 2;
  const segments = [];
  let point = [0, 0];

  point = appendArcCenter(segments, point, [0, headRadius], [headRadius, headRadius], "head", "tip");
  point = appendLine(segments, point, [neckRadius, transitionHeight], "neck-transition", "neck");
  point = appendLine(segments, point, [neckRadius, length], "neck", "neck");

  return finalizeSpec(units, segments, point, length);
}

export function buildGeneratedToolDemoSpec(definition) {
  assertObject(definition);

  const units = normalizeUnits(definition.units);
  const shape = normalizeShape(definition.shape);

  switch (shape) {
    case "endmill":
      return buildEndmillSpec(definition, units);
    case "ballend":
      return buildBallendSpec(definition, units);
    case "bullnose":
      return buildBullnoseSpec(definition, units);
    case "drill":
      return buildDrillSpec(definition, units);
    case "taper-flat":
      return buildTaperFlatSpec(definition, units);
    case "taper-ball":
      return buildTaperBallSpec(definition, units);
    case "barrel":
      return buildBarrelSpec(definition, units);
    case "lollipop":
      return buildLollipopSpec(definition, units);
    default:
      throw new Error(`Unsupported tool shape: ${shape}.`);
  }
}
