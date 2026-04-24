import { buildGeneratedToolDemoSpec } from "./generated-tool-spec-builder.js";

function formatCatalogNumber(value) {
  return Number.isInteger(value) ? String(value) : value.toFixed(3).replace(/\.?0+$/, "");
}

function formatCatalogDimension(value, units = "mm") {
  return `${formatCatalogNumber(value)} ${units}`;
}

function formatCatalogAngle(value) {
  return `${formatCatalogNumber(value)} deg`;
}

function lengthParameter(label, value, units = "mm") {
  return {
    label,
    value: formatCatalogDimension(value, units),
  };
}

function angleParameter(label, value) {
  return {
    label,
    value: formatCatalogAngle(value),
  };
}

export const GENERATED_TOOL_PRESET_GROUPS = [
  {
    id: "freecad-aligned",
    label: "FreeCAD-aligned",
    description: "Shape families and dimension names intentionally mirror FreeCAD CAM toolbit schemas.",
  },
  {
    id: "common-derived",
    label: "Common / demo-only",
    description: "Common rotary cutter families kept in the demo catalog without implying a FreeCAD-native shape model.",
  },
];

function createGeneratedToolPreset({
  family = "revolved",
  groupId,
  id,
  label,
  description,
  parameters,
  buildOptions,
  definition,
  spec,
}) {
  return {
    family,
    groupId,
    id,
    label,
    description,
    parameters,
    buildOptions,
    spec: spec ?? buildGeneratedToolDemoSpec(definition),
  };
}

