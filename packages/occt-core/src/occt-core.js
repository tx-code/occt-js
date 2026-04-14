import { getReadMethodName, normalizeOcctFormat, listSupportedFormats } from "./formats.js";
import { normalizeOcctResult } from "./model-normalizer.js";

const EXACT_OPEN_METHOD = {
  step: "OpenExactStepModel",
  iges: "OpenExactIgesModel",
  brep: "OpenExactBrepModel",
};

function toUint8Array(content) {
  if (content instanceof Uint8Array) {
    return content;
  }
  if (content instanceof ArrayBuffer) {
    return new Uint8Array(content);
  }
  if (ArrayBuffer.isView(content)) {
    return new Uint8Array(content.buffer, content.byteOffset, content.byteLength);
  }
  if (typeof content === "string") {
    return new TextEncoder().encode(content);
  }
  throw new Error("Unsupported input type. Expected Uint8Array, ArrayBuffer, ArrayBufferView or string.");
}

function formatFromFileName(fileName) {
  if (typeof fileName !== "string" || fileName.trim() === "") {
    return null;
  }
  const match = /\.([^.]+)$/.exec(fileName);
  return match ? match[1] : null;
}

function normalizeWasmBinary(binary) {
  if (binary instanceof Uint8Array) {
    return binary;
  }
  if (binary instanceof ArrayBuffer) {
    return new Uint8Array(binary);
  }
  if (ArrayBuffer.isView(binary)) {
    return new Uint8Array(binary.buffer, binary.byteOffset, binary.byteLength);
  }
  throw new Error("Unsupported wasmBinary value. Expected ArrayBuffer or ArrayBufferView.");
}

async function resolveFactory(options) {
  if (typeof options.factory === "function") {
    return options.factory;
  }

  const globalName = options.factoryGlobalName ?? "OcctJS";
  const globalFactory = globalThis?.[globalName];
  if (typeof globalFactory === "function") {
    return globalFactory;
  }

  throw new Error(
    `Cannot resolve OCCT factory. Provide options.factory or make globalThis.${globalName} available.`
  );
}

export class OcctCoreClient {
  constructor(options = {}) {
    this._options = options;
    this._module = null;
    this._loadPromise = null;
  }

  async _ensureModule() {
    if (this._module) {
      return this._module;
    }
    if (this._loadPromise) {
      return this._loadPromise;
    }

    this._loadPromise = (async () => {
      const factory = await resolveFactory(this._options);
      const overrides = {};

      if (this._options.wasmBinary) {
        overrides.wasmBinary = normalizeWasmBinary(this._options.wasmBinary);
      } else if (typeof this._options.wasmBinaryLoader === "function") {
        const wasmBinary = await this._options.wasmBinaryLoader();
        overrides.wasmBinary = normalizeWasmBinary(wasmBinary);
      }

      const module = await factory(Object.keys(overrides).length ? overrides : undefined);
      if (!module || typeof module !== "object") {
        throw new Error("OCCT factory returned an invalid module instance.");
      }
      this._module = module;
      return module;
    })();

    try {
      return await this._loadPromise;
    } catch (error) {
      this._loadPromise = null;
      throw error;
    }
  }

  async getSupportedFormats() {
    const module = await this._ensureModule();
    if (typeof module.ReadFile === "function") {
      return listSupportedFormats();
    }
    return listSupportedFormats().filter((format) => typeof module[getReadMethodName(format)] === "function");
  }

  _resolveRequestedFormat(options, operationName) {
    const guessedFormat = formatFromFileName(options.fileName);
    const requestedFormat = options.format ?? guessedFormat;
    if (requestedFormat == null) {
      throw new Error(`${operationName} requires an explicit format or a fileName with a supported extension.`);
    }
    return normalizeOcctFormat(requestedFormat);
  }

  async importModel(content, options = {}) {
    const module = await this._ensureModule();
    const bytes = toUint8Array(content);
    const normalizedFormat = this._resolveRequestedFormat(options, "importModel");
    const methodName = getReadMethodName(normalizedFormat);

    let rawResult;
    if (typeof module[methodName] === "function") {
      rawResult = module[methodName](bytes, options.importParams ?? {});
    } else if (typeof module.ReadFile === "function") {
      rawResult = module.ReadFile(normalizedFormat, bytes, options.importParams ?? {});
    } else {
      throw new Error(`Loaded OCCT module does not expose ${methodName}() or ReadFile().`);
    }

    if (!rawResult?.success) {
      throw new Error(rawResult?.error ?? `${methodName}()/ReadFile() failed.`);
    }

    return normalizeOcctResult(rawResult, {
      sourceFormat: normalizedFormat,
      sourceFileName: options.fileName,
    });
  }

  async openExactModel(content, options = {}) {
    const module = await this._ensureModule();
    const bytes = toUint8Array(content);
    const normalizedFormat = this._resolveRequestedFormat(options, "openExactModel");
    const methodName = EXACT_OPEN_METHOD[normalizedFormat];

    let rawResult;
    if (typeof module[methodName] === "function") {
      rawResult = module[methodName](bytes, options.importParams ?? {});
    } else if (typeof module.OpenExactModel === "function") {
      rawResult = module.OpenExactModel(normalizedFormat, bytes, options.importParams ?? {});
    } else {
      throw new Error(`Loaded OCCT module does not expose ${methodName}() or OpenExactModel().`);
    }

    if (!rawResult?.success) {
      throw new Error(rawResult?.error ?? `${methodName}()/OpenExactModel() failed.`);
    }

    return rawResult;
  }

  async openExactStep(content, options = {}) {
    return this.openExactModel(content, { ...options, format: "step" });
  }

  async openExactIges(content, options = {}) {
    return this.openExactModel(content, { ...options, format: "iges" });
  }

  async openExactBrep(content, options = {}) {
    return this.openExactModel(content, { ...options, format: "brep" });
  }

  async retainExactModel(exactModelId) {
    const module = await this._ensureModule();
    if (typeof module.RetainExactModel !== "function") {
      throw new Error("Loaded OCCT module does not expose RetainExactModel().");
    }
    return module.RetainExactModel(exactModelId);
  }

  async releaseExactModel(exactModelId) {
    const module = await this._ensureModule();
    if (typeof module.ReleaseExactModel !== "function") {
      throw new Error("Loaded OCCT module does not expose ReleaseExactModel().");
    }
    return module.ReleaseExactModel(exactModelId);
  }

  async readStep(content, options = {}) {
    return this.importModel(content, { ...options, format: "step" });
  }

  async readIges(content, options = {}) {
    return this.importModel(content, { ...options, format: "iges" });
  }

  async readBrep(content, options = {}) {
    return this.importModel(content, { ...options, format: "brep" });
  }
}

export function createOcctCore(options = {}) {
  return new OcctCoreClient(options);
}
