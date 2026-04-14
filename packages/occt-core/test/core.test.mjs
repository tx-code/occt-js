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

function hasOwn(object, key) {
  return Object.prototype.hasOwnProperty.call(object, key);
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
