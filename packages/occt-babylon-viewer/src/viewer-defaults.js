export const VIEWER_ROOT_NAME = "__OCCT_VIEWER_ROOT__";

export function withViewerDefaults(options = {}) {
  return {
    background: options.background ?? { clearColor: [0.1, 0.1, 0.12, 1] },
    createDefaultLights: options.createDefaultLights ?? true,
    createDefaultCameraController: options.createDefaultCameraController ?? true,
    grid: options.grid ?? { visible: true },
    axes: options.axes ?? { visible: true },
    camera: options.camera ?? {},
    lights: options.lights ?? {},
    theme: options.theme ?? "dark",
    sceneBuilder: typeof options.sceneBuilder === "function" ? options.sceneBuilder : null,
  };
}
