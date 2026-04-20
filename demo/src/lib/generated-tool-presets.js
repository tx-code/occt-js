import { buildGeneratedToolDemoSpec } from "./generated-tool-spec-builder";

export const GENERATED_TOOL_PRESETS = [
  {
    id: "flat-endmill",
    label: "Corner Radius Endmill",
    description: "FreeCAD-aligned bullnose endmill profile with an explicit full revolve and solid closure.",
    buildOptions: {
      linearDeflectionType: "bounding_box_ratio",
      linearDeflection: 0.001,
      angularDeflection: 0.35,
    },
    spec: buildGeneratedToolDemoSpec({
      shape: "bullnose",
      units: "mm",
      diameter: 6,
      cornerRadius: 0.75,
      cuttingEdgeHeight: 14,
      shankDiameter: 6,
      length: 18,
    }),
  },
  {
    id: "ball-nose",
    label: "Ball Nose",
    description: "FreeCAD-aligned ballend profile with a spherical tip and a cylindrical shank.",
    buildOptions: {
      linearDeflectionType: "bounding_box_ratio",
      linearDeflection: 0.0008,
      angularDeflection: 0.25,
    },
    spec: buildGeneratedToolDemoSpec({
      shape: "ballend",
      units: "mm",
      diameter: 10,
      cuttingEdgeHeight: 16,
      shankDiameter: 10,
      length: 22,
    }),
  },
  {
    id: "drill",
    label: "Drill",
    description: "FreeCAD-aligned drill profile with a conical tip and a fully closed 360-degree solid.",
    buildOptions: {
      linearDeflectionType: "bounding_box_ratio",
      linearDeflection: 0.0012,
      angularDeflection: 0.35,
    },
    spec: buildGeneratedToolDemoSpec({
      shape: "drill",
      units: "inch",
      diameter: 0.25,
      tipAngle: 118,
      length: 1.5,
    }),
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
