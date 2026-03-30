import { TransformNode } from "@babylonjs/core/Meshes/transformNode.js";
import { VIEWER_ROOT_NAME, withViewerDefaults } from "./viewer-defaults.js";

function assertScene(scene) {
  if (!scene) {
    throw new TypeError("createOcctBabylonViewer requires a Babylon scene");
  }
}

export function createOcctBabylonViewer(scene, options = {}) {
  assertScene(scene);

  const config = withViewerDefaults(options);
  const rootNode = new TransformNode(VIEWER_ROOT_NAME, scene);

  function clearModel() {
    const children = rootNode.getChildren().slice();
    for (const child of children) {
      child.dispose(false, true);
    }
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
    clearModel,
    loadOcctModel() {
      throw new Error("Not implemented yet");
    },
    dispose() {
      clearModel();
      rootNode.dispose(false, true);
    },
  };
}
