import { getReadMethodName, normalizeOcctFormat, listSupportedFormats } from "./formats.js";
import { normalizeOcctResult } from "./model-normalizer.js";

const EXACT_OPEN_METHOD = {
  step: "OpenExactStepModel",
  iges: "OpenExactIgesModel",
  brep: "OpenExactBrepModel",
};
const IDENTITY_MATRIX = [
  1, 0, 0, 0,
  0, 1, 0, 0,
  0, 0, 1, 0,
  0, 0, 0, 1,
];

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

function normalizeTransform(transform) {
  return Array.isArray(transform) && transform.length === 16
    ? transform.slice()
    : IDENTITY_MATRIX.slice();
}

function transformPoint(transform, point) {
  const [x, y, z] = point;
  return [
    transform[0] * x + transform[4] * y + transform[8] * z + transform[12],
    transform[1] * x + transform[5] * y + transform[9] * z + transform[13],
    transform[2] * x + transform[6] * y + transform[10] * z + transform[14],
  ];
}

function transformDirection(transform, direction) {
  const [x, y, z] = direction;
  const output = [
    transform[0] * x + transform[4] * y + transform[8] * z,
    transform[1] * x + transform[5] * y + transform[9] * z,
    transform[2] * x + transform[6] * y + transform[10] * z,
  ];
  const length = Math.hypot(output[0], output[1], output[2]);
  if (length <= 0) {
    return [0, 0, 0];
  }
  return output.map((value) => value / length);
}

function inverseTransformPoint(transform, point) {
  const [x, y, z] = point;
  const translated = [
    x - transform[12],
    y - transform[13],
    z - transform[14],
  ];
  return [
    transform[0] * translated[0] + transform[1] * translated[1] + transform[2] * translated[2],
    transform[4] * translated[0] + transform[5] * translated[1] + transform[6] * translated[2],
    transform[8] * translated[0] + transform[9] * translated[1] + transform[10] * translated[2],
  ];
}

function validatePoint3(point, operationName) {
  const values = Array.isArray(point)
    ? point
    : ArrayBuffer.isView(point)
      ? Array.from(point)
      : null;
  if (!values || values.length < 3) {
    throw new Error(`${operationName} requires a 3D query point.`);
  }
  if (!Number.isFinite(values[0]) || !Number.isFinite(values[1]) || !Number.isFinite(values[2])) {
    throw new Error(`${operationName} requires finite XYZ coordinates.`);
  }
  return [values[0], values[1], values[2]];
}

function validateExactRef(ref, operationName) {
  if (!ref || typeof ref !== "object") {
    throw new Error(`${operationName} requires an occurrence-scoped exact ref object.`);
  }
  if (!Number.isInteger(ref.exactModelId) || ref.exactModelId <= 0) {
    throw new Error(`${operationName} requires ref.exactModelId.`);
  }
  if (!Number.isInteger(ref.exactShapeHandle) || ref.exactShapeHandle <= 0) {
    throw new Error(`${operationName} requires ref.exactShapeHandle.`);
  }
  if (typeof ref.kind !== "string" || ref.kind.length === 0) {
    throw new Error(`${operationName} requires ref.kind.`);
  }
  if (!Number.isInteger(ref.elementId) || ref.elementId <= 0) {
    throw new Error(`${operationName} requires ref.elementId.`);
  }
  return {
    ...ref,
    transform: normalizeTransform(ref.transform),
  };
}

