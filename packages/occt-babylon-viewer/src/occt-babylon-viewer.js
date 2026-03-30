function assertScene(scene) {
  if (!scene) {
    throw new TypeError("createOcctBabylonViewer requires a Babylon scene");
  }
}

export function createOcctBabylonViewer(scene) {
  assertScene(scene);

  return {
    getScene() {
      return scene;
    },
    loadOcctModel() {
      throw new Error("Not implemented yet");
    },
    dispose() {},
  };
}
