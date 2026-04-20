export const GENERATED_TOOL_PRESETS = [
  {
    id: "flat-endmill",
    label: "Flat Endmill",
    description: "Full revolve with a flat tip, cylindrical body, and explicit closure.",
    buildOptions: {
      linearDeflectionType: "bounding_box_ratio",
      linearDeflection: 0.001,
      angularDeflection: 0.35,
    },
    spec: {
      version: 1,
      units: "mm",
      profile: {
        plane: "XZ",
        start: [0, 0],
        closure: "explicit",
        segments: [
          { kind: "line", id: "tip", tag: "tip", end: [3, 0] },
          { kind: "line", id: "corner-entry", tag: "cutting", end: [4, 1] },
          { kind: "arc_center", id: "corner", tag: "corner", center: [3, 1], end: [3, 2] },
          { kind: "line", id: "flute", tag: "cutting", end: [3, 14] },
          { kind: "line", id: "axis-top", tag: "closure", end: [0, 14] },
          { kind: "line", id: "axis-bottom", tag: "closure", end: [0, 0] },
        ],
      },
      revolve: {
        angleDeg: 360,
      },
    },
  },
  {
    id: "ball-nose",
    label: "Ball Nose",
    description: "Full revolve with a rounded cutting end and a straight shank transition.",
    buildOptions: {
      linearDeflectionType: "bounding_box_ratio",
      linearDeflection: 0.0008,
      angularDeflection: 0.25,
    },
    spec: {
      version: 1,
      units: "mm",
      profile: {
        plane: "XZ",
        start: [0, 0],
        closure: "explicit",
        segments: [
          { kind: "arc_center", id: "ball", tag: "tip", center: [2.5, 0], end: [5, 0] },
          { kind: "line", id: "body-taper", tag: "cutting", end: [4.5, 2.5] },
          { kind: "line", id: "body", tag: "cutting", end: [4.5, 16] },
          { kind: "line", id: "axis-top", tag: "closure", end: [0, 16] },
          { kind: "line", id: "axis-bottom", tag: "closure", end: [0, 0] },
        ],
      },
      revolve: {
        angleDeg: 360,
      },
    },
  },
  {
    id: "drill-sector",
    label: "Drill Sector",
    description: "Partial revolve demo with auto-axis closure to show open profile handling.",
    buildOptions: {
      linearDeflectionType: "bounding_box_ratio",
      linearDeflection: 0.0012,
      angularDeflection: 0.35,
    },
    spec: {
      version: 1,
      units: "inch",
      profile: {
        plane: "XZ",
        start: [0, 0],
        closure: "auto_axis",
        segments: [
          { kind: "line", id: "tip-land", tag: "tip", end: [1.4, 0] },
          { kind: "arc_3pt", id: "flute", tag: "cutting", through: [4.4, 3.4], end: [1.1, 8] },
          { kind: "line", id: "neck", tag: "neck", end: [1.1, 12] },
        ],
      },
      revolve: {
        angleDeg: 220,
      },
    },
  },
];

export function getGeneratedToolPreset(presetId) {
  return GENERATED_TOOL_PRESETS.find((preset) => preset.id === presetId) ?? GENERATED_TOOL_PRESETS[0];
}

export function cloneGeneratedToolPresetSpec(presetId) {
  const preset = getGeneratedToolPreset(presetId);
  return JSON.parse(JSON.stringify(preset.spec));
}

export function cloneGeneratedToolPresetOptions(presetId) {
  const preset = getGeneratedToolPreset(presetId);
  return JSON.parse(JSON.stringify(preset.buildOptions ?? {}));
}

export function formatGeneratedToolJson(value) {
  return JSON.stringify(value, null, 2);
}
