import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  createOcctCore,
  normalizeOcctFormat,
  normalizeOcctResult,
  resolveAutoOrientedModel,
} from "../src/index.js";

const EMPTY_STATS = {
  rootCount: 0,
  nodeCount: 0,
  partCount: 0,
  geometryCount: 0,
  materialCount: 0,
  triangleCount: 0,
  reusedInstanceCount: 0,
};
const CUSTOM_DEFAULT_COLOR = { r: 0.2, g: 0.4, b: 0.6 };
const CUSTOM_DEFAULT_OPACITY = 0.35;
const GHOSTED_PRESET_OPACITY = 0.35;

function hasOwn(object, key) {
  return Object.prototype.hasOwnProperty.call(object, key);
}

function createColorlessRawResult() {
  return {
    success: true,
    sourceFormat: "step",
    rootNodes: [{
      id: "node-0",
      name: "part",
      isAssembly: false,
      transform: [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1],
      meshes: [0],
      children: [],
    }],
    geometries: [{
      name: "mesh-0",
      color: null,
      positions: new Float32Array([0, 0, 0, 1, 0, 0, 0, 1, 0]),
      normals: new Float32Array([0, 0, 1, 0, 0, 1, 0, 0, 1]),
      indices: new Uint32Array([0, 1, 2]),
      faces: [{
        id: 1,
        name: "",
        firstIndex: 0,
        indexCount: 3,
        edgeIndices: [],
        color: null,
      }],
      edges: [],
      vertices: [],
      triangleToFaceMap: new Int32Array([1]),
    }],
    materials: [],
    warnings: [],
    stats: { ...EMPTY_STATS, rootCount: 1, nodeCount: 1, partCount: 1, geometryCount: 1 },
  };
}

describe("normalizeOcctFormat", () => {
  it("maps known extensions to canonical formats", () => {
    assert.equal(normalizeOcctFormat("step"), "step");
    assert.equal(normalizeOcctFormat(".stp"), "step");
    assert.equal(normalizeOcctFormat("IGS"), "iges");
    assert.equal(normalizeOcctFormat("brep"), "brep");
  });

  it("throws on unknown format", () => {
    assert.throws(() => normalizeOcctFormat("obj"), /Unsupported CAD format/);
  });
});

