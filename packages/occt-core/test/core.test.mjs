import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { createOcctCore, normalizeOcctFormat, normalizeOcctResult } from "../src/index.js";

const EMPTY_STATS = {
  rootCount: 0,
  nodeCount: 0,
  partCount: 0,
  geometryCount: 0,
  materialCount: 0,
  triangleCount: 0,
  reusedInstanceCount: 0,
};

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
});

describe("createOcctCore", () => {
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
});