export const GENERATED_TOOL_PRESETS = [
  createGeneratedToolPreset({
    family: "revolved",
    groupId: "freecad-aligned",
    id: "endmill",
    label: "Endmill D6",
    description: "FreeCAD-style endmill sample using Diameter, CuttingEdgeHeight, ShankDiameter, and Length.",
    parameters: [
      lengthParameter("Diameter", 6),
      lengthParameter("CuttingEdgeHeight", 18),
      lengthParameter("ShankDiameter", 6),
      lengthParameter("Length", 50),
    ],
    buildOptions: {
      linearDeflectionType: "bounding_box_ratio",
      linearDeflection: 0.001,
      angularDeflection: 0.35,
    },
    definition: {
      shape: "endmill",
      units: "mm",
      diameter: 6,
      cuttingEdgeHeight: 18,
      shankDiameter: 6,
      length: 50,
    },
  }),
  createGeneratedToolPreset({
    family: "revolved",
    groupId: "freecad-aligned",
    id: "bullnose",
    label: "Bullnose D8 R0.8",
    description: "FreeCAD-style bullnose sample with CornerRadius added on top of the standard rotary dimensions.",
    parameters: [
      lengthParameter("Diameter", 8),
      lengthParameter("CornerRadius", 0.8),
      lengthParameter("CuttingEdgeHeight", 16),
      lengthParameter("ShankDiameter", 8),
      lengthParameter("Length", 50),
    ],
    buildOptions: {
      linearDeflectionType: "bounding_box_ratio",
      linearDeflection: 0.001,
      angularDeflection: 0.35,
    },
    definition: {
      shape: "bullnose",
      units: "mm",
      diameter: 8,
      cornerRadius: 0.8,
      cuttingEdgeHeight: 16,
      shankDiameter: 8,
      length: 50,
    },
  }),
  createGeneratedToolPreset({
    family: "revolved",
    groupId: "freecad-aligned",
    id: "ballend",
    label: "Ballend D8",
    description: "FreeCAD-style ballend sample with the same canonical field set as Endmill and Ballend shapes.",
    parameters: [
      lengthParameter("Diameter", 8),
      lengthParameter("CuttingEdgeHeight", 20),
      lengthParameter("ShankDiameter", 8),
      lengthParameter("Length", 50),
    ],
    buildOptions: {
      linearDeflectionType: "bounding_box_ratio",
      linearDeflection: 0.0008,
      angularDeflection: 0.25,
    },
    definition: {
      shape: "ballend",
      units: "mm",
      diameter: 8,
      cuttingEdgeHeight: 20,
      shankDiameter: 8,
      length: 50,
    },
  }),
  createGeneratedToolPreset({
    family: "revolved",
    groupId: "common-derived",
    id: "taper-flat",
    label: "Taper Flat D1-D6",
    description: "Common tapered-flat sample using TipDiameter plus the same core rotary dimensions as FreeCAD-style tools.",
    parameters: [
      lengthParameter("TipDiameter", 1),
      lengthParameter("Diameter", 6),
      lengthParameter("CuttingEdgeHeight", 20),
      lengthParameter("ShankDiameter", 6),
      lengthParameter("Length", 50),
    ],
    buildOptions: {
      linearDeflectionType: "bounding_box_ratio",
      linearDeflection: 0.0009,
      angularDeflection: 0.25,
    },
    definition: {
      shape: "taper-flat",
      units: "mm",
      diameter: 6,
      tipDiameter: 1,
      cuttingEdgeHeight: 20,
      shankDiameter: 6,
      length: 50,
    },
  }),
  createGeneratedToolPreset({
    family: "revolved",
    groupId: "freecad-aligned",
    id: "taper-ball",
    label: "Tapered Ball Nose D2 TD6",
    description: "FreeCAD-tapered-ballnose style sample using Diameter at the tip and TaperDiameter at the top of the taper.",
    parameters: [
      lengthParameter("Diameter", 2),
      lengthParameter("TaperDiameter", 6),
      lengthParameter("CuttingEdgeHeight", 20),
      lengthParameter("ShankDiameter", 6),
      lengthParameter("Length", 50),
    ],
    buildOptions: {
      linearDeflectionType: "bounding_box_ratio",
      linearDeflection: 0.0009,
      angularDeflection: 0.25,
    },
    definition: {
      shape: "taper-ball",
      units: "mm",
      diameter: 6,
      tipDiameter: 2,
      cuttingEdgeHeight: 20,
      shankDiameter: 6,
      length: 50,
    },
  }),
  createGeneratedToolPreset({
    family: "revolved",
    groupId: "common-derived",
    id: "barrel",
    label: "Barrel D8 Neck4",
    description: "Common barrel-cutter sample expressed with Diameter, NeckDiameter, CuttingEdgeHeight, ShankDiameter, and Length.",
    parameters: [
      lengthParameter("Diameter", 8),
      lengthParameter("NeckDiameter", 4),
      lengthParameter("CuttingEdgeHeight", 14),
      lengthParameter("ShankDiameter", 6),
      lengthParameter("Length", 50),
    ],
    buildOptions: {
      linearDeflectionType: "bounding_box_ratio",
      linearDeflection: 0.0008,
      angularDeflection: 0.25,
    },
    definition: {
      shape: "barrel",
      units: "mm",
      diameter: 8,
      neckDiameter: 4,
      cuttingEdgeHeight: 14,
      shankDiameter: 6,
      length: 50,
    },
  }),
  createGeneratedToolPreset({
    family: "revolved",
    groupId: "common-derived",
    id: "lollipop",
    label: "Lollipop D6 Neck4",
    description: "Common lollipop sample using head Diameter, NeckDiameter, and overall Length as the primary fields.",
    parameters: [
      lengthParameter("Diameter", 6),
      lengthParameter("NeckDiameter", 4),
      lengthParameter("Length", 42),
    ],
    buildOptions: {
      linearDeflectionType: "bounding_box_ratio",
      linearDeflection: 0.0008,
      angularDeflection: 0.25,
    },
    definition: {
      shape: "lollipop",
      units: "mm",
      diameter: 6,
      neckDiameter: 4,
      length: 42,
    },
  }),
  createGeneratedToolPreset({
    family: "revolved",
    groupId: "freecad-aligned",
    id: "drill",
    label: "Drill D6 118deg",
    description: "FreeCAD-style drill sample using Diameter, TipAngle, and Length.",
    parameters: [
      lengthParameter("Diameter", 6),
      angleParameter("TipAngle", 118),
      lengthParameter("Length", 38),
    ],
    buildOptions: {
      linearDeflectionType: "bounding_box_ratio",
      linearDeflection: 0.0012,
      angularDeflection: 0.35,
    },
    definition: {
      shape: "drill",
      units: "mm",
      diameter: 6,
      tipAngle: 118,
      length: 38,
    },
  }),
  createGeneratedToolPreset({
    family: "composite",
    groupId: "common-derived",
    id: "thread-mill-m6x1",
    label: "Thread Mill M6\u00d71",
    description: "FreeCAD-aligned thread-mill proxy: composite seed uses a revolved profile body, while downstream CAM thread semantics stay operation-side.",
    parameters: [
      lengthParameter("Diameter", 5),
      lengthParameter("Crest", 0.1),
      lengthParameter("NeckDiameter", 3),
      lengthParameter("NeckLength", 20),
      lengthParameter("ShankDiameter", 5),
      lengthParameter("Length", 50),
      angleParameter("CuttingAngle", 60),
      { label: "Flutes", value: "4 (metadata)" },
    ],
    buildOptions: {
      linearDeflectionType: "bounding_box_ratio",
      linearDeflection: 0.0009,
      angularDeflection: 0.25,
    },
    spec: {
      version: 1,
      units: "mm",
      seed: {
        family: "revolved",
        spec: {
          version: 1,
          units: "mm",
          profile: {
            plane: "XZ",
            start: [0, 0],
            closure: "explicit",
            segments: [
              { kind: "line", id: "tip-core", tag: "tip", end: [1.5, 0] },
              { kind: "line", id: "tooth-flank-lower", tag: "cutting", end: [2.5, 0.5773502692] },
              { kind: "line", id: "tooth-crest", tag: "cutting", end: [2.5, 0.6773502692] },
              { kind: "line", id: "tooth-flank-upper", tag: "cutting", end: [1.5, 1.2547005384] },
              { kind: "line", id: "neck", tag: "neck", end: [1.5, 20] },
              { kind: "line", id: "neck-shoulder", tag: "shank", end: [2.5, 20.01] },
              { kind: "line", id: "shank", tag: "shank", end: [2.5, 50] },
              { kind: "line", id: "axis-top", tag: "closure", end: [0, 50] },
              { kind: "line", id: "axis-bottom", tag: "closure", end: [0, 0] },
            ],
          },
          revolve: {
            angleDeg: 360,
          },
        },
      },
      steps: [],
    },
  }),
];

export function getGeneratedToolPresetGroup(groupId) {
  return GENERATED_TOOL_PRESET_GROUPS.find((group) => group.id === groupId) ?? GENERATED_TOOL_PRESET_GROUPS[0];
}

export function getGeneratedToolPresetCatalog() {
  return GENERATED_TOOL_PRESET_GROUPS.map((group) => ({
    ...group,
    presets: GENERATED_TOOL_PRESETS.filter((preset) => preset.groupId === group.id),
  })).filter((group) => group.presets.length > 0);
}

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