describe("normalizeOcctResult", () => {
  it("normalizes STEP-like occt-js output", () => {
    const result = normalizeOcctResult({
      success: true,
      sourceFormat: "step",
      sourceUnit: "MM",
      unitScaleToMeters: 0.001,
      rootNodes: [
        {
          id: "n1",
          name: "partA",
          isAssembly: false,
          transform: [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1],
          meshes: [0],
          children: [],
        },
      ],
      geometries: [
        {
          name: "meshA",
          color: { r: 1, g: 0, b: 0 },
          positions: new Float32Array([0, 0, 0, 1, 0, 0, 0, 1, 0]),
          normals: new Float32Array([0, 0, 1, 0, 0, 1, 0, 0, 1]),
          indices: new Uint32Array([0, 1, 2]),
          faces: [{
            id: 1,
            name: "",
            firstIndex: 0,
            indexCount: 3,
            edgeIndices: [0],
            color: { r: 0, g: 1, b: 0 },
          }],
          edges: [{
            id: 1,
            name: "",
            points: new Float32Array([0, 0, 0, 1, 0, 0]),
            ownerFaceIds: [1],
            isFreeEdge: false,
            color: null,
          }],
          vertices: [{ id: 1, position: [0, 0, 0] }],
          triangleToFaceMap: new Int32Array([1]),
        },
      ],
      materials: [{ r: 1, g: 0, b: 0 }],
      warnings: [],
      stats: { ...EMPTY_STATS, rootCount: 1, nodeCount: 1, partCount: 1, geometryCount: 1, materialCount: 1, triangleCount: 1 },
    });

    assert.equal(result.sourceFormat, "step");
    assert.equal(result.sourceUnit, "MM");
    assert.equal(result.unitScaleToMeters, 0.001);
    assert.equal(result.rootNodes[0].kind, "part");
    assert.deepEqual(result.rootNodes[0].geometryIds, ["geo_0"]);
    assert.equal(result.geometries[0].id, "geo_0");
    assert.equal(result.materials[0].id, "mat_0");
    assert.deepEqual(result.materials[0].baseColor, [1, 0, 0, 1]);
    assert.equal(result.geometries[0].faces[0].id, 1);
    assert.deepEqual(result.geometries[0].faces[0].color, [0, 1, 0, 1]);
    assert.equal(result.geometries[0].edges[0].id, 1);
    assert.deepEqual(result.geometries[0].edges[0].points, [0, 0, 0, 1, 0, 0]);
    assert.deepEqual(result.geometries[0].edges[0].ownerFaceIds, [1]);
    assert.equal(result.geometries[0].vertices[0].id, 1);
    assert.deepEqual(result.geometries[0].triangleToFaceMap, [1]);
    assert.deepEqual(result.warnings, []);
    assert.equal(result.stats.rootCount, 1);
    assert.equal(result.stats.materialCount, 1);
  });

  it("normalizes occt-import-js style output", () => {
    const result = normalizeOcctResult({
      success: true,
      root: {
        name: "root",
        meshes: [0],
        children: [{ name: "child", meshes: [1], children: [] }],
      },
      meshes: [
        {
          name: "m0",
          color: [255, 0, 0],
          attributes: {
            position: { array: [0, 0, 0, 1, 0, 0, 0, 1, 0] },
            normal: { array: [0, 0, 1, 0, 0, 1, 0, 0, 1] },
          },
          index: { array: [0, 1, 2] },
          brep_faces: [{ first: 0, last: 0, color: [255, 0, 0] }],
        },
        {
          name: "m1",
          color: [0, 255, 0],
          attributes: {
            position: { array: [0, 0, 0, 0, 1, 0, 0, 0, 1] },
          },
          index: { array: [0, 1, 2] },
        },
      ],
    }, { sourceFormat: "step" });

    assert.equal(result.rootNodes.length, 1);
    assert.equal(result.rootNodes[0].kind, "assembly");
    assert.equal(result.rootNodes[0].children.length, 1);
    assert.equal(result.geometries.length, 2);
    assert.equal(result.stats.geometryCount, 2);
    assert.equal(result.stats.rootCount, 1);
    assert.equal(result.stats.nodeCount, 2);
  });

  it("keeps unit metadata absent when the raw payload omits it", () => {
    const result = normalizeOcctResult({
      success: true,
      rootNodes: [],
      geometries: [],
      materials: [],
      warnings: ["note"],
      stats: {},
    }, { sourceFormat: "brep" });

    assert.equal(hasOwn(result, "sourceUnit"), false);
    assert.equal(hasOwn(result, "unitScaleToMeters"), false);
    assert.deepEqual(result.warnings, [{ code: "WARNING", message: "note" }]);
  });

  it("normalizes legacy face payloads into the canonical face DTO shape", () => {
    const result = normalizeOcctResult({
      success: true,
      root: {
        meshes: [0],
        children: [],
      },
      meshes: [{
        name: "legacy",
        color: [255, 128, 0],
        faceRanges: [{
          first: 3,
          last: 8,
          color: [0, 255, 0],
        }],
        edges: [{
          positionIndices: new Uint32Array([0, 1, 2]),
        }],
        attributes: {
          position: { array: [0, 0, 0, 1, 0, 0, 0, 1, 0] },
        },
        index: { array: [0, 1, 2] },
      }],
    }, { sourceFormat: "step" });

    const face = result.geometries[0].faces[0];
    assert.deepEqual(Object.keys(face).sort(), ["color", "edgeIndices", "firstIndex", "id", "indexCount", "name"]);
    assert.equal(hasOwn(face, "first"), false);
    assert.equal(hasOwn(face, "last"), false);
    assert.deepEqual(face.color, [0, 1, 0, 1]);
    assert.deepEqual(result.geometries[0].color, [1, 128 / 255, 0, 1]);
    assert.equal(Array.isArray(result.geometries[0].edges[0]), false);
  });

  it("preserves object-form opacity fields when normalizing raw appearance payloads", () => {
    const result = normalizeOcctResult({
      success: true,
      sourceFormat: "step",
      rootNodes: [{
        id: "n1",
        name: "partA",
        isAssembly: false,
        transform: [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1],
        meshes: [0],
        children: [],
      }],
      geometries: [{
        name: "meshA",
        color: { r: 0.1, g: 0.2, b: 0.3, opacity: 0.4 },
        positions: new Float32Array([0, 0, 0, 1, 0, 0, 0, 1, 0]),
        normals: new Float32Array([0, 0, 1, 0, 0, 1, 0, 0, 1]),
        indices: new Uint32Array([0, 1, 2]),
        faces: [{
          id: 1,
          name: "",
          firstIndex: 0,
          indexCount: 3,
          edgeIndices: [],
          color: { r: 0.6, g: 0.7, b: 0.8, opacity: 0.9 },
        }],
        edges: [{
          id: 1,
          name: "",
          points: new Float32Array([0, 0, 0, 1, 0, 0]),
          ownerFaceIds: [1],
          isFreeEdge: false,
          color: { r: 0.2, g: 0.3, b: 0.4, opacity: 0.5 },
        }],
        vertices: [],
        triangleToFaceMap: new Int32Array([1]),
      }],
      materials: [{ r: 0.9, g: 0.8, b: 0.7, opacity: 0.6 }],
      warnings: [],
      stats: { ...EMPTY_STATS, rootCount: 1, nodeCount: 1, partCount: 1, geometryCount: 1, materialCount: 1, triangleCount: 1 },
    });

    assert.deepEqual(result.materials[0].baseColor, [0.9, 0.8, 0.7, 0.6]);
    assert.deepEqual(result.geometries[0].color, [0.1, 0.2, 0.3, 0.4]);
    assert.deepEqual(result.geometries[0].faces[0].color, [0.6, 0.7, 0.8, 0.9]);
    assert.deepEqual(result.geometries[0].edges[0].color, [0.2, 0.3, 0.4, 0.5]);
  });
});

