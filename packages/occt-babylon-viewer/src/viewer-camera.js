import { ArcRotateCamera } from "@babylonjs/core/Cameras/arcRotateCamera.js";
import { Camera } from "@babylonjs/core/Cameras/camera.js";
import { Vector3 } from "@babylonjs/core/Maths/math.vector.js";

const STANDARD_VIEWS = {
  front: { alpha: -Math.PI / 2, beta: Math.PI / 2 },
  back: { alpha: Math.PI / 2, beta: Math.PI / 2 },
  top: { alpha: -Math.PI / 2, beta: 0.01 },
  bottom: { alpha: -Math.PI / 2, beta: Math.PI - 0.01 },
  left: { alpha: Math.PI, beta: Math.PI / 2 },
  right: { alpha: 0, beta: Math.PI / 2 },
  iso: { alpha: Math.PI / 4, beta: Math.PI / 3 },
};

export function createDefaultCamera(scene) {
  const camera = new ArcRotateCamera(
    "occt-viewer-camera",
    Math.PI / 4,
    Math.PI / 3,
    100,
    Vector3.Zero(),
    scene,
  );

  camera.wheelPrecision = 5;
  camera.wheelDeltaPercentage = 0.05;
  camera.minZ = 0.1;
  camera.panningSensibility = 30;

  return camera;
}

export function applyStandardView(camera, direction) {
  const view = STANDARD_VIEWS[direction];

  if (!view) {
    throw new Error(`Unknown view: ${direction}`);
  }

  camera.alpha = view.alpha;
  camera.beta = view.beta;
}

export function applyProjection(camera, mode, size, aspect) {
  if (mode === "orthographic") {
    camera.mode = Camera.ORTHOGRAPHIC_CAMERA;
    camera.orthoLeft = -size * aspect;
    camera.orthoRight = size * aspect;
    camera.orthoTop = size;
    camera.orthoBottom = -size;
    return;
  }

  if (mode !== "perspective") {
    throw new Error(`Unknown projection mode: ${mode}`);
  }

  camera.mode = Camera.PERSPECTIVE_CAMERA;
}
