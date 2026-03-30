import { Color3 } from "@babylonjs/core/Maths/math.color.js";
import { Vector3 } from "@babylonjs/core/Maths/math.vector.js";
import { DirectionalLight } from "@babylonjs/core/Lights/directionalLight.js";
import { HemisphericLight } from "@babylonjs/core/Lights/hemisphericLight.js";

export function ensureDefaultLights(scene) {
  const hemi = new HemisphericLight("occt-viewer-hemi", new Vector3(0, -1, 0), scene);
  hemi.intensity = 0.8;
  hemi.groundColor = new Color3(0.75, 0.75, 0.8);
  hemi.specular = new Color3(0.1, 0.1, 0.1);

  const dir = new DirectionalLight("occt-viewer-dir", new Vector3(-1, -2, 1), scene);
  dir.intensity = 0.3;

  return { hemi, dir };
}
