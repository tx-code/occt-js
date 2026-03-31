export function createMockToolpathBatches() {
  return [{
    id: "mock-toolpath",
    layer: "toolpath",
    points: [
      -20, 0, 0,
      0, 0, 0,
      20, 0, 0,
      20, 10, 0,
      35, 10, 10,
      50, 10, 10,
    ],
    segmentColors: [
      0.0, 0.62, 1.0, 1.0,
      0.0, 0.62, 1.0, 1.0,
      0.95, 0.74, 0.24, 1.0,
      1.0, 0.42, 0.24, 1.0,
      0.0, 0.92, 0.88, 1.0,
    ],
    segmentDashPeriods: [0, 0, 6, 0, 6],
    breakSegmentIndices: [2],
    width: 2.5,
    depthBiasPerPixel: 1.4,
  }];
}
