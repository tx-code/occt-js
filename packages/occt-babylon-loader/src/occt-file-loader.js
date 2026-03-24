import { loadWithOcctCore } from "./occt-model-loader.js";
import { getOcctSupportedExtensions } from "./format-routing.js";
import { buildOcctScene } from "./occt-scene-builder.js";

function toBabylonExtensionsMap() {
  const map = {};
  for (const extension of getOcctSupportedExtensions()) {
    map[extension] = { isBinary: true };
  }
  return map;
}

/**
 * Babylon SceneLoader plugin backed by @tx-code/occt-core.
 * The plugin delegates CAD parsing to the core package and only builds Babylon nodes here.
 */
export class OcctFileLoader {
  constructor(options = {}) {
    this.name = "occt";
    this.extensions = toBabylonExtensionsMap();
    this._core = options.core;
    this._sceneBuilder = options.sceneBuilder ?? buildOcctScene;
    this._importParams = options.importParams;
    this._buildOptions = options.buildOptions;
  }

  createPlugin(options) {
    const merged = {
      core: options?.occt?.core ?? this._core,
      sceneBuilder: options?.occt?.sceneBuilder ?? this._sceneBuilder,
      importParams: options?.occt?.importParams ?? this._importParams,
      buildOptions: options?.occt?.buildOptions ?? this._buildOptions,
    };
    return new OcctFileLoader(merged);
  }

  async importMeshAsync(_meshesNames, scene, data, _rootUrl, _onProgress, fileName) {
    if (!this._core) {
      throw new Error("OcctFileLoader requires a core instance in options.core.");
    }

    const model = await loadWithOcctCore(this._core, data, {
      fileName,
      importParams: this._importParams,
    });
    return this._sceneBuilder(model, scene, this._buildOptions);
  }

  async loadAsync(scene, data, rootUrl, onProgress, fileName) {
    await this.importMeshAsync(null, scene, data, rootUrl, onProgress, fileName);
  }
}