function validatePairwiseExactRefs(refA, refB, operationName) {
  const exactRefA = validateExactRef(refA, operationName);
  const exactRefB = validateExactRef(refB, operationName);
  if (exactRefA.exactModelId !== exactRefB.exactModelId) {
    throw new Error(`${operationName} requires refs from the same exactModelId in v1.1.`);
  }
  return [exactRefA, exactRefB];
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

  async getExactGeometryType(ref) {
    const module = await this._ensureModule();
    const exactRef = validateExactRef(ref, "getExactGeometryType");
    if (typeof module.GetExactGeometryType !== "function") {
      throw new Error("Loaded OCCT module does not expose GetExactGeometryType().");
    }

    const result = module.GetExactGeometryType(
      exactRef.exactModelId,
      exactRef.exactShapeHandle,
      exactRef.kind,
      exactRef.elementId,
    );
    return result?.ok === true
      ? { ...result, ref: exactRef }
      : result;
  }

  async measureExactDistance(refA, refB) {
    const module = await this._ensureModule();
    const [exactRefA, exactRefB] = validatePairwiseExactRefs(refA, refB, "measureExactDistance");
    if (typeof module.MeasureExactDistance !== "function") {
      throw new Error("Loaded OCCT module does not expose MeasureExactDistance().");
    }

    const result = module.MeasureExactDistance(
      exactRefA.exactModelId,
      exactRefA.exactShapeHandle,
      exactRefA.kind,
      exactRefA.elementId,
      exactRefB.exactShapeHandle,
      exactRefB.kind,
      exactRefB.elementId,
      exactRefA.transform,
      exactRefB.transform,
    );
    return result?.ok === true
      ? { ...result, refA: exactRefA, refB: exactRefB }
      : result;
  }

  async measureExactAngle(refA, refB) {
    const module = await this._ensureModule();
    const [exactRefA, exactRefB] = validatePairwiseExactRefs(refA, refB, "measureExactAngle");
    if (typeof module.MeasureExactAngle !== "function") {
      throw new Error("Loaded OCCT module does not expose MeasureExactAngle().");
    }

    const result = module.MeasureExactAngle(
      exactRefA.exactModelId,
      exactRefA.exactShapeHandle,
      exactRefA.kind,
      exactRefA.elementId,
      exactRefB.exactShapeHandle,
      exactRefB.kind,
      exactRefB.elementId,
      exactRefA.transform,
      exactRefB.transform,
    );
    return result?.ok === true
      ? { ...result, refA: exactRefA, refB: exactRefB }
      : result;
  }

  async measureExactThickness(refA, refB) {
    const module = await this._ensureModule();
    const [exactRefA, exactRefB] = validatePairwiseExactRefs(refA, refB, "measureExactThickness");
    if (typeof module.MeasureExactThickness !== "function") {
      throw new Error("Loaded OCCT module does not expose MeasureExactThickness().");
    }

    const result = module.MeasureExactThickness(
      exactRefA.exactModelId,
      exactRefA.exactShapeHandle,
      exactRefA.kind,
      exactRefA.elementId,
      exactRefB.exactShapeHandle,
      exactRefB.kind,
      exactRefB.elementId,
      exactRefA.transform,
      exactRefB.transform,
    );
    return result?.ok === true
      ? { ...result, refA: exactRefA, refB: exactRefB }
      : result;
  }

  async measureExactRadius(ref) {
    const module = await this._ensureModule();
    const exactRef = validateExactRef(ref, "measureExactRadius");
    if (typeof module.MeasureExactRadius !== "function") {
      throw new Error("Loaded OCCT module does not expose MeasureExactRadius().");
    }

    const result = module.MeasureExactRadius(
      exactRef.exactModelId,
      exactRef.exactShapeHandle,
      exactRef.kind,
      exactRef.elementId,
    );
    if (result?.ok !== true) {
      return result;
    }

    return {
      ok: true,
      family: result.family,
      radius: result.radius,
      diameter: result.diameter,
      center: transformPoint(exactRef.transform, result.localCenter),
      anchorPoint: transformPoint(exactRef.transform, result.localAnchorPoint),
      axisDirection: transformDirection(exactRef.transform, result.localAxisDirection),
      ref: exactRef,
    };
  }

  async measureExactCenter(ref) {
    const module = await this._ensureModule();
    const exactRef = validateExactRef(ref, "measureExactCenter");
    if (typeof module.MeasureExactCenter !== "function") {
      throw new Error("Loaded OCCT module does not expose MeasureExactCenter().");
    }

    const result = module.MeasureExactCenter(
      exactRef.exactModelId,
      exactRef.exactShapeHandle,
      exactRef.kind,
      exactRef.elementId,
    );
    if (result?.ok !== true) {
      return result;
    }

    return {
      ok: true,
      family: result.family,
      center: transformPoint(exactRef.transform, result.localCenter),
      axisDirection: transformDirection(exactRef.transform, result.localAxisDirection),
      ref: exactRef,
    };
  }

  async measureExactEdgeLength(ref) {
    const module = await this._ensureModule();
    const exactRef = validateExactRef(ref, "measureExactEdgeLength");
    if (typeof module.MeasureExactEdgeLength !== "function") {
      throw new Error("Loaded OCCT module does not expose MeasureExactEdgeLength().");
    }

    const result = module.MeasureExactEdgeLength(
      exactRef.exactModelId,
      exactRef.exactShapeHandle,
      exactRef.kind,
      exactRef.elementId,
    );
    if (result?.ok !== true) {
      return result;
    }

    return {
      ok: true,
      value: result.value,
      startPoint: transformPoint(exactRef.transform, result.localStartPoint),
      endPoint: transformPoint(exactRef.transform, result.localEndPoint),
      ref: exactRef,
    };
  }

  async measureExactFaceArea(ref) {
    const module = await this._ensureModule();
    const exactRef = validateExactRef(ref, "measureExactFaceArea");
    if (typeof module.MeasureExactFaceArea !== "function") {
      throw new Error("Loaded OCCT module does not expose MeasureExactFaceArea().");
    }

    const result = module.MeasureExactFaceArea(
      exactRef.exactModelId,
      exactRef.exactShapeHandle,
      exactRef.kind,
      exactRef.elementId,
    );
    if (result?.ok !== true) {
      return result;
    }

    return {
      ok: true,
      value: result.value,
      centroid: transformPoint(exactRef.transform, result.localCentroid),
      ref: exactRef,
    };
  }

  async evaluateExactFaceNormal(ref, point) {
    const module = await this._ensureModule();
    const exactRef = validateExactRef(ref, "evaluateExactFaceNormal");
    const queryPoint = validatePoint3(point, "evaluateExactFaceNormal");
    if (typeof module.EvaluateExactFaceNormal !== "function") {
      throw new Error("Loaded OCCT module does not expose EvaluateExactFaceNormal().");
    }

    const result = module.EvaluateExactFaceNormal(
      exactRef.exactModelId,
      exactRef.exactShapeHandle,
      exactRef.kind,
      exactRef.elementId,
      inverseTransformPoint(exactRef.transform, queryPoint),
    );
    if (result?.ok !== true) {
      return result;
    }

    return {
      ok: true,
      point: transformPoint(exactRef.transform, result.localPoint),
      normal: transformDirection(exactRef.transform, result.localNormal),
      ref: exactRef,
    };
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
