import { getReadMethodName, normalizeOcctFormat, listSupportedFormats } from "./formats.js";
import { normalizeOcctResult } from "./model-normalizer.js";

const EXACT_OPEN_METHOD = {
  step: "OpenExactStepModel",
  iges: "OpenExactIgesModel",
  brep: "OpenExactBrepModel",
};
const APPEARANCE_PRESETS = new Set(["cad-solid", "cad-ghosted"]);
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

function normalizeDefaultColor(defaultColor) {
  if (!defaultColor) {
    return null;
  }

  let r;
  let g;
  let b;
  let opacity;
  let opacityProvided = false;

  if (Array.isArray(defaultColor) || ArrayBuffer.isView(defaultColor)) {
    const values = Array.from(defaultColor);
    if (values.length < 3) {
      return null;
    }
    [r, g, b] = values;
    if (values.length > 3) {
      opacity = values[3];
      opacityProvided = Number.isFinite(Number(opacity));
    }
  } else if (typeof defaultColor === "object") {
    if (!Number.isFinite(Number(defaultColor.r)) || !Number.isFinite(Number(defaultColor.g)) || !Number.isFinite(Number(defaultColor.b))) {
      return null;
    }
    r = Number(defaultColor.r);
    g = Number(defaultColor.g);
    b = Number(defaultColor.b);
    if (Number.isFinite(Number(defaultColor.opacity))) {
      opacity = Number(defaultColor.opacity);
      opacityProvided = true;
    } else if (Number.isFinite(Number(defaultColor.a))) {
      opacity = Number(defaultColor.a);
      opacityProvided = true;
    }
  } else {
    return null;
  }

  const scale = Math.max(Math.abs(r), Math.abs(g), Math.abs(b)) > 1 ? 255 : 1;
  const normalize = (value) => Math.min(1, Math.max(0, value / scale));
  const normalizeOpacity = (value) => {
    const opacityScale = Math.abs(value) > 1 ? 255 : 1;
    return Math.min(1, Math.max(0, value / opacityScale));
  };

  const color = {
    r: normalize(r),
    g: normalize(g),
    b: normalize(b),
  };

  return {
    color,
    opacity: opacityProvided ? normalizeOpacity(opacity) : undefined,
  };
}

function normalizeAppearancePreset(appearancePreset) {
  if (typeof appearancePreset !== "string") {
    return undefined;
  }
  const normalized = appearancePreset.trim().toLowerCase();
  return APPEARANCE_PRESETS.has(normalized) ? normalized : undefined;
}

function normalizeDefaultOpacity(defaultOpacity) {
  const value = Number(defaultOpacity);
  if (!Number.isFinite(value)) {
    return undefined;
  }
  const scale = Math.abs(value) > 1 ? 255 : 1;
  return Math.min(1, Math.max(0, value / scale));
}

