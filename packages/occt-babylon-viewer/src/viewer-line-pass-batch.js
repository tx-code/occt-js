function toArrayLike(values, label) {
  if (values == null) {
    return null;
  }
  if (Array.isArray(values) || ArrayBuffer.isView(values)) {
    return Array.from(values);
  }
  throw new TypeError(`${label} must be an array or typed array`);
}

function toFloat32Triples(points) {
  const raw = toArrayLike(points, "points");
  if (raw == null) {
    throw new TypeError("points is required");
  }
  if (raw.length < 6 || raw.length % 3 !== 0) {
    throw new RangeError("points must contain at least two xyz points");
  }
  return new Float32Array(raw);
}

function toFloat32(values, expectedLength, label) {
  if (values == null) {
    return null;
  }
  const raw = toArrayLike(values, label);
  if (raw.length !== expectedLength) {
    throw new RangeError(`${label} length must equal segment count (${expectedLength})`);
  }
  return new Float32Array(raw);
}

function toUint32(values, maxSegmentIndex) {
  if (values == null) {
    return new Uint32Array(0);
  }
  const raw = toArrayLike(values, "breakSegmentIndices");
  for (const value of raw) {
    if (!Number.isInteger(value) || value < 0 || value >= maxSegmentIndex) {
      throw new RangeError(`breakSegmentIndices must be integers in [0, ${Math.max(0, maxSegmentIndex - 1)}]`);
    }
  }
  return Uint32Array.from(raw);
}

export function normalizeLinePassBatch(input, fallbackIndex = 0) {
  if (!input) {
    throw new TypeError("normalizeLinePassBatch requires an input batch");
  }

  const points = toFloat32Triples(input.points);
  const pointCount = points.length / 3;
  const segmentCount = pointCount - 1;

  return {
    id: input.id ?? `line-pass-batch-${fallbackIndex}`,
    layer: input.layer ?? "cad-edges",
    points,
    pointCount,
    segmentCount,
    segmentColors: toFloat32(input.segmentColors, segmentCount * 4, "segmentColors"),
    segmentDashPeriods: toFloat32(input.segmentDashPeriods, segmentCount, "segmentDashPeriods"),
    breakSegmentIndices: toUint32(input.breakSegmentIndices, segmentCount),
    width: typeof input.width === "number" ? input.width : 1.5,
    depthBiasPerPixel: typeof input.depthBiasPerPixel === "number" ? input.depthBiasPerPixel : 1,
    pickable: input.pickable === true,
  };
}

export function normalizeLinePassBatches(inputs = []) {
  const normalized = [];
  let fallbackIndex = 0;

  for (const input of inputs) {
    if (!input) {
      continue;
    }
    normalized.push(normalizeLinePassBatch(input, fallbackIndex));
    fallbackIndex += 1;
  }

  return normalized;
}
