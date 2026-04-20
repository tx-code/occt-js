import { Color3 } from "@babylonjs/core/Maths/math.color.js";
import { PBRMaterial } from "@babylonjs/core/Materials/PBR/pbrMaterial.js";
import { StandardMaterial } from "@babylonjs/core/Materials/standardMaterial.js";

export const CAD_DEFAULT_PART_COLOR = Object.freeze({ r: 0.9, g: 0.91, b: 0.93 });

function clamp(value, min = 0, max = 1) {
  return Math.min(max, Math.max(min, value));
}

function resolveColor(colorLike = CAD_DEFAULT_PART_COLOR) {
  return {
    r: clamp(colorLike.r ?? CAD_DEFAULT_PART_COLOR.r),
    g: clamp(colorLike.g ?? CAD_DEFAULT_PART_COLOR.g),
    b: clamp(colorLike.b ?? CAD_DEFAULT_PART_COLOR.b),
  };
}

export function applyCadMaterialPreset(material, colorLike, options = {}) {
  if (!material) {
    return;
  }

  const color = resolveColor(colorLike);
  const usePbr = options.usePbr ?? true;

  material.backFaceCulling = false;
  material.twoSidedLighting = true;
  material.maxSimultaneousLights = 8;

  const isPbrMaterial = usePbr && "albedoColor" in material && "metallic" in material && "roughness" in material;
  if (isPbrMaterial) {
    material.disableLighting = false;
    material.albedoColor = new Color3(color.r, color.g, color.b);
    material.metallic = 0.0;
    material.roughness = 0.38;
    material.directIntensity = 1.2;
    material.environmentIntensity = 0.4;
    material.specularIntensity = 0.55;
    material.forceIrradianceInFragment = true;
    material.emissiveColor = new Color3(
      Math.min(color.r * 0.004, 0.01),
      Math.min(color.g * 0.004, 0.01),
      Math.min(color.b * 0.004, 0.01),
    );
    return;
  }

  material.disableLighting = false;
  material.diffuseColor = new Color3(color.r, color.g, color.b);
  material.ambientColor = new Color3(
    Math.min(color.r * 0.22 + 0.04, 1),
    Math.min(color.g * 0.22 + 0.04, 1),
    Math.min(color.b * 0.22 + 0.04, 1),
  );
  material.specularColor = new Color3(0.12, 0.12, 0.12);
  material.specularPower = 64;
  material.emissiveColor = new Color3(
    Math.min(color.r * 0.008, 0.02),
    Math.min(color.g * 0.008, 0.02),
    Math.min(color.b * 0.008, 0.02),
  );
}

export function createCadPartMaterial(scene, name, colorLike, options = {}) {
  const usePbr = options.usePbr ?? true;
  const material = usePbr
    ? new PBRMaterial(name, scene)
    : new StandardMaterial(name, scene);
  applyCadMaterialPreset(material, colorLike, { usePbr });
  return material;
}

export function createCadVertexColorMaterial(scene, name, options = {}) {
  const fallbackColor = options.fallbackColor ?? { r: 0.8, g: 0.82, b: 0.86 };
  const usePbr = options.usePbr ?? true;
  const material = createCadPartMaterial(scene, name, fallbackColor, { usePbr });
  if ("useVertexColors" in material) {
    material.useVertexColors = true;
  }
  if ("useVertexColor" in material) {
    material.useVertexColor = true;
  }
  if ("useVertexAlpha" in material) {
    material.useVertexAlpha = false;
  }
  return material;
}

export function getCadMaterialKey(colorLike = CAD_DEFAULT_PART_COLOR) {
  const color = resolveColor(colorLike);
  return `${(color.r * 255) | 0},${(color.g * 255) | 0},${(color.b * 255) | 0}`;
}

export function getCadVertexColorDefault() {
  return { ...CAD_DEFAULT_PART_COLOR };
}