function normalizeImportParams(importParams) {
  if (!importParams || typeof importParams !== "object") {
    return {};
  }

  const normalized = { ...importParams };
  const appearancePreset = normalizeAppearancePreset(importParams.appearancePreset);
  if (appearancePreset) {
    normalized.appearancePreset = appearancePreset;
  } else {
    delete normalized.appearancePreset;
  }

  const normalizedDefaultOpacity = normalizeDefaultOpacity(importParams.defaultOpacity);
  if (normalizedDefaultOpacity !== undefined) {
    normalized.defaultOpacity = normalizedDefaultOpacity;
  } else {
    delete normalized.defaultOpacity;
  }

  if (Object.prototype.hasOwnProperty.call(importParams, "defaultColor")) {
    const normalizedDefaultColor = normalizeDefaultColor(importParams.defaultColor);
    if (normalizedDefaultColor) {
      normalized.defaultColor = normalizedDefaultColor.color;
      if (normalized.defaultOpacity === undefined && normalizedDefaultColor.opacity !== undefined) {
        normalized.defaultOpacity = normalizedDefaultColor.opacity;
      }
    } else {
      delete normalized.defaultColor;
    }
  }

  return normalized;
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

function transformPlacementFrame(transform, frame) {
  if (!frame || typeof frame !== "object") {
    return frame;
  }
  return {
    origin: transformPoint(transform, frame.origin),
    normal: transformDirection(transform, frame.normal),
    xDir: transformDirection(transform, frame.xDir),
    yDir: transformDirection(transform, frame.yDir),
  };
}

function transformPlacementAnchors(transform, anchors) {
  if (!Array.isArray(anchors)) {
    return [];
  }
  return anchors.map((anchor) => ({
    ...anchor,
    point: transformPoint(transform, anchor.point),
  }));
}

function transformOptionalPoint(transform, point) {
  return Array.isArray(point) && point.length >= 3
    ? transformPoint(transform, point)
    : point;
}

function transformExactHoleResult(transform, result) {
  const transformed = {
    ...result,
    frame: transformPlacementFrame(transform, result.frame),
    anchors: transformPlacementAnchors(transform, result.anchors),
    axisDirection: result.axisDirection ? transformDirection(transform, result.axisDirection) : result.axisDirection,
  };

  for (const key of ["centerPoint", "entryPoint", "exitPoint", "bottomPoint"]) {
    if (Array.isArray(result[key]) && result[key].length >= 3) {
      transformed[key] = transformPoint(transform, result[key]);
    }
  }

  return transformed;
}

function transformExactChamferResult(transform, result) {
  return {
    ...result,
    frame: transformPlacementFrame(transform, result.frame),
    anchors: transformPlacementAnchors(transform, result.anchors),
    edgeDirection: result.edgeDirection ? transformDirection(transform, result.edgeDirection) : result.edgeDirection,
    supportNormalA: result.supportNormalA ? transformDirection(transform, result.supportNormalA) : result.supportNormalA,
    supportNormalB: result.supportNormalB ? transformDirection(transform, result.supportNormalB) : result.supportNormalB,
  };
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

function subtractPoints(left, right) {
  return [
    left[0] - right[0],
    left[1] - right[1],
    left[2] - right[2],
  ];
}

function dotVectors(left, right) {
  return left[0] * right[0] + left[1] * right[1] + left[2] * right[2];
}

function crossVectors(left, right) {
  return [
    left[1] * right[2] - left[2] * right[1],
    left[2] * right[0] - left[0] * right[2],
    left[0] * right[1] - left[1] * right[0],
  ];
}

function normalizeVector(vector) {
  const length = Math.hypot(vector[0], vector[1], vector[2]);
  return length > 0
    ? vector.map((value) => value / length)
    : [0, 0, 0];
}

function midpoint(left, right) {
  return [
    0.5 * (left[0] + right[0]),
    0.5 * (left[1] + right[1]),
    0.5 * (left[2] + right[2]),
  ];
}

function chooseStableReferenceDirection(axis) {
  const absolute = axis.map((value) => Math.abs(value));
  if (absolute[0] <= absolute[1] && absolute[0] <= absolute[2]) {
    return [1, 0, 0];
  }
  if (absolute[1] <= absolute[2]) {
    return [0, 1, 0];
  }
  return [0, 0, 1];
}

function projectDirectionOntoPlane(candidate, planeNormal) {
  const scale = dotVectors(candidate, planeNormal);
  const projected = [
    candidate[0] - planeNormal[0] * scale,
    candidate[1] - planeNormal[1] * scale,
    candidate[2] - planeNormal[2] * scale,
  ];
  return normalizeVector(projected);
}

function buildFrameFromNormalAndX(origin, normal, preferredX) {
  const normalizedNormal = normalizeVector(normal);
  let xDir = projectDirectionOntoPlane(preferredX, normalizedNormal);
  if (Math.hypot(xDir[0], xDir[1], xDir[2]) <= 0) {
    xDir = projectDirectionOntoPlane(chooseStableReferenceDirection(normalizedNormal), normalizedNormal);
  }
  const yDir = normalizeVector(crossVectors(normalizedNormal, xDir));
  if (Math.hypot(xDir[0], xDir[1], xDir[2]) <= 0 || Math.hypot(yDir[0], yDir[1], yDir[2]) <= 0) {
    return null;
  }
  return {
    origin,
    normal: normalizedNormal,
    xDir,
    yDir,
  };
}

function getAttachAnchors(anchors) {
  return Array.isArray(anchors)
    ? anchors.filter((anchor) => anchor?.role === "attach" && Array.isArray(anchor.point) && anchor.point.length >= 3)
    : [];
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

function normalizeManagedReleaseResult(result) {
  if (result?.ok === true || result?.code === "released-handle") {
    return { ok: true };
  }
  return result;
}

function createManagedExactModel(client, exactModel) {
  const exactModelId = Number(exactModel?.exactModelId);
  if (!Number.isInteger(exactModelId) || exactModelId <= 0) {
    throw new Error("openManagedExactModel() requires an exact result with exactModelId.");
  }

  const unregisterToken = {};
  let disposed = false;
  let disposePromise = null;

  const unregisterFinalizer = () => {
    if (client._managedExactFinalizer) {
      client._managedExactFinalizer.unregister(unregisterToken);
    }
  };

  const managedExactModel = {
    exactModelId,
    exactModel,
    async dispose() {
      if (disposePromise) {
        return disposePromise;
      }
      if (disposed) {
        return { ok: true };
      }

      disposePromise = (async () => {
        const releaseResult = await client.releaseExactModel(exactModelId);
        const normalized = normalizeManagedReleaseResult(releaseResult);
        if (normalized?.ok === true) {
          disposed = true;
          unregisterFinalizer();
        }
        return normalized;
      })();
      return disposePromise;
    },
  };

  if (client._managedExactFinalizer) {
    client._managedExactFinalizer.register(
      managedExactModel,
      () => {
        void Promise.resolve(client.releaseExactModel(exactModelId)).catch(() => {});
      },
      unregisterToken,
    );
  }

  return managedExactModel;
}

export class OcctCoreClient {
  constructor(options = {}) {
    this._options = options;
    this._module = null;
    this._loadPromise = null;
    this._managedExactFinalizer = typeof FinalizationRegistry === "function"
      ? new FinalizationRegistry((cleanup) => {
        if (typeof cleanup === "function") {
          cleanup();
        }
      })
      : null;
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
    const importParams = normalizeImportParams(options.importParams);

    let rawResult;
    if (typeof module[methodName] === "function") {
      rawResult = module[methodName](bytes, importParams);
    } else if (typeof module.ReadFile === "function") {
      rawResult = module.ReadFile(normalizedFormat, bytes, importParams);
    } else {
      throw new Error(`Loaded OCCT module does not expose ${methodName}() or ReadFile().`);
    }

    if (!rawResult?.success) {
      throw new Error(rawResult?.error ?? `${methodName}()/ReadFile() failed.`);
    }

    return normalizeOcctResult(rawResult, {
      sourceFormat: normalizedFormat,
      sourceFileName: options.fileName,
      importParams,
    });
  }

  async openExactModel(content, options = {}) {
    const module = await this._ensureModule();
    const bytes = toUint8Array(content);
    const normalizedFormat = this._resolveRequestedFormat(options, "openExactModel");
    const methodName = EXACT_OPEN_METHOD[normalizedFormat];
    const importParams = normalizeImportParams(options.importParams);

    let rawResult;
    if (typeof module[methodName] === "function") {
      rawResult = module[methodName](bytes, importParams);
    } else if (typeof module.OpenExactModel === "function") {
      rawResult = module.OpenExactModel(normalizedFormat, bytes, importParams);
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

  async openManagedExactModel(content, options = {}) {
    const exactModel = await this.openExactModel(content, options);
    return createManagedExactModel(this, exactModel);
  }

  async openManagedExactStep(content, options = {}) {
    return this.openManagedExactModel(content, { ...options, format: "step" });
  }

  async openManagedExactIges(content, options = {}) {
    return this.openManagedExactModel(content, { ...options, format: "iges" });
  }

  async openManagedExactBrep(content, options = {}) {
    return this.openManagedExactModel(content, { ...options, format: "brep" });
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

  async getExactModelDiagnostics() {
    const module = await this._ensureModule();
    if (typeof module.GetExactModelDiagnostics !== "function") {
      throw new Error("Loaded OCCT module does not expose GetExactModelDiagnostics().");
    }
    return module.GetExactModelDiagnostics();
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

  async classifyExactRelation(refA, refB) {
    const module = await this._ensureModule();
    const [exactRefA, exactRefB] = validatePairwiseExactRefs(refA, refB, "classifyExactRelation");
    if (typeof module.ClassifyExactRelation !== "function") {
      throw new Error("Loaded OCCT module does not expose ClassifyExactRelation().");
    }

    const result = module.ClassifyExactRelation(
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

  async suggestExactDistancePlacement(refA, refB) {
    const module = await this._ensureModule();
    const [exactRefA, exactRefB] = validatePairwiseExactRefs(refA, refB, "suggestExactDistancePlacement");
    if (typeof module.SuggestExactDistancePlacement !== "function") {
      throw new Error("Loaded OCCT module does not expose SuggestExactDistancePlacement().");
    }

    const result = module.SuggestExactDistancePlacement(
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

  async suggestExactAnglePlacement(refA, refB) {
    const module = await this._ensureModule();
    const [exactRefA, exactRefB] = validatePairwiseExactRefs(refA, refB, "suggestExactAnglePlacement");
    if (typeof module.SuggestExactAnglePlacement !== "function") {
      throw new Error("Loaded OCCT module does not expose SuggestExactAnglePlacement().");
    }

    const result = module.SuggestExactAnglePlacement(
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

  async suggestExactThicknessPlacement(refA, refB) {
    const module = await this._ensureModule();
    const [exactRefA, exactRefB] = validatePairwiseExactRefs(refA, refB, "suggestExactThicknessPlacement");
    if (typeof module.SuggestExactThicknessPlacement !== "function") {
      throw new Error("Loaded OCCT module does not expose SuggestExactThicknessPlacement().");
    }

    const result = module.SuggestExactThicknessPlacement(
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

  async suggestExactRadiusPlacement(ref) {
    const module = await this._ensureModule();
    const exactRef = validateExactRef(ref, "suggestExactRadiusPlacement");
    if (typeof module.SuggestExactRadiusPlacement !== "function") {
      throw new Error("Loaded OCCT module does not expose SuggestExactRadiusPlacement().");
    }

    const result = module.SuggestExactRadiusPlacement(
      exactRef.exactModelId,
      exactRef.exactShapeHandle,
      exactRef.kind,
      exactRef.elementId,
    );
    if (result?.ok !== true) {
      return result;
    }

    return {
      ...result,
      frame: transformPlacementFrame(exactRef.transform, result.frame),
      anchors: transformPlacementAnchors(exactRef.transform, result.anchors),
      axisDirection: result.axisDirection ? transformDirection(exactRef.transform, result.axisDirection) : result.axisDirection,
      ref: exactRef,
    };
  }

  async suggestExactDiameterPlacement(ref) {
    const module = await this._ensureModule();
    const exactRef = validateExactRef(ref, "suggestExactDiameterPlacement");
    if (typeof module.SuggestExactDiameterPlacement !== "function") {
      throw new Error("Loaded OCCT module does not expose SuggestExactDiameterPlacement().");
    }

    const result = module.SuggestExactDiameterPlacement(
      exactRef.exactModelId,
      exactRef.exactShapeHandle,
      exactRef.kind,
      exactRef.elementId,
    );
    if (result?.ok !== true) {
      return result;
    }

    return {
      ...result,
      frame: transformPlacementFrame(exactRef.transform, result.frame),
      anchors: transformPlacementAnchors(exactRef.transform, result.anchors),
      axisDirection: result.axisDirection ? transformDirection(exactRef.transform, result.axisDirection) : result.axisDirection,
      ref: exactRef,
    };
  }

  async describeExactHole(ref) {
    const module = await this._ensureModule();
    const exactRef = validateExactRef(ref, "describeExactHole");
    if (typeof module.DescribeExactHole !== "function") {
      throw new Error("Loaded OCCT module does not expose DescribeExactHole().");
    }

    const result = module.DescribeExactHole(
      exactRef.exactModelId,
      exactRef.exactShapeHandle,
      exactRef.kind,
      exactRef.elementId,
    );
    if (result?.ok !== true) {
      return result;
    }

    return {
      ...transformExactHoleResult(exactRef.transform, result),
      ref: exactRef,
    };
  }

  async describeExactChamfer(ref) {
    const module = await this._ensureModule();
    const exactRef = validateExactRef(ref, "describeExactChamfer");
    if (typeof module.DescribeExactChamfer !== "function") {
      throw new Error("Loaded OCCT module does not expose DescribeExactChamfer().");
    }

    const result = module.DescribeExactChamfer(
      exactRef.exactModelId,
      exactRef.exactShapeHandle,
      exactRef.kind,
      exactRef.elementId,
    );
    if (result?.ok !== true) {
      return result;
    }

    return {
      ...transformExactChamferResult(exactRef.transform, result),
      ref: exactRef,
    };
  }

  async suggestExactMidpointPlacement(refA, refB) {
    const [exactRefA, exactRefB] = validatePairwiseExactRefs(refA, refB, "suggestExactMidpointPlacement");
    const placement = await this.suggestExactDistancePlacement(exactRefA, exactRefB);
    if (placement?.ok !== true) {
      return placement;
    }

    const attachAnchors = getAttachAnchors(placement.anchors);
    if (attachAnchors.length < 2) {
      return {
        ok: false,
        code: "unsupported-geometry",
        message: "Exact midpoint placement requires distance placement anchors.",
      };
    }

    const point = midpoint(attachAnchors[0].point, attachAnchors[1].point);
    return {
      ok: true,
      kind: "midpoint",
      value: placement.value,
      point,
      frame: {
        ...placement.frame,
        origin: point,
      },
      anchors: [
        ...placement.anchors,
        { role: "center", point },
      ],
      refA: exactRefA,
      refB: exactRefB,
    };
  }

  async describeExactEqualDistance(refA, refB, refC, refD, options = {}) {
    const [exactRefA, exactRefB] = validatePairwiseExactRefs(refA, refB, "describeExactEqualDistance");
    const [exactRefC, exactRefD] = validatePairwiseExactRefs(refC, refD, "describeExactEqualDistance");
    const distanceA = await this.measureExactDistance(exactRefA, exactRefB);
    if (distanceA?.ok !== true) {
      return distanceA;
    }

    const distanceB = await this.measureExactDistance(exactRefC, exactRefD);
    if (distanceB?.ok !== true) {
      return distanceB;
    }

    const requestedTolerance = Number(options?.tolerance);
    const tolerance = Number.isFinite(requestedTolerance) && requestedTolerance >= 0
      ? requestedTolerance
      : Math.max(1e-6, Math.max(distanceA.value, distanceB.value) * 1e-6);
    const delta = Math.abs(distanceA.value - distanceB.value);

    return {
      ok: true,
      kind: "equal-distance",
      equal: delta <= tolerance,
      distanceA: distanceA.value,
      distanceB: distanceB.value,
      delta,
      tolerance,
      refA: exactRefA,
      refB: exactRefB,
      refC: exactRefC,
      refD: exactRefD,
    };
  }

  async suggestExactSymmetryPlacement(refA, refB) {
    const [exactRefA, exactRefB] = validatePairwiseExactRefs(refA, refB, "suggestExactSymmetryPlacement");
    const relation = await this.classifyExactRelation(exactRefA, exactRefB);
    if (relation?.ok !== true) {
      return relation;
    }
    if (relation.kind !== "parallel") {
      return {
        ok: false,
        code: "unsupported-geometry",
        message: "Exact symmetry placement requires supported parallel pairs.",
      };
    }

    const placement = await this.suggestExactDistancePlacement(exactRefA, exactRefB);
    if (placement?.ok !== true) {
      return placement;
    }

    const attachAnchors = getAttachAnchors(placement.anchors);
    if (attachAnchors.length < 2) {
      return {
        ok: false,
        code: "unsupported-geometry",
        message: "Exact symmetry placement requires distance placement anchors.",
      };
    }

    const origin = midpoint(attachAnchors[0].point, attachAnchors[1].point);
    const symmetryNormal = normalizeVector(subtractPoints(attachAnchors[1].point, attachAnchors[0].point));
    if (Math.hypot(symmetryNormal[0], symmetryNormal[1], symmetryNormal[2]) <= 0) {
      return {
        ok: false,
        code: "coincident-geometry",
        message: "Exact symmetry placement requires separated parallel geometry.",
      };
    }

    const frame = buildFrameFromNormalAndX(origin, symmetryNormal, placement.frame?.normal ?? placement.frame?.yDir ?? [1, 0, 0]);
    if (!frame) {
      return {
        ok: false,
        code: "unsupported-geometry",
        message: "Exact symmetry placement requires a stable working frame.",
      };
    }

    return {
      ok: true,
      kind: "symmetry",
      variant: "midplane",
      value: placement.value,
      frame,
      anchors: [
        ...placement.anchors,
        { role: "center", point: origin },
      ],
      planeNormal: symmetryNormal,
      refA: exactRefA,
      refB: exactRefB,
    };
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
