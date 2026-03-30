import { Color3, Color4 } from "@babylonjs/core/Maths/math.color.js";

export const DARK_CLEAR_COLOR = Object.freeze([0.1, 0.11, 0.13, 1]);
export const LIGHT_CLEAR_COLOR = Object.freeze([0.95, 0.96, 0.98, 1]);

export function resolveThemeClearColor(theme = "dark") {
  const color = theme === "light" ? LIGHT_CLEAR_COLOR : DARK_CLEAR_COLOR;
  return new Color4(color[0], color[1], color[2], color[3]);
}

export function applySceneTheme(scene, theme = "dark") {
  if (!scene) {
    return;
  }

  scene.clearColor = resolveThemeClearColor(theme);
  scene.ambientColor = new Color3(0.012, 0.012, 0.014);

  const imageProcessing = scene.imageProcessingConfiguration;
  if (!imageProcessing) {
    return;
  }

  imageProcessing.toneMappingEnabled = false;
  imageProcessing.exposure = 1.03;
  imageProcessing.contrast = 1.26;
  imageProcessing.vignetteEnabled = false;
  imageProcessing.colorCurvesEnabled = false;
  imageProcessing.colorGradingEnabled = false;
}

