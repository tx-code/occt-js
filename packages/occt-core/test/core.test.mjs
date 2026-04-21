import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  createOcctCore,
  normalizeExactOpenResult,
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
const IDENTITY_MATRIX = [
  1, 0, 0, 0,
  0, 1, 0, 0,
  0, 0, 1, 0,
  0, 0, 0, 1,
];

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

function createRevolvedShapeSpec() {
  return {
    version: 1,
    units: "mm",
    profile: {
      plane: "XZ",
      start: [0, 0],
      closure: "explicit",
      segments: [
        { kind: "line", id: "tip", tag: "tip", end: [3, 0] },
        { kind: "line", id: "flute", tag: "cutting", end: [3, 12] },
        { kind: "line", id: "axis-top", tag: "closure", end: [0, 12] },
        { kind: "line", id: "axis-bottom", tag: "closure", end: [0, 0] },
      ],
    },
    revolve: { angleDeg: 360 },
  };
}

function createProfile2DSpec() {
  return {
    version: 1,
    start: [0, 0],
    segments: [
      { kind: "line", id: "base", tag: "base", end: [6, 0] },
      { kind: "line", id: "right-wall", tag: "wall", end: [6, 10] },
      { kind: "line", id: "top", tag: "cap", end: [0, 10] },
      { kind: "line", id: "left-wall", tag: "wall", end: [0, 0] },
    ],
  };
}

function createExtrudedShapeSpec() {
  return {
    version: 1,
    units: "mm",
    profile: createProfile2DSpec(),
    extrusion: { depth: 24 },
  };
}

