import { Color3 } from "@babylonjs/core/Maths/math.color.js";
import { Vector3 } from "@babylonjs/core/Maths/math.vector.js";
import { DirectionalLight } from "@babylonjs/core/Lights/directionalLight.js";
import { HemisphericLight } from "@babylonjs/core/Lights/hemisphericLight.js";

const WORKSPACE_UP = new Vector3(0, 0, 1);

function updateHeadLightDirection(camera, light) {
  if (!camera || !light) {
    return;
  }

  const viewDir = camera.target.subtract(camera.position);
  if (viewDir.lengthSquared() < 1e-8) {
    return;
  }

  const view = viewDir.normalize();
  const up = WORKSPACE_UP;
  const right = Vector3.Cross(view, up);
  if (right.lengthSquared() < 1e-8) {
    return;
  }

  right.normalize();
  light.direction = view.scale(0.7).subtract(up.scale(0.35)).add(right.scale(0.28)).normalize();
}

export function ensureDefaultLights(scene, camera = null) {
  const hemi = new HemisphericLight("occt-viewer-hemi", new Vector3(0, 0, 1), scene);
  hemi.intensity = 0.06;
  hemi.groundColor = new Color3(0.18, 0.19, 0.21);
  hemi.specular = new Color3(0.03, 0.03, 0.03);

  const dirHead = new DirectionalLight("occt-viewer-dir-head", new Vector3(0, 0, -1), scene);
  dirHead.intensity = 1.06;
  dirHead.specular = new Color3(0.12, 0.12, 0.12);

  const dirFillA = new DirectionalLight("occt-viewer-dir-fill-a", new Vector3(-0.35, -0.2, -1), scene);
  dirFillA.intensity = 0.12;
  dirFillA.specular = new Color3(0.03, 0.03, 0.03);

  const dirFillB = new DirectionalLight("occt-viewer-dir-fill-b", new Vector3(0.7, 0.25, -0.6), scene);
  dirFillB.intensity = 0.08;
  dirFillB.specular = new Color3(0.02, 0.02, 0.02);

  const dirTop = new DirectionalLight("occt-viewer-dir-top", new Vector3(0, 0, -1), scene);
  dirTop.intensity = 0.24;
  dirTop.specular = new Color3(0.03, 0.03, 0.03);

  updateHeadLightDirection(camera, dirHead);
  const observer = camera
    ? scene.onBeforeRenderObservable.add(() => updateHeadLightDirection(camera, dirHead))
    : null;

  return {
    hemi,
    dirHead,
    dirFillA,
    dirFillB,
    dirTop,
    dispose() {
      if (observer !== null) {
        scene.onBeforeRenderObservable.remove(observer);
      }
      hemi.dispose();
      dirHead.dispose();
      dirFillA.dispose();
      dirFillB.dispose();
      dirTop.dispose();
    },
    sync() {
      updateHeadLightDirection(camera, dirHead);
    },
  };
}
