const DEFAULT_COLOR = [0.13, 0.14, 0.15, 1];

function defaultColorArray(segmentCount) {
  const colors = new Float32Array(segmentCount * 4 * 4);
  for (let i = 0; i < segmentCount * 4; i += 1) {
    const offset = i * 4;
    colors[offset] = DEFAULT_COLOR[0];
    colors[offset + 1] = DEFAULT_COLOR[1];
    colors[offset + 2] = DEFAULT_COLOR[2];
    colors[offset + 3] = DEFAULT_COLOR[3];
  }
  return colors;
}

function toBreakSet(batch) {
  return new Set(batch.breakSegmentIndices ? Array.from(batch.breakSegmentIndices) : []);
}

function resolveSegmentColor(batch, segmentIndex) {
  if (!batch.segmentColors) {
    return DEFAULT_COLOR;
  }

  const offset = segmentIndex * 4;
  return [
    batch.segmentColors[offset],
    batch.segmentColors[offset + 1],
    batch.segmentColors[offset + 2],
    batch.segmentColors[offset + 3],
  ];
}

export function buildLinePassMeshData(batches = []) {
  const visibleSegments = [];

  for (const batch of batches) {
    const breaks = toBreakSet(batch);
    for (let segmentIndex = 0; segmentIndex < batch.segmentCount; segmentIndex += 1) {
      if (breaks.has(segmentIndex)) {
        continue;
      }

      const pointOffset = segmentIndex * 3;
      const nextPointOffset = pointOffset + 3;
      visibleSegments.push({
        start: [
          batch.points[pointOffset],
          batch.points[pointOffset + 1],
          batch.points[pointOffset + 2],
        ],
        end: [
          batch.points[nextPointOffset],
          batch.points[nextPointOffset + 1],
          batch.points[nextPointOffset + 2],
        ],
        color: resolveSegmentColor(batch, segmentIndex),
        dashPeriod: batch.segmentDashPeriods ? batch.segmentDashPeriods[segmentIndex] : 0,
        width: batch.width ?? 1.5,
      });
    }
  }

  const visibleSegmentCount = visibleSegments.length;
  const positions = new Float32Array(visibleSegmentCount * 4 * 3);
  const nextPositions = new Float32Array(visibleSegmentCount * 4 * 3);
  const sideFlags = new Float32Array(visibleSegmentCount * 4);
  const segmentDashPeriods = new Float32Array(visibleSegmentCount * 4);
  const segmentWidths = new Float32Array(visibleSegmentCount * 4);
  const segmentColors = visibleSegmentCount > 0 ? new Float32Array(visibleSegmentCount * 4 * 4) : new Float32Array(0);
  const indices = new Uint32Array(visibleSegmentCount * 6);

  for (let segmentIndex = 0; segmentIndex < visibleSegmentCount; segmentIndex += 1) {
    const segment = visibleSegments[segmentIndex];
    const vertexBase = segmentIndex * 4;
    const positionBase = vertexBase * 3;
    const colorBase = vertexBase * 4;
    const indexBase = segmentIndex * 6;

    for (let vertexOffset = 0; vertexOffset < 4; vertexOffset += 1) {
      positions.set(segment.start, positionBase + vertexOffset * 3);
      nextPositions.set(segment.end, positionBase + vertexOffset * 3);
      sideFlags[vertexBase + vertexOffset] = vertexOffset < 2 ? -1 : 1;
      segmentDashPeriods[vertexBase + vertexOffset] = segment.dashPeriod;
      segmentWidths[vertexBase + vertexOffset] = segment.width;
      segmentColors.set(segment.color, colorBase + vertexOffset * 4);
    }

    indices.set([
      vertexBase,
      vertexBase + 1,
      vertexBase + 2,
      vertexBase + 2,
      vertexBase + 1,
      vertexBase + 3,
    ], indexBase);
  }

  return {
    visibleSegmentCount,
    positions,
    nextPositions,
    sideFlags,
    segmentDashPeriods,
    segmentColors: visibleSegmentCount > 0 ? segmentColors : defaultColorArray(0),
    segmentWidths,
    indices,
  };
}