function createAutoAxisRevolvedShapeSpec() {
  return {
    version: 1,
    units: "inch",
    profile: {
      plane: "XZ",
      start: [0, 0],
      closure: "auto_axis",
      segments: [
        { kind: "line", id: "tip-land", tag: "tip", end: [1.5, 0] },
        { kind: "arc_3pt", id: "flute-profile", tag: "cutting", through: [4.5, 3], end: [1, 8] },
        { kind: "line", id: "neck", tag: "neck", end: [1, 12] },
      ],
    },
    revolve: { angleDeg: 210 },
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

  it("preserves generated revolved shape source format and geometry bindings", () => {
    const result = normalizeOcctResult({
      success: true,
      sourceFormat: "generated-revolved-shape",
      rootNodes: [{
        id: "tool-root",
        name: "Generated Revolved Shape",
        isAssembly: false,
        transform: IDENTITY_MATRIX,
        meshes: [0],
        children: [],
      }],
      geometries: [{
        name: "tool-body",
        color: { r: 0.8, g: 0.8, b: 0.82 },
        positions: new Float32Array([0, 0, 0, 1, 0, 0, 0, 1, 0]),
        normals: new Float32Array([0, 0, 1, 0, 0, 1, 0, 0, 1]),
        indices: new Uint32Array([0, 1, 2]),
        faces: [{
          id: 1,
          name: "profile.tip",
          firstIndex: 0,
          indexCount: 3,
          edgeIndices: [],
          color: { r: 0.9, g: 0.75, b: 0.25 },
        }],
        edges: [],
        vertices: [],
        triangleToFaceMap: new Int32Array([1]),
      }],
      materials: [
        { r: 0.8, g: 0.8, b: 0.82 },
        { r: 0.9, g: 0.75, b: 0.25 },
      ],
      warnings: [],
      stats: { ...EMPTY_STATS, rootCount: 1, nodeCount: 1, partCount: 1, geometryCount: 1, materialCount: 2, triangleCount: 1 },
      revolvedShape: {
        units: "mm",
        plane: "XZ",
        version: 1,
        angleDeg: 360,
        segmentCount: 1,
        hasStableFaceBindings: true,
        closureMode: "explicit",
        closure: "explicit",
        shapeValidation: {
          exact: {
            isValid: true,
            isClosed: true,
            isSolid: true,
            shapeType: "solid",
            solidCount: 1,
            shellCount: 1,
            faceCount: 1,
            edgeCount: 0,
            vertexCount: 0,
          },
          mesh: {
            isWatertight: true,
            isManifold: true,
            weldedVertexCount: 3,
            boundaryEdgeCount: 0,
            nonManifoldEdgeCount: 0,
          },
        },
        segments: [{ index: 0, kind: "line", id: "tool-body", tag: "cutting" }],
        faceBindings: [{
          geometryIndex: 0,
          faceId: 1,
          systemRole: "profile",
          segmentIndex: 0,
          segmentId: "tool-body",
          segmentTag: "cutting",
        }],
      },
    });

    assert.equal(result.sourceFormat, "generated-revolved-shape");
    assert.equal(result.geometries.length, 1);
    assert.deepEqual(result.rootNodes[0].geometryIds, ["geo_0"]);
    assert.equal(result.stats.materialCount, 2);
    assert.equal(result.revolvedShape.units, "mm");
    assert.equal(result.revolvedShape.segments[0].tag, "cutting");
    assert.equal(result.revolvedShape.faceBindings[0].geometryId, "geo_0");
    assert.equal(result.revolvedShape.faceBindings[0].segmentId, "tool-body");
    assert.equal(result.revolvedShape.shapeValidation.exact.isClosed, true);
    assert.equal(result.revolvedShape.shapeValidation.mesh.isWatertight, true);
  });

  it("preserves generated extruded shape source format and geometry bindings", () => {
    const result = normalizeOcctResult({
      success: true,
      sourceFormat: "generated-extruded-shape",
      rootNodes: [{
        id: "shape-root",
        name: "Generated Extruded Shape",
        isAssembly: false,
        transform: IDENTITY_MATRIX,
        meshes: [0],
        children: [],
      }],
      geometries: [{
        name: "shape-body",
        color: { r: 0.8, g: 0.8, b: 0.82 },
        positions: new Float32Array([0, 0, 0, 1, 0, 0, 0, 1, 0]),
        normals: new Float32Array([0, 0, 1, 0, 0, 1, 0, 0, 1]),
        indices: new Uint32Array([0, 1, 2]),
        faces: [{
          id: 1,
          name: "wall.base",
          firstIndex: 0,
          indexCount: 3,
          edgeIndices: [],
          color: { r: 0.85, g: 0.7, b: 0.25 },
        }],
        edges: [],
        vertices: [],
        triangleToFaceMap: new Int32Array([1]),
      }],
      materials: [
        { r: 0.8, g: 0.8, b: 0.82 },
        { r: 0.85, g: 0.7, b: 0.25 },
      ],
      warnings: [],
      stats: { ...EMPTY_STATS, rootCount: 1, nodeCount: 1, partCount: 1, geometryCount: 1, materialCount: 2, triangleCount: 1 },
      extrudedShape: {
        version: 1,
        units: "mm",
        depth: 24,
        segmentCount: 1,
        hasStableFaceBindings: true,
        shapeValidation: {
          exact: {
            isValid: true,
            isClosed: true,
            isSolid: true,
            shapeType: "solid",
            solidCount: 1,
            shellCount: 1,
            faceCount: 1,
            edgeCount: 0,
            vertexCount: 0,
          },
          mesh: {
            isWatertight: true,
            isManifold: true,
            weldedVertexCount: 3,
            boundaryEdgeCount: 0,
            nonManifoldEdgeCount: 0,
          },
        },
        segments: [{ index: 0, kind: "line", id: "shape-wall", tag: "wall" }],
        faceBindings: [{
          geometryIndex: 0,
          faceId: 1,
          systemRole: "wall",
          segmentIndex: 0,
          segmentId: "shape-wall",
          segmentTag: "wall",
        }],
      },
    });

    assert.equal(result.sourceFormat, "generated-extruded-shape");
    assert.equal(result.extrudedShape.units, "mm");
    assert.equal(result.extrudedShape.depth, 24);
    assert.equal(result.extrudedShape.faceBindings[0].geometryId, "geo_0");
    assert.equal(result.extrudedShape.faceBindings[0].segmentId, "shape-wall");
    assert.equal(result.extrudedShape.shapeValidation.mesh.isWatertight, true);
  });

  it("normalizeExactOpenResult preserves generated extruded metadata and exact geometry bindings", () => {
    const exact = normalizeExactOpenResult({
      success: true,
      sourceFormat: "generated-extruded-shape",
      exactModelId: 41,
      exactGeometryBindings: [{ exactShapeHandle: 9 }],
      rootNodes: [{
        id: "shape-root",
        name: "Generated Extruded Shape",
        isAssembly: false,
        transform: IDENTITY_MATRIX,
        meshes: [0],
        children: [],
      }],
      geometries: [{
        name: "shape-body",
        color: { r: 0.8, g: 0.8, b: 0.82 },
        positions: new Float32Array([0, 0, 0, 1, 0, 0, 0, 1, 0]),
        normals: new Float32Array([0, 0, 1, 0, 0, 1, 0, 0, 1]),
        indices: new Uint32Array([0, 1, 2]),
        faces: [{
          id: 1,
          name: "wall.base",
          firstIndex: 0,
          indexCount: 3,
          edgeIndices: [],
          color: { r: 0.85, g: 0.7, b: 0.25 },
        }],
        edges: [],
        vertices: [],
        triangleToFaceMap: new Int32Array([1]),
      }],
      materials: [
        { r: 0.8, g: 0.8, b: 0.82 },
        { r: 0.85, g: 0.7, b: 0.25 },
      ],
      warnings: [],
      stats: { ...EMPTY_STATS, rootCount: 1, nodeCount: 1, partCount: 1, geometryCount: 1, materialCount: 2, triangleCount: 1 },
      extrudedShape: {
        version: 1,
        units: "mm",
        depth: 24,
        segmentCount: 1,
        hasStableFaceBindings: true,
        segments: [{ index: 0, kind: "line", id: "shape-wall", tag: "wall" }],
        faceBindings: [{
          geometryIndex: 0,
          faceId: 1,
          systemRole: "wall",
          segmentIndex: 0,
          segmentId: "shape-wall",
          segmentTag: "wall",
        }],
      },
    });

    assert.equal(exact.exactModelId, 41);
    assert.equal(exact.geometries[0].geometryId, "geo_0");
    assert.equal(exact.exactGeometryBindings[0].geometryId, "geo_0");
    assert.equal(exact.extrudedShape.faceBindings[0].geometryId, "geo_0");
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

  it("openManagedExactModel wraps exact open results with explicit dispose semantics", async () => {
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
        ReleaseExactModel: (exactModelId) => {
          calls.push(["ReleaseExactModel", exactModelId]);
          return { ok: true };
        },
      }),
    });

    const managed = await core.openManagedExactModel(new Uint8Array([7, 8, 9]), {
      format: "step",
      importParams: { readColors: false },
    });

    assert.equal(managed.exactModelId, 17);
    assert.equal(managed.exactModel, exactResult);
    assert.deepEqual(await managed.dispose(), { ok: true });
    assert.deepEqual(calls, [
      ["OpenExactStepModel", [7, 8, 9], { readColors: false }],
      ["ReleaseExactModel", 17],
    ]);
  });

  it("managed exact-model helpers keep FinalizationRegistry best-effort and dispose idempotent", async () => {
    const originalFinalizationRegistry = globalThis.FinalizationRegistry;
    const finalizerInstances = [];
    class MockFinalizationRegistry {
      constructor(callback) {
        this.callback = callback;
        this.registrations = [];
        this.unregistered = [];
        finalizerInstances.push(this);
      }

      register(_target, heldValue, unregisterToken) {
        this.registrations.push({ heldValue, unregisterToken });
      }

      unregister(unregisterToken) {
        this.unregistered.push(unregisterToken);
        return true;
      }
    }
    globalThis.FinalizationRegistry = MockFinalizationRegistry;

    try {
      let releaseCalls = 0;
      const core = createOcctCore({
        factory: async () => ({
          OpenExactStepModel: () => ({
            success: true,
            sourceFormat: "step",
            exactModelId: 27,
            rootNodes: [],
            geometries: [],
            materials: [],
            warnings: [],
            stats: EMPTY_STATS,
          }),
          ReleaseExactModel: () => {
            releaseCalls += 1;
            return { ok: true };
          },
        }),
      });

      const managed = await core.openManagedExactStep(new Uint8Array([1, 2, 3]));
      assert.equal(finalizerInstances.length, 1);
      assert.equal(finalizerInstances[0].registrations.length, 1);

      assert.deepEqual(await managed.dispose(), { ok: true });
      assert.deepEqual(await managed.dispose(), { ok: true });
      assert.equal(releaseCalls, 1);
      assert.equal(finalizerInstances[0].unregistered.length, 1);

      await core.openManagedExactStep(new Uint8Array([4, 5, 6]));
      assert.equal(finalizerInstances[0].registrations.length, 2);
      finalizerInstances[0].callback(finalizerInstances[0].registrations[1].heldValue);
      await Promise.resolve();
      assert.equal(releaseCalls, 2);
    } finally {
      globalThis.FinalizationRegistry = originalFinalizationRegistry;
    }
  });

  it("getExactModelDiagnostics surfaces root lifecycle snapshots package-first", async () => {
    const diagnostics = {
      liveExactModelCount: 1,
      releasedHandleCount: 3,
      liveExactModels: [{
        exactModelId: 17,
        refCount: 2,
        sourceFormat: "step",
        sourceUnit: "MM",
        unitScaleToMeters: 0.001,
        exactGeometryCount: 4,
      }],
    };
    const core = createOcctCore({
      factory: async () => ({
        GetExactModelDiagnostics: () => diagnostics,
      }),
    });

    assert.equal(await core.getExactModelDiagnostics(), diagnostics);
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

  it("wraps describeExactHole(ref) through occurrence-scoped exact refs", async () => {
    const calls = [];
    const ref = {
      exactModelId: 17,
      exactShapeHandle: 33,
      nodeId: "node-a",
      geometryId: "geo_0",
      kind: "edge",
      elementId: 5,
      transform: IDENTITY_MATRIX.slice(),
    };
    const core = createOcctCore({
      factory: async () => ({
        DescribeExactHole: (...args) => {
          calls.push(args);
          return {
            ok: true,
            kind: "hole",
            profile: "cylindrical",
            radius: 5,
            diameter: 10,
            depth: 20,
            isThrough: false,
            frame: {
              origin: [1, 2, 3],
              normal: [0, 0, 1],
              xDir: [1, 0, 0],
              yDir: [0, 1, 0],
            },
            anchors: [
              { role: "center", point: [1, 2, 3] },
              { role: "entry", point: [1, 2, 13] },
              { role: "bottom", point: [1, 2, -7] },
            ],
            axisDirection: [0, 0, 1],
          };
        },
      }),
    });

    const result = await core.describeExactHole(ref);

    assert.deepEqual(calls, [[17, 33, "edge", 5]]);
    assert.deepEqual(result, {
      ok: true,
      kind: "hole",
      profile: "cylindrical",
      radius: 5,
      diameter: 10,
      depth: 20,
      isThrough: false,
      frame: {
        origin: [1, 2, 3],
        normal: [0, 0, 1],
        xDir: [1, 0, 0],
        yDir: [0, 1, 0],
      },
      anchors: [
        { role: "center", point: [1, 2, 3] },
        { role: "entry", point: [1, 2, 13] },
        { role: "bottom", point: [1, 2, -7] },
      ],
      axisDirection: [0, 0, 1],
      ref,
    });
  });

  it("transforms describeExactHole semantic geometry into occurrence space", async () => {
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
        DescribeExactHole: () => ({
          ok: true,
          kind: "hole",
          profile: "cylindrical",
          radius: 5,
          diameter: 10,
          depth: 20,
          isThrough: true,
          frame: {
            origin: [1, 2, 3],
            normal: [0, 0, 1],
            xDir: [1, 0, 0],
            yDir: [0, 1, 0],
          },
          anchors: [
            { role: "center", point: [1, 2, 3] },
            { role: "entry", point: [1, 2, 13] },
            { role: "exit", point: [1, 2, -7] },
          ],
          axisDirection: [0, 0, 1],
          centerPoint: [1, 2, 3],
          entryPoint: [1, 2, 13],
          exitPoint: [1, 2, -7],
        }),
      }),
    });

    const result = await core.describeExactHole(ref);

    assert.deepEqual(result, {
      ok: true,
      kind: "hole",
      profile: "cylindrical",
      radius: 5,
      diameter: 10,
      depth: 20,
      isThrough: true,
      frame: {
        origin: [11, 22, 33],
        normal: [0, 0, 1],
        xDir: [1, 0, 0],
        yDir: [0, 1, 0],
      },
      anchors: [
        { role: "center", point: [11, 22, 33] },
        { role: "entry", point: [11, 22, 43] },
        { role: "exit", point: [11, 22, 23] },
      ],
      axisDirection: [0, 0, 1],
      centerPoint: [11, 22, 33],
      entryPoint: [11, 22, 43],
      exitPoint: [11, 22, 23],
      ref,
    });
  });

  it("describeExactHole preserves explicit unsupported and failure results", async () => {
    const ref = {
      exactModelId: 17,
      exactShapeHandle: 33,
      nodeId: "node-a",
      geometryId: "geo_0",
      kind: "edge",
      elementId: 5,
      transform: IDENTITY_MATRIX.slice(),
    };
    const failingCore = createOcctCore({
      factory: async () => ({
        DescribeExactHole: () => ({
          ok: false,
          code: "unsupported-geometry",
          message: "Exact hole helper only supports cylindrical hole refs.",
        }),
      }),
    });

    assert.deepEqual(await failingCore.describeExactHole(ref), {
      ok: false,
      code: "unsupported-geometry",
      message: "Exact hole helper only supports cylindrical hole refs.",
    });
  });

  it("describeExactHole requires an occurrence-scoped exact ref object", async () => {
    const core = createOcctCore({
      factory: async () => ({}),
    });

    await assert.rejects(
      core.describeExactHole(null),
      /occurrence-scoped exact ref object/i,
    );
  });

  it("wraps describeExactChamfer(ref) through occurrence-scoped exact refs", async () => {
    const calls = [];
    const ref = {
      exactModelId: 17,
      exactShapeHandle: 33,
      nodeId: "node-a",
      geometryId: "geo_0",
      kind: "face",
      elementId: 9,
      transform: IDENTITY_MATRIX.slice(),
    };
    const core = createOcctCore({
      factory: async () => ({
        DescribeExactChamfer: (...args) => {
          calls.push(args);
          return {
            ok: true,
            kind: "chamfer",
            profile: "planar",
            variant: "equal-distance",
            distanceA: 4,
            distanceB: 4,
            supportAngle: Math.PI / 2,
            frame: {
              origin: [1, 2, 3],
              normal: [0, 0, 1],
              xDir: [1, 0, 0],
              yDir: [0, 1, 0],
            },
            anchors: [
              { role: "support-a", point: [1, -2, 3] },
              { role: "support-b", point: [1, 6, 3] },
            ],
            edgeDirection: [1, 0, 0],
            supportNormalA: [0, -1, 0],
            supportNormalB: [0, 1, 0],
          };
        },
      }),
    });

    const result = await core.describeExactChamfer(ref);

    assert.deepEqual(calls, [[17, 33, "face", 9]]);
    assert.deepEqual(result, {
      ok: true,
      kind: "chamfer",
      profile: "planar",
      variant: "equal-distance",
      distanceA: 4,
      distanceB: 4,
      supportAngle: Math.PI / 2,
      frame: {
        origin: [1, 2, 3],
        normal: [0, 0, 1],
        xDir: [1, 0, 0],
        yDir: [0, 1, 0],
      },
      anchors: [
        { role: "support-a", point: [1, -2, 3] },
        { role: "support-b", point: [1, 6, 3] },
      ],
      edgeDirection: [1, 0, 0],
      supportNormalA: [0, -1, 0],
      supportNormalB: [0, 1, 0],
      ref,
    });
  });

  it("transforms describeExactChamfer semantic geometry into occurrence space", async () => {
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
        DescribeExactChamfer: () => ({
          ok: true,
          kind: "chamfer",
          profile: "planar",
          variant: "two-distance",
          distanceA: 4,
          distanceB: 6,
          supportAngle: Math.PI / 3,
          frame: {
            origin: [1, 2, 3],
            normal: [0, 0, 1],
            xDir: [1, 0, 0],
            yDir: [0, 1, 0],
          },
          anchors: [
            { role: "support-a", point: [1, -2, 3] },
            { role: "support-b", point: [1, 6, 3] },
          ],
          edgeDirection: [1, 0, 0],
          supportNormalA: [0, -1, 0],
          supportNormalB: [0, 1, 0],
        }),
      }),
    });

    const result = await core.describeExactChamfer(ref);

    assert.deepEqual(result, {
      ok: true,
      kind: "chamfer",
      profile: "planar",
      variant: "two-distance",
      distanceA: 4,
      distanceB: 6,
      supportAngle: Math.PI / 3,
      frame: {
        origin: [11, 22, 33],
        normal: [0, 0, 1],
        xDir: [1, 0, 0],
        yDir: [0, 1, 0],
      },
      anchors: [
        { role: "support-a", point: [11, 18, 33] },
        { role: "support-b", point: [11, 26, 33] },
      ],
      edgeDirection: [1, 0, 0],
      supportNormalA: [0, -1, 0],
      supportNormalB: [0, 1, 0],
      ref,
    });
  });

  it("describeExactChamfer preserves explicit unsupported and failure results", async () => {
    const ref = {
      exactModelId: 17,
      exactShapeHandle: 33,
      nodeId: "node-a",
      geometryId: "geo_0",
      kind: "face",
      elementId: 9,
      transform: IDENTITY_MATRIX.slice(),
    };
    const failingCore = createOcctCore({
      factory: async () => ({
        DescribeExactChamfer: () => ({
          ok: false,
          code: "unsupported-geometry",
          message: "Exact chamfer helper only supports planar chamfer face refs.",
        }),
      }),
    });

    assert.deepEqual(await failingCore.describeExactChamfer(ref), {
      ok: false,
      code: "unsupported-geometry",
      message: "Exact chamfer helper only supports planar chamfer face refs.",
    });
  });

  it("describeExactChamfer requires an occurrence-scoped exact ref object", async () => {
    const core = createOcctCore({
      factory: async () => ({}),
    });

    await assert.rejects(
      core.describeExactChamfer(null),
      /occurrence-scoped exact ref object/i,
    );
  });

  it("suggestExactMidpointPlacement derives midpoint geometry from supported distance placement", async () => {
    const refA = {
      exactModelId: 17,
      exactShapeHandle: 33,
      nodeId: "node-a",
      geometryId: "geo_0",
      kind: "face",
      elementId: 5,
      transform: IDENTITY_MATRIX.slice(),
    };
    const refB = {
      exactModelId: 17,
      exactShapeHandle: 34,
      nodeId: "node-b",
      geometryId: "geo_1",
      kind: "face",
      elementId: 7,
      transform: IDENTITY_MATRIX.slice(),
    };
    const core = createOcctCore({
      factory: async () => ({
        SuggestExactDistancePlacement: () => ({
          ok: true,
          kind: "distance",
          value: 8,
          frame: {
            origin: [1, 2, 3],
            normal: [1, 0, 0],
            xDir: [0, 0, 1],
            yDir: [0, 1, 0],
          },
          anchors: [
            { role: "attach", point: [1, 2, -1] },
            { role: "attach", point: [1, 2, 7] },
          ],
        }),
      }),
    });

    const result = await core.suggestExactMidpointPlacement(refA, refB);

    assert.deepEqual(result, {
      ok: true,
      kind: "midpoint",
      value: 8,
      point: [1, 2, 3],
      frame: {
        origin: [1, 2, 3],
        normal: [1, 0, 0],
        xDir: [0, 0, 1],
        yDir: [0, 1, 0],
      },
      anchors: [
        { role: "attach", point: [1, 2, -1] },
        { role: "attach", point: [1, 2, 7] },
        { role: "center", point: [1, 2, 3] },
      ],
      refA,
      refB,
    });
  });

  it("describeExactEqualDistance compares two pairwise distances with explicit tolerance output", async () => {
    const refA = {
      exactModelId: 17,
      exactShapeHandle: 33,
      nodeId: "node-a",
      geometryId: "geo_0",
      kind: "face",
      elementId: 5,
      transform: IDENTITY_MATRIX.slice(),
    };
    const refB = {
      exactModelId: 17,
      exactShapeHandle: 34,
      nodeId: "node-b",
      geometryId: "geo_1",
      kind: "face",
      elementId: 7,
      transform: IDENTITY_MATRIX.slice(),
    };
    const refC = {
      exactModelId: 17,
      exactShapeHandle: 35,
      nodeId: "node-c",
      geometryId: "geo_2",
      kind: "face",
      elementId: 9,
      transform: IDENTITY_MATRIX.slice(),
    };
    const refD = {
      exactModelId: 17,
      exactShapeHandle: 36,
      nodeId: "node-d",
      geometryId: "geo_3",
      kind: "face",
      elementId: 11,
      transform: IDENTITY_MATRIX.slice(),
    };
    let callCount = 0;
    const core = createOcctCore({
      factory: async () => ({
        MeasureExactDistance: () => {
          callCount += 1;
          return {
            ok: true,
            value: callCount === 1 ? 5 : 5.005,
            pointA: [0, 0, 0],
            pointB: [0, 0, 5],
            workingPlaneOrigin: [0, 0, 2.5],
            workingPlaneNormal: [1, 0, 0],
          };
        },
      }),
    });

    const result = await core.describeExactEqualDistance(refA, refB, refC, refD, { tolerance: 0.01 });

    assert.deepEqual(result, {
      ok: true,
      kind: "equal-distance",
      equal: true,
      distanceA: 5,
      distanceB: 5.005,
      delta: 0.004999999999999893,
      tolerance: 0.01,
      refA,
      refB,
      refC,
      refD,
    });
  });

  it("suggestExactSymmetryPlacement derives a midplane-style symmetry helper from supported parallel pairs", async () => {
    const refA = {
      exactModelId: 17,
      exactShapeHandle: 33,
      nodeId: "node-a",
      geometryId: "geo_0",
      kind: "face",
      elementId: 5,
      transform: IDENTITY_MATRIX.slice(),
    };
    const refB = {
      exactModelId: 17,
      exactShapeHandle: 34,
      nodeId: "node-b",
      geometryId: "geo_1",
      kind: "face",
      elementId: 7,
      transform: IDENTITY_MATRIX.slice(),
    };
    const core = createOcctCore({
      factory: async () => ({
        ClassifyExactRelation: () => ({
          ok: true,
          kind: "parallel",
          frame: {
            origin: [0, 0, 0],
            normal: [1, 0, 0],
            xDir: [0, 0, 1],
            yDir: [0, 1, 0],
          },
          anchors: [
            { role: "attach", point: [0, 0, -4] },
            { role: "attach", point: [0, 0, 4] },
          ],
          directionA: [0, 0, 1],
          directionB: [0, 0, 1],
        }),
        SuggestExactDistancePlacement: () => ({
          ok: true,
          kind: "distance",
          value: 8,
          frame: {
            origin: [0, 0, 0],
            normal: [1, 0, 0],
            xDir: [0, 0, 1],
            yDir: [0, 1, 0],
          },
          anchors: [
            { role: "attach", point: [0, 0, -4] },
            { role: "attach", point: [0, 0, 4] },
          ],
        }),
      }),
    });

    const result = await core.suggestExactSymmetryPlacement(refA, refB);

    assert.deepEqual(result, {
      ok: true,
      kind: "symmetry",
      variant: "midplane",
      value: 8,
      frame: {
        origin: [0, 0, 0],
        normal: [0, 0, 1],
        xDir: [1, 0, 0],
        yDir: [0, 1, 0],
      },
      anchors: [
        { role: "attach", point: [0, 0, -4] },
        { role: "attach", point: [0, 0, 4] },
        { role: "center", point: [0, 0, 0] },
      ],
      planeNormal: [0, 0, 1],
      refA,
      refB,
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

  it("wraps generated revolved shape validate/build/openExact entrypoints without forcing raw Wasm access", async () => {
    const calls = [];
    const spec = createRevolvedShapeSpec();
    const buildOptions = {
      linearDeflectionType: "bounding_box_ratio",
      linearDeflection: 0.001,
      angularDeflection: 0.5,
    };
    const core = createOcctCore({
      factory: async () => ({
        ValidateRevolvedShapeSpec: (incomingSpec) => {
          calls.push(["validate", incomingSpec]);
          return { ok: true, diagnostics: [] };
        },
        BuildRevolvedShape: (incomingSpec, incomingOptions) => {
          calls.push(["build", incomingSpec, incomingOptions]);
          return {
            success: true,
            sourceFormat: "generated-revolved-shape",
            rootNodes: [],
            geometries: [],
            materials: [],
            warnings: [],
            stats: EMPTY_STATS,
            revolvedShape: {
              version: 1,
              units: "mm",
              plane: "XZ",
              closure: "explicit",
              angleDeg: 360,
              segmentCount: 4,
              hasStableFaceBindings: true,
              segments: [],
              faceBindings: [],
            },
          };
        },
        OpenExactRevolvedShape: (incomingSpec, incomingOptions) => {
          calls.push(["openExact", incomingSpec, incomingOptions]);
          return {
            success: true,
            sourceFormat: "generated-revolved-shape",
            exactModelId: 42,
            exactGeometryBindings: [{ exactShapeHandle: 1 }],
            rootNodes: [],
            geometries: [],
            materials: [],
            warnings: [],
            stats: EMPTY_STATS,
            revolvedShape: {
              version: 1,
              units: "mm",
              plane: "XZ",
              closure: "explicit",
              angleDeg: 360,
              segmentCount: 4,
              hasStableFaceBindings: true,
              segments: [],
              faceBindings: [],
            },
          };
        },
      }),
    });

    const validation = await core.validateRevolvedShapeSpec(spec);
    const built = await core.buildRevolvedShape(spec, buildOptions);
    const exact = await core.openExactRevolvedShape(spec, buildOptions);

    assert.deepEqual(validation, { ok: true, diagnostics: [] });
    assert.equal(built.sourceFormat, "generated-revolved-shape");
    assert.equal(built.revolvedShape.hasStableFaceBindings, true);
    assert.equal(exact.exactModelId, 42);
    assert.deepEqual(calls, [
      ["validate", spec],
      ["build", spec, buildOptions],
      ["openExact", spec, buildOptions],
    ]);
  });

  it("wraps shared profile and generated extruded shape entrypoints without forcing raw Wasm access", async () => {
    const calls = [];
    const profile = createProfile2DSpec();
    const spec = createExtrudedShapeSpec();
    const buildOptions = {
      linearDeflectionType: "bounding_box_ratio",
      linearDeflection: 0.001,
      angularDeflection: 0.5,
    };
    const core = createOcctCore({
      factory: async () => ({
        ValidateProfile2DSpec: (incomingSpec) => {
          calls.push(["validateProfile", incomingSpec]);
          return { ok: true, diagnostics: [] };
        },
        ValidateExtrudedShapeSpec: (incomingSpec) => {
          calls.push(["validateExtruded", incomingSpec]);
          return { ok: true, diagnostics: [] };
        },
        BuildExtrudedShape: (incomingSpec, incomingOptions) => {
          calls.push(["buildExtruded", incomingSpec, incomingOptions]);
          return {
            success: true,
            sourceFormat: "generated-extruded-shape",
            rootNodes: [],
            geometries: [],
            materials: [],
            warnings: [],
            stats: EMPTY_STATS,
            extrudedShape: {
              version: 1,
              units: "mm",
              depth: 24,
              segmentCount: 4,
              hasStableFaceBindings: true,
              segments: [],
              faceBindings: [],
            },
          };
        },
        OpenExactExtrudedShape: (incomingSpec, incomingOptions) => {
          calls.push(["openExactExtruded", incomingSpec, incomingOptions]);
          return {
            success: true,
            sourceFormat: "generated-extruded-shape",
            exactModelId: 52,
            exactGeometryBindings: [{ exactShapeHandle: 1 }],
            rootNodes: [],
            geometries: [],
            materials: [],
            warnings: [],
            stats: EMPTY_STATS,
            extrudedShape: {
              version: 1,
              units: "mm",
              depth: 24,
              segmentCount: 4,
              hasStableFaceBindings: true,
              segments: [],
              faceBindings: [],
            },
          };
        },
      }),
    });

    const profileValidation = await core.validateProfile2DSpec(profile);
    const extrudedValidation = await core.validateExtrudedShapeSpec(spec);
    const built = await core.buildExtrudedShape(spec, buildOptions);
    const exact = await core.openExactExtrudedShape(spec, buildOptions);

    assert.deepEqual(profileValidation, { ok: true, diagnostics: [] });
    assert.deepEqual(extrudedValidation, { ok: true, diagnostics: [] });
    assert.equal(built.sourceFormat, "generated-extruded-shape");
    assert.equal(built.extrudedShape.hasStableFaceBindings, true);
    assert.equal(exact.exactModelId, 52);
    assert.deepEqual(calls, [
      ["validateProfile", profile],
      ["validateExtruded", spec],
      ["buildExtruded", spec, buildOptions],
      ["openExactExtruded", spec, buildOptions],
    ]);
  });

  it("keeps auto_axis shared-kernel revolved specs intact through the package wrapper", async () => {
    const calls = [];
    const spec = createAutoAxisRevolvedShapeSpec();
    const buildOptions = {
      linearDeflectionType: "bounding_box_ratio",
      linearDeflection: 0.001,
      angularDeflection: 0.5,
    };
    const core = createOcctCore({
      factory: async () => ({
        BuildRevolvedShape: (incomingSpec, incomingOptions) => {
          calls.push(["build", incomingSpec, incomingOptions]);
          return {
            success: true,
            sourceFormat: "generated-revolved-shape",
            rootNodes: [],
            geometries: [],
            materials: [],
            warnings: [],
            stats: EMPTY_STATS,
            revolvedShape: {
              version: 1,
              units: "inch",
              plane: "XZ",
              closure: "auto_axis",
              angleDeg: 210,
              segmentCount: 3,
              hasStableFaceBindings: true,
              segments: [],
              faceBindings: [],
            },
          };
        },
        OpenExactRevolvedShape: (incomingSpec, incomingOptions) => {
          calls.push(["openExact", incomingSpec, incomingOptions]);
          return {
            success: true,
            sourceFormat: "generated-revolved-shape",
            exactModelId: 84,
            exactGeometryBindings: [{ exactShapeHandle: 1 }],
            rootNodes: [],
            geometries: [],
            materials: [],
            warnings: [],
            stats: EMPTY_STATS,
            revolvedShape: {
              version: 1,
              units: "inch",
              plane: "XZ",
              closure: "auto_axis",
              angleDeg: 210,
              segmentCount: 3,
              hasStableFaceBindings: true,
              segments: [],
              faceBindings: [],
            },
          };
        },
      }),
    });

    const built = await core.buildRevolvedShape(spec, buildOptions);
    const exact = await core.openExactRevolvedShape(spec, buildOptions);

    assert.equal(built.revolvedShape.closure, "auto_axis");
    assert.equal(exact.revolvedShape.closure, "auto_axis");
    assert.equal(exact.exactModelId, 84);
    assert.deepEqual(calls, [
      ["build", spec, buildOptions],
      ["openExact", spec, buildOptions],
    ]);
  });

  it("fails explicitly when the loaded module does not expose generated revolved shape entrypoints", async () => {
    const core = createOcctCore({
      factory: async () => ({}),
    });

    await assert.rejects(
      core.validateRevolvedShapeSpec(createRevolvedShapeSpec()),
      /Loaded OCCT module does not expose ValidateRevolvedShapeSpec\(\)\./,
    );
    await assert.rejects(
      core.buildRevolvedShape(createRevolvedShapeSpec()),
      /Loaded OCCT module does not expose BuildRevolvedShape\(\)\./,
    );
    await assert.rejects(
      core.openExactRevolvedShape(createRevolvedShapeSpec()),
      /Loaded OCCT module does not expose OpenExactRevolvedShape\(\)\./,
    );
  });

  it("fails explicitly when the loaded module does not expose shared profile or generated extruded shape entrypoints", async () => {
    const core = createOcctCore({
      factory: async () => ({}),
    });

    await assert.rejects(
      core.validateProfile2DSpec(createProfile2DSpec()),
      /Loaded OCCT module does not expose ValidateProfile2DSpec\(\)\./,
    );
    await assert.rejects(
      core.validateExtrudedShapeSpec(createExtrudedShapeSpec()),
      /Loaded OCCT module does not expose ValidateExtrudedShapeSpec\(\)\./,
    );
    await assert.rejects(
      core.buildExtrudedShape(createExtrudedShapeSpec()),
      /Loaded OCCT module does not expose BuildExtrudedShape\(\)\./,
    );
    await assert.rejects(
      core.openExactExtrudedShape(createExtrudedShapeSpec()),
      /Loaded OCCT module does not expose OpenExactExtrudedShape\(\)\./,
    );
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