describe("createOcctCore", () => {
  it("prefers an explicit factory over factoryGlobalName and forwards wasmBinary", async () => {
    const calls = [];
    const wasmBinary = new Uint8Array([9, 8, 7]);
    globalThis.OcctJS = async () => {
      calls.push("global");
      return {};
    };

    try {
      const core = createOcctCore({
        factory: async (overrides) => {
          calls.push(["factory", overrides]);
          return {
            ReadStepFile: () => ({ success: true, rootNodes: [], geometries: [], materials: [], warnings: [], stats: EMPTY_STATS }),
          };
        },
        factoryGlobalName: "OcctJS",
        wasmBinary,
      });

      await core.getSupportedFormats();
      assert.deepEqual(calls, [["factory", { wasmBinary }]]);
    } finally {
      delete globalThis.OcctJS;
    }
  });

  it("resolves a named global factory when no explicit factory is provided", async () => {
    const calls = [];
    globalThis.CustomOcctFactory = async (overrides) => {
      calls.push(overrides);
      return {
        ReadStepFile: () => ({ success: true, rootNodes: [], geometries: [], materials: [], warnings: [], stats: EMPTY_STATS }),
      };
    };

    try {
      const core = createOcctCore({
        factoryGlobalName: "CustomOcctFactory",
      });

      await core.getSupportedFormats();
      assert.deepEqual(calls, [undefined]);
    } finally {
      delete globalThis.CustomOcctFactory;
    }
  });

  it("uses wasmBinaryLoader when wasmBinary is not provided", async () => {
    let loaderCalls = 0;
    let capturedOverrides = null;
    const core = createOcctCore({
      factory: async (overrides) => {
        capturedOverrides = overrides;
        return {
          ReadStepFile: () => ({ success: true, rootNodes: [], geometries: [], materials: [], warnings: [], stats: EMPTY_STATS }),
        };
      },
      wasmBinaryLoader: async () => {
        loaderCalls += 1;
        return new Uint8Array([1, 2, 3]).buffer;
      },
    });

    await core.getSupportedFormats();
    assert.equal(loaderCalls, 1);
    assert.deepEqual(Array.from(capturedOverrides.wasmBinary), [1, 2, 3]);
  });

  it("routes to format-specific wasm methods", async () => {
    const core = createOcctCore({
      factory: async () => ({
        ReadStepFile: () => ({ success: true, rootNodes: [], geometries: [], materials: [], warnings: [], stats: EMPTY_STATS }),
      }),
    });

    const model = await core.importModel(new Uint8Array([1, 2, 3]), { format: "stp" });
    assert.equal(model.sourceFormat, "step");
  });

  it("throws if requested format is not exposed by wasm module", async () => {
    const core = createOcctCore({
      factory: async () => ({
        ReadStepFile: () => ({ success: true, rootNodes: [], geometries: [], materials: [], warnings: [], stats: EMPTY_STATS }),
      }),
    });

    await assert.rejects(
      core.importModel(new Uint8Array([1, 2, 3]), { format: "iges" }),
      /ReadIgesFile/
    );
  });

  it("throws when wasm import result reports failure", async () => {
    const core = createOcctCore({
      factory: async () => ({
        ReadStepFile: () => ({ success: false, error: "boom" }),
      }),
    });

    await assert.rejects(
      core.importModel(new Uint8Array([1, 2, 3]), { format: "step" }),
      /boom/
    );
  });

  it("infers the format from fileName when format is omitted", async () => {
    let called = null;
    const core = createOcctCore({
      factory: async () => ({
        ReadIgesFile: (bytes) => {
          called = Array.from(bytes);
          return { success: true, rootNodes: [], geometries: [], materials: [], warnings: [], stats: EMPTY_STATS };
        },
      }),
    });

    const model = await core.importModel(new Uint8Array([4, 5, 6]), { fileName: "part.igs" });
    assert.deepEqual(called, [4, 5, 6]);
    assert.equal(model.sourceFormat, "iges");
  });

  it("rejects when neither format nor fileName is provided", async () => {
    const core = createOcctCore({
      factory: async () => ({
        ReadStepFile: () => ({ success: true, rootNodes: [], geometries: [], materials: [], warnings: [], stats: EMPTY_STATS }),
      }),
    });

    await assert.rejects(
      core.importModel(new Uint8Array([1, 2, 3]), {}),
      /format|file name/i
    );
  });

  it("falls back to ReadFile(format, ...) when format-specific method is missing", async () => {
    const captured = { format: null, bytes: null, params: null };
    const core = createOcctCore({
      factory: async () => ({
        ReadFile: (format, bytes, params) => {
          captured.format = format;
          captured.bytes = Array.from(bytes);
          captured.params = params;
          return {
            success: true,
            root: {
              name: "root",
              meshes: [],
              children: [],
            },
            meshes: [],
          };
        },
      }),
    });

    const model = await core.importModel(new Uint8Array([1, 2, 3]), {
      format: "iges",
      importParams: { linearDeflection: 0.2 },
    });

    assert.equal(captured.format, "iges");
    assert.deepEqual(captured.bytes, [1, 2, 3]);
    assert.deepEqual(captured.params, { linearDeflection: 0.2 });
    assert.equal(model.sourceFormat, "iges");
  });

  it("normalizes and forwards defaultColor appearance params before calling the root carrier", async () => {
    const calls = [];
    const exactResult = {
      success: true,
      sourceFormat: "step",
      exactModelId: 17,
      exactGeometryBindings: [],
      rootNodes: [],
      geometries: [],
      materials: [],
      warnings: [],
      stats: EMPTY_STATS,
    };
    const core = createOcctCore({
      factory: async () => ({
        ReadStepFile: (_bytes, params) => {
          calls.push(["read", params]);
          return {
            success: true,
            sourceFormat: "step",
            rootNodes: [],
            geometries: [],
            materials: [],
            warnings: [],
            stats: EMPTY_STATS,
          };
        },
        OpenExactStepModel: (_bytes, params) => {
          calls.push(["exact", params]);
          return exactResult;
        },
      }),
    });

    await core.importModel(new Uint8Array([1, 2, 3]), {
      format: "step",
      importParams: {
        colorMode: "default",
        defaultColor: [51, 102, 153, 255],
        linearDeflection: 0.2,
      },
    });
    await core.openExactModel(new Uint8Array([4, 5, 6]), {
      format: "step",
      importParams: {
        colorMode: "default",
        defaultColor: { r: 0.2, g: 0.4, b: 0.6, a: 0.8 },
      },
    });

    assert.deepEqual(calls, [
      ["read", {
        colorMode: "default",
        defaultColor: { r: 0.2, g: 0.4, b: 0.6 },
        defaultOpacity: 1,
        linearDeflection: 0.2,
      }],
      ["exact", {
        colorMode: "default",
        defaultColor: { r: 0.2, g: 0.4, b: 0.6 },
        defaultOpacity: 0.8,
      }],
    ]);
  });

  it("forwards appearancePreset/defaultOpacity and promotes defaultColor.opacity when explicit defaultOpacity is absent", async () => {
    const calls = [];
    const core = createOcctCore({
      factory: async () => ({
        ReadStepFile: (_bytes, params) => {
          calls.push(["read", params]);
          return {
            success: true,
            sourceFormat: "step",
            rootNodes: [],
            geometries: [],
            materials: [],
            warnings: [],
            stats: EMPTY_STATS,
          };
        },
      }),
    });

    await core.importModel(new Uint8Array([1, 2, 3]), {
      format: "step",
      importParams: {
        appearancePreset: "cad-ghosted",
        defaultColor: { r: 0.2, g: 0.4, b: 0.6, opacity: 0.8 },
      },
    });
    await core.importModel(new Uint8Array([4, 5, 6]), {
      format: "step",
      importParams: {
        appearancePreset: "cad-ghosted",
        defaultColor: { r: 0.2, g: 0.4, b: 0.6, opacity: 0.8 },
        defaultOpacity: CUSTOM_DEFAULT_OPACITY,
      },
    });

    assert.deepEqual(calls, [
      ["read", {
        appearancePreset: "cad-ghosted",
        defaultColor: { r: 0.2, g: 0.4, b: 0.6 },
        defaultOpacity: 0.8,
      }],
      ["read", {
        appearancePreset: "cad-ghosted",
        defaultColor: { r: 0.2, g: 0.4, b: 0.6 },
        defaultOpacity: CUSTOM_DEFAULT_OPACITY,
      }],
    ]);
  });

  it("does not synthesize fallback default materials when explicit default appearance is not requested", () => {
    const result = normalizeOcctResult(createColorlessRawResult(), {
      sourceFormat: "step",
      importParams: { readColors: false },
    });

    assert.deepEqual(result.materials, []);
    assert.equal(result.geometries[0].materialId, undefined);
    assert.equal(result.stats.materialCount, 0);
  });

  it("synthesizes the caller requested default color only for explicit default appearance", () => {
    const result = normalizeOcctResult(createColorlessRawResult(), {
      sourceFormat: "step",
      importParams: {
        colorMode: "default",
        defaultColor: CUSTOM_DEFAULT_COLOR,
      },
    });

    assert.deepEqual(result.materials, [{
      id: "mat_0",
      baseColor: [0.2, 0.4, 0.6, 1],
    }]);
    assert.equal(result.geometries[0].materialId, "mat_0");
    assert.equal(result.stats.materialCount, 1);
  });

  it("synthesizes preset-derived default appearance when the raw payload is colorless", () => {
    const result = normalizeOcctResult(createColorlessRawResult(), {
      sourceFormat: "step",
      importParams: {
        appearancePreset: "cad-ghosted",
      },
    });

    assert.deepEqual(result.materials, [{
      id: "mat_0",
      baseColor: [0.9, 0.91, 0.93, GHOSTED_PRESET_OPACITY],
    }]);
    assert.equal(result.geometries[0].materialId, "mat_0");
    assert.equal(result.stats.materialCount, 1);
  });

  it("reports all formats when wasm module exposes ReadFile", async () => {
    const core = createOcctCore({
      factory: async () => ({
        ReadFile: () => ({ success: false }),
      }),
    });

    const supported = await core.getSupportedFormats();
    assert.deepEqual(supported, ["step", "iges", "brep"]);
  });

  it("opens exact models through the exact lifecycle wrapper methods", async () => {
    const calls = [];
    const exactResult = {
      success: true,
      sourceFormat: "step",
      exactModelId: 17,
      rootNodes: [],
      geometries: [],
      materials: [],
      warnings: [],
      stats: EMPTY_STATS,
    };
    const core = createOcctCore({
      factory: async () => ({
        OpenExactStepModel: (bytes, params) => {
          calls.push(["OpenExactStepModel", Array.from(bytes), params]);
          return exactResult;
        },
      }),
    });

    const result = await core.openExactModel(new Uint8Array([7, 8, 9]), {
      format: "stp",
      importParams: { readColors: false },
    });

    assert.equal(result, exactResult);
    assert.deepEqual(calls, [["OpenExactStepModel", [7, 8, 9], { readColors: false }]]);
  });

  it("falls back to generic OpenExactModel(format, ...) when a format-specific method is missing", async () => {
    const calls = [];
    const exactResult = {
      success: true,
      sourceFormat: "iges",
      exactModelId: 42,
      rootNodes: [],
      geometries: [],
      materials: [],
      warnings: [],
      stats: EMPTY_STATS,
    };
    const core = createOcctCore({
      factory: async () => ({
        OpenExactModel: (format, bytes, params) => {
          calls.push([format, Array.from(bytes), params]);
          return exactResult;
        },
      }),
    });

    const result = await core.openExactModel(new Uint8Array([1, 3, 5]), {
      format: "iges",
      importParams: { rootMode: "multiple-shapes" },
    });

    assert.equal(result, exactResult);
    assert.deepEqual(calls, [["iges", [1, 3, 5], { rootMode: "multiple-shapes" }]]);
  });

  it("passes through lifecycle DTOs from retainExactModel and releaseExactModel", async () => {
    const core = createOcctCore({
      factory: async () => ({
        RetainExactModel: (exactModelId) => ({ ok: false, code: "released-handle", message: `retain ${exactModelId}` }),
        ReleaseExactModel: (exactModelId) => ({ ok: false, code: "invalid-handle", message: `release ${exactModelId}` }),
      }),
    });

    assert.deepEqual(await core.retainExactModel(12), {
      ok: false,
      code: "released-handle",
      message: "retain 12",
    });
    assert.deepEqual(await core.releaseExactModel(21), {
      ok: false,
      code: "invalid-handle",
      message: "release 21",
    });
  });

  it("wraps exact geometry classification through occurrence-scoped refs", async () => {
    const calls = [];
    const ref = {
      exactModelId: 17,
      exactShapeHandle: 33,
      nodeId: "node-a",
      geometryId: "geo_0",
      kind: "face",
      elementId: 7,
      transform: [
        1, 0, 0, 0,
        0, 1, 0, 0,
        0, 0, 1, 0,
        10, 20, 30, 1,
      ],
    };
    const core = createOcctCore({
      factory: async () => ({
        GetExactGeometryType: (...args) => {
          calls.push(args);
          return { ok: true, family: "plane" };
        },
      }),
    });

    const result = await core.getExactGeometryType(ref);

    assert.deepEqual(calls, [[17, 33, "face", 7]]);
    assert.deepEqual(result, {
      ok: true,
      family: "plane",
      ref,
    });
  });

  it("wraps measureExactDistance(refA, refB) through occurrence-scoped exact refs", async () => {
    const calls = [];
    const refA = {
      exactModelId: 17,
      exactShapeHandle: 33,
      nodeId: "node-a",
      geometryId: "geo_0",
      kind: "face",
      elementId: 7,
      transform: [
        1, 0, 0, 0,
        0, 1, 0, 0,
        0, 0, 1, 0,
        10, 20, 30, 1,
      ],
    };
    const refB = {
      exactModelId: 17,
      exactShapeHandle: 33,
      nodeId: "node-b",
      geometryId: "geo_0",
      kind: "face",
      elementId: 8,
      transform: [
        1, 0, 0, 0,
        0, 1, 0, 0,
        0, 0, 1, 0,
        110, 20, 30, 1,
      ],
    };
    const core = createOcctCore({
      factory: async () => ({
        MeasureExactDistance: (...args) => {
          calls.push(args);
          return {
            ok: true,
            value: 100,
            pointA: [10, 20, 30],
            pointB: [110, 20, 30],
            workingPlaneOrigin: [60, 20, 30],
            workingPlaneNormal: [1, 0, 0],
          };
        },
      }),
    });

    const result = await core.measureExactDistance(refA, refB);

    assert.deepEqual(calls, [[
      17,
      33,
      "face",
      7,
      33,
      "face",
      8,
      refA.transform,
      refB.transform,
    ]]);
    assert.deepEqual(result, {
      ok: true,
      value: 100,
      pointA: [10, 20, 30],
      pointB: [110, 20, 30],
      workingPlaneOrigin: [60, 20, 30],
      workingPlaneNormal: [1, 0, 0],
      refA,
      refB,
    });
  });

  it("wraps measureExactAngle(refA, refB) through occurrence-scoped exact refs", async () => {
    const calls = [];
    const refA = {
      exactModelId: 17,
      exactShapeHandle: 33,
      nodeId: "node-a",
      geometryId: "geo_0",
      kind: "edge",
      elementId: 5,
      transform: [
        1, 0, 0, 0,
        0, 1, 0, 0,
        0, 0, 1, 0,
        10, 20, 30, 1,
      ],
    };
    const refB = {
      exactModelId: 17,
      exactShapeHandle: 33,
      nodeId: "node-a",
      geometryId: "geo_0",
      kind: "edge",
      elementId: 6,
      transform: [
        1, 0, 0, 0,
        0, 1, 0, 0,
        0, 0, 1, 0,
        10, 20, 30, 1,
      ],
    };
    const core = createOcctCore({
      factory: async () => ({
        MeasureExactAngle: (...args) => {
          calls.push(args);
          return {
            ok: true,
            value: Math.PI / 2,
            origin: [10, 20, 30],
            directionA: [1, 0, 0],
            directionB: [0, 1, 0],
            pointA: [12, 20, 30],
            pointB: [10, 24, 30],
            workingPlaneOrigin: [10, 20, 30],
            workingPlaneNormal: [0, 0, 1],
          };
        },
      }),
    });

    const result = await core.measureExactAngle(refA, refB);

    assert.deepEqual(calls, [[
      17,
      33,
      "edge",
      5,
      33,
      "edge",
      6,
      refA.transform,
      refB.transform,
    ]]);
    assert.deepEqual(result, {
      ok: true,
      value: Math.PI / 2,
      origin: [10, 20, 30],
      directionA: [1, 0, 0],
      directionB: [0, 1, 0],
      pointA: [12, 20, 30],
      pointB: [10, 24, 30],
      workingPlaneOrigin: [10, 20, 30],
      workingPlaneNormal: [0, 0, 1],
      refA,
      refB,
    });
  });

  it("preserves exact thickness success and failure payloads through occurrence-scoped refs", async () => {
    const calls = [];
    const refA = {
      exactModelId: 17,
      exactShapeHandle: 33,
      nodeId: "node-a",
      geometryId: "geo_0",
      kind: "face",
      elementId: 5,
      transform: [
        1, 0, 0, 0,
        0, 1, 0, 0,
        0, 0, 1, 0,
        10, 20, 30, 1,
      ],
    };
    const refB = {
      exactModelId: 17,
      exactShapeHandle: 33,
      nodeId: "node-b",
      geometryId: "geo_0",
      kind: "face",
      elementId: 6,
      transform: [
        1, 0, 0, 0,
        0, 1, 0, 0,
        0, 0, 1, 0,
        10, 20, 130, 1,
      ],
    };
    const core = createOcctCore({
      factory: async () => ({
        MeasureExactThickness: (...args) => {
          calls.push(args);
          return {
            ok: true,
            value: 100,
            pointA: [10, 20, 30],
            pointB: [10, 20, 130],
            workingPlaneOrigin: [10, 20, 80],
            workingPlaneNormal: [0, 0, 1],
          };
        },
      }),
    });

    const result = await core.measureExactThickness(refA, refB);

    assert.deepEqual(calls, [[
      17,
      33,
      "face",
      5,
      33,
      "face",
      6,
      refA.transform,
      refB.transform,
    ]]);
    assert.deepEqual(result, {
      ok: true,
      value: 100,
      pointA: [10, 20, 30],
      pointB: [10, 20, 130],
      workingPlaneOrigin: [10, 20, 80],
      workingPlaneNormal: [0, 0, 1],
      refA,
      refB,
    });

    const failingCore = createOcctCore({
      factory: async () => ({
        MeasureExactThickness: () => ({
          ok: false,
          code: "unsupported-geometry",
          message: "Exact thickness only supports parallel planar face pairs.",
        }),
      }),
    });

    assert.deepEqual(await failingCore.measureExactThickness(refA, refB), {
      ok: false,
      code: "unsupported-geometry",
      message: "Exact thickness only supports parallel planar face pairs.",
    });
  });

  it("occt-core exposes package-first exact relation classification for pairwise refs", async () => {
    const calls = [];
    const refA = {
      exactModelId: 17,
      exactShapeHandle: 33,
      nodeId: "node-a",
      geometryId: "geo_0",
      kind: "edge",
      elementId: 5,
      transform: [
        1, 0, 0, 0,
        0, 1, 0, 0,
        0, 0, 1, 0,
        10, 20, 30, 1,
      ],
    };
    const refB = {
      exactModelId: 17,
      exactShapeHandle: 33,
      nodeId: "node-b",
      geometryId: "geo_0",
      kind: "edge",
      elementId: 6,
      transform: [
        1, 0, 0, 0,
        0, 1, 0, 0,
        0, 0, 1, 0,
        110, 20, 30, 1,
      ],
    };
    const core = createOcctCore({
      factory: async () => ({
        ClassifyExactRelation: (...args) => {
          calls.push(args);
          return {
            ok: true,
            kind: "parallel",
            frame: {
              origin: [60, 20, 30],
              normal: [0, 0, 1],
              xDir: [1, 0, 0],
              yDir: [0, 1, 0],
            },
            anchors: [
              { role: "attach", point: [10, 20, 30] },
              { role: "attach", point: [110, 20, 30] },
            ],
            directionA: [1, 0, 0],
            directionB: [1, 0, 0],
          };
        },
      }),
    });

    const result = await core.classifyExactRelation(refA, refB);

    assert.deepEqual(calls, [[
      17,
      33,
      "edge",
      5,
      33,
      "edge",
      6,
      refA.transform,
      refB.transform,
    ]]);
    assert.deepEqual(result, {
      ok: true,
      kind: "parallel",
      frame: {
        origin: [60, 20, 30],
        normal: [0, 0, 1],
        xDir: [1, 0, 0],
        yDir: [0, 1, 0],
      },
      anchors: [
        { role: "attach", point: [10, 20, 30] },
        { role: "attach", point: [110, 20, 30] },
      ],
      directionA: [1, 0, 0],
      directionB: [1, 0, 0],
      refA,
      refB,
    });
  });

  it("occt-core relation classification preserves none and explicit failure payloads", async () => {
    const refA = {
      exactModelId: 17,
      exactShapeHandle: 33,
      nodeId: "node-a",
      geometryId: "geo_0",
      kind: "edge",
      elementId: 5,
      transform: [
        1, 0, 0, 0,
        0, 1, 0, 0,
        0, 0, 1, 0,
        10, 20, 30, 1,
      ],
    };
    const refB = {
      exactModelId: 17,
      exactShapeHandle: 33,
      nodeId: "node-b",
      geometryId: "geo_0",
      kind: "edge",
      elementId: 6,
      transform: [
        1, 0, 0, 0,
        0, 1, 0, 0,
        0, 0, 1, 0,
        110, 20, 30, 1,
      ],
    };

    const noneCore = createOcctCore({
      factory: async () => ({
        ClassifyExactRelation: () => ({
          ok: true,
          kind: "none",
        }),
      }),
    });
    const failureCore = createOcctCore({
      factory: async () => ({
        ClassifyExactRelation: () => ({
          ok: false,
          code: "unsupported-geometry",
          message: "Exact relation classification only supports line/line, plane/plane, circle/circle, and circle/cylinder analytic pairs.",
        }),
      }),
    });

    assert.deepEqual(await noneCore.classifyExactRelation(refA, refB), {
      ok: true,
      kind: "none",
      refA,
      refB,
    });
    assert.deepEqual(await failureCore.classifyExactRelation(refA, refB), {
      ok: false,
      code: "unsupported-geometry",
      message: "Exact relation classification only supports line/line, plane/plane, circle/circle, and circle/cylinder analytic pairs.",
    });
  });

  it("wraps suggestExactDistancePlacement(refA, refB) through occurrence-scoped exact refs", async () => {
    const calls = [];
    const refA = {
      exactModelId: 17,
      exactShapeHandle: 33,
      nodeId: "node-a",
      geometryId: "geo_0",
      kind: "face",
      elementId: 7,
      transform: [
        1, 0, 0, 0,
        0, 1, 0, 0,
        0, 0, 1, 0,
        10, 20, 30, 1,
      ],
    };
    const refB = {
      exactModelId: 17,
      exactShapeHandle: 33,
      nodeId: "node-b",
      geometryId: "geo_0",
      kind: "face",
      elementId: 8,
      transform: [
        1, 0, 0, 0,
        0, 1, 0, 0,
        0, 0, 1, 0,
        110, 20, 30, 1,
      ],
    };
    const core = createOcctCore({
      factory: async () => ({
        SuggestExactDistancePlacement: (...args) => {
          calls.push(args);
          return {
            ok: true,
            kind: "distance",
            value: 100,
            frame: {
              origin: [60, 20, 30],
              normal: [0, 0, 1],
              xDir: [1, 0, 0],
              yDir: [0, 1, 0],
            },
            anchors: [
              { role: "attach", point: [10, 20, 30] },
              { role: "attach", point: [110, 20, 30] },
            ],
          };
        },
      }),
    });

    const result = await core.suggestExactDistancePlacement(refA, refB);

    assert.deepEqual(calls, [[
      17,
      33,
      "face",
      7,
      33,
      "face",
      8,
      refA.transform,
      refB.transform,
    ]]);
    assert.deepEqual(result, {
      ok: true,
      kind: "distance",
      value: 100,
      frame: {
        origin: [60, 20, 30],
        normal: [0, 0, 1],
        xDir: [1, 0, 0],
        yDir: [0, 1, 0],
      },
      anchors: [
        { role: "attach", point: [10, 20, 30] },
        { role: "attach", point: [110, 20, 30] },
      ],
      refA,
      refB,
    });
  });

  it("wraps suggestExactAnglePlacement(refA, refB) and suggestExactThicknessPlacement(refA, refB) through occurrence-scoped refs", async () => {
    const angleCalls = [];
    const thicknessCalls = [];
    const refA = {
      exactModelId: 17,
      exactShapeHandle: 33,
      nodeId: "node-a",
      geometryId: "geo_0",
      kind: "edge",
      elementId: 5,
      transform: [
        1, 0, 0, 0,
        0, 1, 0, 0,
        0, 0, 1, 0,
        10, 20, 30, 1,
      ],
    };
    const refB = {
      exactModelId: 17,
      exactShapeHandle: 33,
      nodeId: "node-b",
      geometryId: "geo_0",
      kind: "edge",
      elementId: 6,
      transform: [
        1, 0, 0, 0,
        0, 1, 0, 0,
        0, 0, 1, 0,
        10, 20, 30, 1,
      ],
    };
    const faceRefA = { ...refA, kind: "face", elementId: 7 };
    const faceRefB = { ...refB, kind: "face", elementId: 8 };
    const core = createOcctCore({
      factory: async () => ({
        SuggestExactAnglePlacement: (...args) => {
          angleCalls.push(args);
          return {
            ok: true,
            kind: "angle",
            value: Math.PI / 2,
            frame: {
              origin: [10, 20, 30],
              normal: [0, 0, 1],
              xDir: [1, 0, 0],
              yDir: [0, 1, 0],
            },
            anchors: [
              { role: "anchor", point: [10, 20, 30] },
              { role: "attach", point: [12, 20, 30] },
              { role: "attach", point: [10, 24, 30] },
            ],
            directionA: [1, 0, 0],
            directionB: [0, 1, 0],
          };
        },
        SuggestExactThicknessPlacement: (...args) => {
          thicknessCalls.push(args);
          return {
            ok: true,
            kind: "thickness",
            value: 100,
            frame: {
              origin: [10, 20, 80],
              normal: [1, 0, 0],
              xDir: [0, 1, 0],
              yDir: [0, 0, 1],
            },
            anchors: [
              { role: "attach", point: [10, 20, 30] },
              { role: "attach", point: [10, 20, 130] },
            ],
          };
        },
      }),
    });

    const angle = await core.suggestExactAnglePlacement(refA, refB);
    const thickness = await core.suggestExactThicknessPlacement(faceRefA, faceRefB);

    assert.deepEqual(angleCalls, [[
      17,
      33,
      "edge",
      5,
      33,
      "edge",
      6,
      refA.transform,
      refB.transform,
    ]]);
    assert.deepEqual(thicknessCalls, [[
      17,
      33,
      "face",
      7,
      33,
      "face",
      8,
      faceRefA.transform,
      faceRefB.transform,
    ]]);
    assert.deepEqual(angle, {
      ok: true,
      kind: "angle",
      value: Math.PI / 2,
      frame: {
        origin: [10, 20, 30],
        normal: [0, 0, 1],
        xDir: [1, 0, 0],
        yDir: [0, 1, 0],
      },
      anchors: [
        { role: "anchor", point: [10, 20, 30] },
        { role: "attach", point: [12, 20, 30] },
        { role: "attach", point: [10, 24, 30] },
      ],
      directionA: [1, 0, 0],
      directionB: [0, 1, 0],
      refA,
      refB,
    });
    assert.deepEqual(thickness, {
      ok: true,
      kind: "thickness",
      value: 100,
      frame: {
        origin: [10, 20, 80],
        normal: [1, 0, 0],
        xDir: [0, 1, 0],
        yDir: [0, 0, 1],
      },
      anchors: [
        { role: "attach", point: [10, 20, 30] },
        { role: "attach", point: [10, 20, 130] },
      ],
      refA: faceRefA,
      refB: faceRefB,
    });
  });

  it("transforms exact circular placement primitives into occurrence space", async () => {
    const ref = {
      exactModelId: 17,
      exactShapeHandle: 33,
      nodeId: "node-a",
      geometryId: "geo_0",
      kind: "edge",
      elementId: 5,
      transform: [
        1, 0, 0, 0,
        0, 1, 0, 0,
        0, 0, 1, 0,
        10, 20, 30, 1,
      ],
    };
    const core = createOcctCore({
      factory: async () => ({
        SuggestExactRadiusPlacement: () => ({
          ok: true,
          kind: "radius",
          value: 5,
          frame: {
            origin: [1, 2, 3],
            normal: [0, 0, 1],
            xDir: [1, 0, 0],
            yDir: [0, 1, 0],
          },
          anchors: [
            { role: "center", point: [1, 2, 3] },
            { role: "anchor", point: [6, 2, 3] },
          ],
          axisDirection: [0, 0, 1],
        }),
        SuggestExactDiameterPlacement: () => ({
          ok: true,
          kind: "diameter",
          value: 10,
          frame: {
            origin: [1, 2, 3],
            normal: [0, 0, 1],
            xDir: [1, 0, 0],
            yDir: [0, 1, 0],
          },
          anchors: [
            { role: "center", point: [1, 2, 3] },
            { role: "anchor", point: [6, 2, 3] },
            { role: "anchor", point: [-4, 2, 3] },
          ],
          axisDirection: [0, 0, 1],
        }),
      }),
    });

    const radius = await core.suggestExactRadiusPlacement(ref);
    const diameter = await core.suggestExactDiameterPlacement(ref);

    assert.deepEqual(radius, {
      ok: true,
      kind: "radius",
      value: 5,
      frame: {
        origin: [11, 22, 33],
        normal: [0, 0, 1],
        xDir: [1, 0, 0],
        yDir: [0, 1, 0],
      },
      anchors: [
        { role: "center", point: [11, 22, 33] },
        { role: "anchor", point: [16, 22, 33] },
      ],
      axisDirection: [0, 0, 1],
      ref,
    });
    assert.deepEqual(diameter, {
      ok: true,
      kind: "diameter",
      value: 10,
      frame: {
        origin: [11, 22, 33],
        normal: [0, 0, 1],
        xDir: [1, 0, 0],
        yDir: [0, 1, 0],
      },
      anchors: [
        { role: "center", point: [11, 22, 33] },
        { role: "anchor", point: [16, 22, 33] },
        { role: "anchor", point: [6, 22, 33] },
      ],
      axisDirection: [0, 0, 1],
      ref,
    });
  });

  it("transforms exact radius primitives into occurrence space", async () => {
    const ref = {
      exactModelId: 17,
      exactShapeHandle: 33,
      nodeId: "node-a",
      geometryId: "geo_0",
      kind: "edge",
      elementId: 5,
      transform: [
        1, 0, 0, 0,
        0, 1, 0, 0,
        0, 0, 1, 0,
        10, 20, 30, 1,
      ],
    };
    const core = createOcctCore({
      factory: async () => ({
        MeasureExactRadius: () => ({
          ok: true,
          family: "circle",
          radius: 5,
          diameter: 10,
          localCenter: [1, 2, 3],
          localAnchorPoint: [1, 2, 8],
          localAxisDirection: [0, 0, 1],
        }),
      }),
    });

    const result = await core.measureExactRadius(ref);

    assert.deepEqual(result, {
      ok: true,
      family: "circle",
      radius: 5,
      diameter: 10,
      center: [11, 22, 33],
      anchorPoint: [11, 22, 38],
      axisDirection: [0, 0, 1],
      ref,
    });
  });

  it("transforms exact edge length primitives into occurrence space", async () => {
    const ref = {
      exactModelId: 17,
      exactShapeHandle: 33,
      nodeId: "node-a",
      geometryId: "geo_0",
      kind: "edge",
      elementId: 5,
      transform: [
        1, 0, 0, 0,
        0, 1, 0, 0,
        0, 0, 1, 0,
        10, 20, 30, 1,
      ],
    };
    const core = createOcctCore({
      factory: async () => ({
        MeasureExactEdgeLength: () => ({
          ok: true,
          value: 25,
          localStartPoint: [1, 2, 3],
          localEndPoint: [6, 7, 8],
        }),
      }),
    });

    const result = await core.measureExactEdgeLength(ref);

    assert.deepEqual(result, {
      ok: true,
      value: 25,
      startPoint: [11, 22, 33],
      endPoint: [16, 27, 38],
      ref,
    });
  });

  it("transforms exact face area primitives into occurrence space", async () => {
    const ref = {
      exactModelId: 17,
      exactShapeHandle: 33,
      nodeId: "node-a",
      geometryId: "geo_0",
      kind: "face",
      elementId: 9,
      transform: [
        1, 0, 0, 0,
        0, 1, 0, 0,
        0, 0, 1, 0,
        10, 20, 30, 1,
      ],
    };
    const core = createOcctCore({
      factory: async () => ({
        MeasureExactFaceArea: () => ({
          ok: true,
          value: 64,
          localCentroid: [1, 2, 3],
        }),
      }),
    });

    const result = await core.measureExactFaceArea(ref);

    assert.deepEqual(result, {
      ok: true,
      value: 64,
      centroid: [11, 22, 33],
      ref,
    });
  });

  it("inverts occurrence transforms for exact face normal evaluation", async () => {
    const calls = [];
    const ref = {
      exactModelId: 17,
      exactShapeHandle: 33,
      nodeId: "node-a",
      geometryId: "geo_0",
      kind: "face",
      elementId: 9,
      transform: [
        0, 0, -1, 0,
        0, 1, 0, 0,
        1, 0, 0, 0,
        175, 67.5, 70, 1,
      ],
    };
    const queryPoint = [175, 80, 65];
    const core = createOcctCore({
      factory: async () => ({
        EvaluateExactFaceNormal: (...args) => {
          calls.push(args);
          return {
            ok: true,
            localPoint: [5, 12.5, 0],
            localNormal: [0, 0, 1],
          };
        },
      }),
    });

    const result = await core.evaluateExactFaceNormal(ref, queryPoint);

    assert.deepEqual(calls, [[17, 33, "face", 9, [5, 12.5, 0]]]);
    assert.deepEqual(result, {
      ok: true,
      point: queryPoint,
      normal: [1, 0, 0],
      ref,
    });
  });

  it("pins the format for openExactStep/openExactIges/openExactBrep", async () => {
    const calls = [];
    const exactResult = {
      success: true,
      sourceFormat: "step",
      exactModelId: 9,
      rootNodes: [],
      geometries: [],
      materials: [],
      warnings: [],
      stats: EMPTY_STATS,
    };
    const core = createOcctCore({
      factory: async () => ({
        OpenExactStepModel: (bytes) => {
          calls.push(["step", Array.from(bytes)]);
          return { ...exactResult, sourceFormat: "step" };
        },
        OpenExactIgesModel: (bytes) => {
          calls.push(["iges", Array.from(bytes)]);
          return { ...exactResult, sourceFormat: "iges" };
        },
        OpenExactBrepModel: (bytes) => {
          calls.push(["brep", Array.from(bytes)]);
          return { ...exactResult, sourceFormat: "brep" };
        },
      }),
    });

    assert.equal((await core.openExactStep(new Uint8Array([1]))).sourceFormat, "step");
    assert.equal((await core.openExactIges(new Uint8Array([2]))).sourceFormat, "iges");
    assert.equal((await core.openExactBrep(new Uint8Array([3]))).sourceFormat, "brep");
    assert.deepEqual(calls, [
      ["step", [1]],
      ["iges", [2]],
      ["brep", [3]],
    ]);
  });
});

