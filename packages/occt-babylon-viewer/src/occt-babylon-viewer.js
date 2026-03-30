import { Vector3 } from "@babylonjs/core/Maths/math.vector.js";
import { TransformNode } from "@babylonjs/core/Meshes/transformNode.js";
import { VIEWER_ROOT_NAME, withViewerDefaults } from "./viewer-defaults.js";
import {
  applyProjection,
  applyStandardView,
  createDefaultCamera,
} from "./viewer-camera.js";
import { applyGridTheme, createGridHelpers } from "./viewer-grid.js";
import { ensureDefaultLights } from "./viewer-lights.js";
import { applyCadMaterialPreset, CAD_DEFAULT_PART_COLOR } from "./viewer-materials.js";
import { applySceneTheme } from "./viewer-theme.js";

function assertScene(scene) {
  if (!scene) {
    throw new TypeError("createOcctBabylonViewer requires a Babylon scene");
  }
}

function assertSceneBuilder(sceneBuilder) {
  if (typeof sceneBuilder !== "function") {
    throw new TypeError("loadOcctModel requires a sceneBuilder function in viewer options or load options");
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

function resolveMaterialBaseColor(material) {
  if (!material) {
    return CAD_DEFAULT_PART_COLOR;
  }

  if ("albedoColor" in material && material.albedoColor) {
    return {
      r: material.albedoColor.r,
      g: material.albedoColor.g,
      b: material.albedoColor.b,
    };
  }

  if ("diffuseColor" in material && material.diffuseColor) {
    return {
      r: material.diffuseColor.r,
      g: material.diffuseColor.g,
      b: material.diffuseColor.b,
    };
  }

  return CAD_DEFAULT_PART_COLOR;
}

function applyCadShadingToResources(resources) {
  const materials = new Set();
  for (const mesh of resources?.meshes ?? []) {
    if (mesh?.material) {
      materials.add(mesh.material);
    }
  }

  for (const material of materials) {
    applyCadMaterialPreset(material, resolveMaterialBaseColor(material), { usePbr: true });
  }
}

export function createOcctBabylonViewer(scene, options = {}) {
  assertScene(scene);

  if (typeof scene.setRenderingAutoClearDepthStencil === "function") {
    // Keep model depth for edge overlays rendered in group 1.
    scene.setRenderingAutoClearDepthStencil(1, false);
  }

  const config = withViewerDefaults(options);
  const rootNode = new TransformNode(VIEWER_ROOT_NAME, scene);
  const previousActiveCamera = scene.activeCamera ?? null;
  const camera = config.createDefaultCameraController ? createDefaultCamera(scene) : null;
  const sceneState = {
    projectionMode: config.camera?.projection ?? "perspective",
    view: config.camera?.view ?? "iso",
    gridVisible: config.grid?.visible ?? true,
    axesVisible: config.axes?.visible ?? true,
    theme: config.theme ?? "dark",
  };
  applySceneTheme(scene, sceneState.theme);
  const lights = config.createDefaultLights ? ensureDefaultLights(scene, camera) : null;
  let gridHelpers = createGridHelpers(scene, createFallbackBounds(), { theme: sceneState.theme });
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

    gridHelpers = createGridHelpers(scene, bounds, { theme: sceneState.theme });
    applyGridTheme(gridHelpers.ground.material, sceneState.theme);
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

  function refreshHelpers() {
    replaceGridHelpers(getSceneBounds());
    syncProjection();
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

  function setTheme(theme) {
    sceneState.theme = theme === "light" ? "light" : "dark";
    applySceneTheme(scene, sceneState.theme);
    if (gridHelpers?.ground?.material) {
      applyGridTheme(gridHelpers.ground.material, sceneState.theme);
    }
  }

  function getSceneState() {
    return { ...sceneState };
  }

  function loadOcctModel(model, loadOptions = {}) {
    const sceneBuilder = loadOptions.sceneBuilder ?? config.sceneBuilder;
    assertSceneBuilder(sceneBuilder);
    clearModel();

    currentSceneResources = sceneBuilder(model, scene, { createRootNode: false });
    applyCadShadingToResources(currentSceneResources);
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
    refreshHelpers,
    setProjection,
    setView,
    setTheme,
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
        lights.dispose?.();
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
