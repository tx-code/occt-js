import { Vector3 } from "@babylonjs/core/Maths/math.vector.js";
import { TransformNode } from "@babylonjs/core/Meshes/transformNode.js";
import { buildOcctScene } from "../../occt-babylon-loader/src/index.js";
import { VIEWER_ROOT_NAME, withViewerDefaults } from "./viewer-defaults.js";
import {
  applyProjection,
  applyStandardView,
  createDefaultCamera,
} from "./viewer-camera.js";
import { createGridHelpers } from "./viewer-grid.js";
import { ensureDefaultLights } from "./viewer-lights.js";

function assertScene(scene) {
  if (!scene) {
    throw new TypeError("createOcctBabylonViewer requires a Babylon scene");
  }
}

function createFallbackBounds() {
  return {
    min: new Vector3(-1, -1, -1),
    max: new Vector3(1, 1, 1),
  };
}

function isFiniteBounds(bounds) {
  return Number.isFinite(bounds?.min?.x) &&
    Number.isFinite(bounds?.min?.y) &&
    Number.isFinite(bounds?.min?.z) &&
    Number.isFinite(bounds?.max?.x) &&
    Number.isFinite(bounds?.max?.y) &&
    Number.isFinite(bounds?.max?.z);
}

export function createOcctBabylonViewer(scene, options = {}) {
  assertScene(scene);

  const config = withViewerDefaults(options);
  const rootNode = new TransformNode(VIEWER_ROOT_NAME, scene);
  const previousActiveCamera = scene.activeCamera ?? null;
  const camera = config.createDefaultCameraController ? createDefaultCamera(scene) : null;
  const lights = config.createDefaultLights ? ensureDefaultLights(scene) : null;
  const sceneState = {
    projectionMode: config.camera?.projection ?? "perspective",
    view: config.camera?.view ?? "iso",
    gridVisible: config.grid?.visible ?? true,
    axesVisible: config.axes?.visible ?? true,
  };
  let gridHelpers = createGridHelpers(scene, createFallbackBounds());
  let currentSceneResources = null;

  function disposeCurrentSceneResources() {
    if (!currentSceneResources) {
      return;
    }

    const materials = new Set();
    for (const mesh of currentSceneResources.meshes ?? []) {
      if (!mesh || mesh.isDisposed()) {
        continue;
      }
      if (mesh.material) {
        materials.add(mesh.material);
      }
      mesh.dispose(false, true);
    }

    for (const transformNode of currentSceneResources.transformNodes ?? []) {
      if (!transformNode || transformNode === rootNode || transformNode.isDisposed()) {
        continue;
      }
      transformNode.dispose(false, true);
    }

    for (const material of materials) {
      const disposed = typeof material?.isDisposed === "function" ? material.isDisposed() : false;
      if (material && typeof material.dispose === "function" && !disposed) {
        material.dispose();
      }
    }

    currentSceneResources = null;
  }

  function getSceneBounds() {
    if (rootNode.getChildren().length === 0) {
      return createFallbackBounds();
    }

    const bounds = rootNode.getHierarchyBoundingVectors(true);
    return isFiniteBounds(bounds) ? bounds : createFallbackBounds();
  }

  function getProjectionSize(bounds) {
    const extent = bounds.max.subtract(bounds.min);
    return Math.max(extent.length() * 0.5, 1);
  }

  function syncProjection() {
    if (!camera) {
      return;
    }

    const bounds = getSceneBounds();
    const size = getProjectionSize(bounds);
    const aspect = camera.getEngine().getAspectRatio(camera);
    applyProjection(camera, sceneState.projectionMode, size, aspect);
  }

  function syncGridVisibility() {
    if (!gridHelpers) {
      return;
    }

    gridHelpers.ground.isVisible = sceneState.gridVisible;
    gridHelpers.xAxis.isVisible = sceneState.axesVisible;
    gridHelpers.zAxis.isVisible = sceneState.axesVisible;
  }

  function replaceGridHelpers(bounds = getSceneBounds()) {
    if (gridHelpers) {
      gridHelpers.ground.dispose(false, true);
      gridHelpers.xAxis.dispose(false, true);
      gridHelpers.zAxis.dispose(false, true);
    }

    gridHelpers = createGridHelpers(scene, bounds);
    syncGridVisibility();
  }

  function fitAll() {
    if (!camera) {
      return null;
    }

    const bounds = getSceneBounds();
    const center = bounds.min.add(bounds.max).scale(0.5);
    const extent = bounds.max.subtract(bounds.min);
    const modelSize = extent.length();
    const fov = camera.fov || 0.8;
    const radius = (modelSize * 0.5) / Math.tan(fov * 0.5) * 1.2;

    camera.target = center;
    camera.radius = Math.max(radius, 1);
    camera.lowerRadiusLimit = Math.max(modelSize * 0.01, 0.1);
    camera.upperRadiusLimit = Math.max(modelSize * 10, 10);
    camera.minZ = Math.max(modelSize * 0.001, 0.1);
    camera.maxZ = Math.max(modelSize * 100, 100);

    applyStandardView(camera, sceneState.view);
    syncProjection();

    return bounds;
  }

  if (camera) {
    scene.activeCamera = camera;
    applyStandardView(camera, sceneState.view);
    fitAll();
  }

  syncGridVisibility();

  function clearModel() {
    disposeCurrentSceneResources();

    const children = rootNode.getChildren().slice();
    for (const child of children) {
      child.dispose(false, true);
    }

    replaceGridHelpers(createFallbackBounds());
    if (camera) {
      fitAll();
    }
  }

  function getCamera() {
    return camera;
  }

  function setProjection(mode) {
    if (!camera) {
      return;
    }

    const bounds = getSceneBounds();
    const size = getProjectionSize(bounds);
    const aspect = camera.getEngine().getAspectRatio(camera);
    applyProjection(camera, mode, size, aspect);
    sceneState.projectionMode = mode;
  }

  function setView(direction) {
    if (!camera) {
      return;
    }

    applyStandardView(camera, direction);
    sceneState.view = direction;
    fitAll();
  }

  function setGridVisible(visible) {
    sceneState.gridVisible = visible;
    syncGridVisibility();
  }

  function setAxesVisible(visible) {
    sceneState.axesVisible = visible;
    syncGridVisibility();
  }

  function getSceneState() {
    return { ...sceneState };
  }

  function loadOcctModel(model) {
    clearModel();

    currentSceneResources = buildOcctScene(model, scene, { createRootNode: false });
    const topLevelNodes = [
      ...(currentSceneResources.transformNodes ?? []),
      ...(currentSceneResources.meshes ?? []),
    ];
    for (const node of topLevelNodes) {
      if (node === rootNode) {
        continue;
      }
      if (!node.parent) {
        node.parent = rootNode;
      }
    }

    replaceGridHelpers(getSceneBounds());
    if (camera) {
      fitAll();
    }
    return currentSceneResources;
  }

  return {
    getScene() {
      return scene;
    },
    getConfig() {
      return config;
    },
    getRootNode() {
      return rootNode;
    },
    getCamera,
    getSceneState,
    clearModel,
    fitAll,
    setProjection,
    setView,
    setGridVisible,
    setAxesVisible,
    loadOcctModel,
    dispose() {
      clearModel();
      if (gridHelpers) {
        gridHelpers.ground.dispose(false, true);
        gridHelpers.xAxis.dispose(false, true);
        gridHelpers.zAxis.dispose(false, true);
        gridHelpers = null;
      }
      if (lights) {
        lights.hemi.dispose();
        lights.dir.dispose();
      }
      if (camera) {
        if (scene.activeCamera === camera) {
          scene.activeCamera = previousActiveCamera && !previousActiveCamera.isDisposed()
            ? previousActiveCamera
            : null;
        }
        camera.dispose();
      }
      rootNode.dispose(false, true);
    },
  };
}