describe("resolveAutoOrientedModel", () => {
  it("applies successful OCCT orientation analysis in Babylon coordinates", async () => {
    const model = {
      rootNodes: [
        {
          id: "node-a",
          kind: "part",
          transform: [
            1, 0, 0, 0,
            0, 1, 0, 0,
            0, 0, 1, 0,
            0, 0, 0, 1,
          ],
          children: [],
          geometryIds: [],
          materialIds: [],
        },
      ],
    };

    const oriented = await resolveAutoOrientedModel({
      bytes: new Uint8Array([1, 2, 3]),
      format: "step",
      model,
      occt: {
        AnalyzeOptimalOrientation() {
          return {
            success: true,
            transform: [
              1, 0, 0, 0,
              0, 1, 0, 0,
              0, 0, 1, 0,
              0, 0, 0, 1,
            ],
          };
        },
      },
    });

    assert.notEqual(oriented, model);
    assert.deepEqual(oriented.rootNodes[0].transform, [
      1, 0, 0, 0,
      0, 0, -1, 0,
      0, 1, 0, 0,
      0, 0, 0, 1,
    ]);
  });

  it("returns the original model when orientation analysis is unavailable", async () => {
    const model = {
      rootNodes: [
        {
          id: "node-a",
          kind: "part",
          transform: [
            1, 0, 0, 0,
            0, 1, 0, 0,
            0, 0, 1, 0,
            0, 0, 0, 1,
          ],
          children: [],
          geometryIds: [],
          materialIds: [],
        },
      ],
    };

    const oriented = await resolveAutoOrientedModel({
      bytes: new Uint8Array([1, 2, 3]),
      format: "step",
      model,
      occt: {},
    });

    assert.equal(oriented, model);
  });
});
