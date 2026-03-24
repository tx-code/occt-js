import { getReadMethodName, normalizeOcctFormat, listSupportedFormats } from "./formats.js";
import { normalizeOcctResult } from "./model-normalizer.js";

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
        overrides.wasmBinary = this._options.wasmBinary;
      } else if (typeof this._options.wasmBinaryLoader === "function") {
        const wasmBinary = await this._options.wasmBinaryLoader();
        overrides.wasmBinary = wasmBinary instanceof Uint8Array ? wasmBinary : new Uint8Array(wasmBinary);
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

  async importModel(content, options = {}) {
    const module = await this._ensureModule();
    const bytes = toUint8Array(content);

    const guessedFormat = formatFromFileName(options.fileName);
    const normalizedFormat = normalizeOcctFormat(options.format ?? guessedFormat ?? "step");
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
