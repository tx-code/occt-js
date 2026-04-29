import test from "node:test";
import assert from "node:assert/strict";
import {
  createExactEdgeRef,
  createExactElementRef,
  createExactFaceRef,
  normalizeExactOpenResult,
  resolveExactElementRef,
} from "../src/index.js";

const IDENTITY_MATRIX = [
  1, 0, 0, 0,
  0, 1, 0, 0,
  0, 0, 1, 0,
  0, 0, 0, 1,
];

function makeRawExactOpenResult() {
  return {
    success: true,
    sourceFormat: "step",
    exactModelId: 17,
    exactGeometryBindings: [{ exactShapeHandle: 33 }],
    rootNodes: [
      {
        id: "root",
        name: "Root",
        isAssembly: true,
        transform: IDENTITY_MATRIX,
        meshes: [],
        children: [
          {
            id: "occ-a",
            name: "Occurrence A",
            isAssembly: false,
            transform: [
              1, 0, 0, 0,
              0, 1, 0, 0,
              0, 0, 1, 0,
              10, 0, 0, 1,
            ],
            meshes: [0],
            children: [],
          },
          {
            id: "occ-b",
            name: "Occurrence B",
            isAssembly: false,
            transform: [
              1, 0, 0, 0,
              0, 1, 0, 0,
              0, 0, 1, 0,
              -10, 0, 0, 1,
            ],
            meshes: [0],
            children: [],
          },
        ],
      },
    ],
    geometries: [
      {
        name: "shared-geometry",
        color: null,
        positions: new Float32Array([
          0, 0, 0,
          1, 0, 0,
          0, 1, 0,
        ]),
        normals: new Float32Array([
          0, 0, 1,
          0, 0, 1,
          0, 0, 1,
        ]),
        indices: new Uint32Array([0, 1, 2]),
        faces: [{ id: 7, name: "Face 7", firstIndex: 0, indexCount: 3, edgeIndices: [0], color: null }],
        edges: [{ id: 5, name: "Edge 5", points: new Float32Array([0, 0, 0, 1, 0, 0]), ownerFaceIds: [7], isFreeEdge: false, color: null }],
        vertices: [{ id: 3, position: [0, 0, 0] }],
        triangleToFaceMap: new Int32Array([7]),
      },
    ],
    materials: [],
    warnings: [],
    stats: {
      rootCount: 1,
      nodeCount: 3,
      partCount: 2,
      geometryCount: 1,
      materialCount: 1,
      triangleCount: 1,
      reusedInstanceCount: 1,
    },
  };
}

test("createExactElementRef builds a clean geometry-scoped ref without assembly node ids", () => {
  const exactModel = normalizeExactOpenResult(makeRawExactOpenResult(), {
    sourceFileName: "fixture.step",
  });

  const resolved = createExactElementRef(exactModel, {
    geometryId: "geo_0",
    kind: "face",
    elementId: 7,
  });

  assert.deepEqual(resolved, {
    ok: true,
    exactModelId: 17,
    exactShapeHandle: 33,
    geometryId: "geo_0",
    kind: "face",
    elementId: 7,
    transform: IDENTITY_MATRIX,
  });
  assert.equal("nodeId" in resolved, false);
});

test("createExactElementRef accepts exactShapeHandle and caller transform directly", () => {
  const exactModel = normalizeExactOpenResult(makeRawExactOpenResult(), {
    sourceFileName: "fixture.step",
  });
  const transform = [
    1, 0, 0, 0,
    0, 1, 0, 0,
    0, 0, 1, 0,
    4, 5, 6, 1,
  ];

  assert.deepEqual(createExactEdgeRef(exactModel, {
    exactShapeHandle: 33,
    elementId: 5,
    transform,
  }), {
    ok: true,
    exactModelId: 17,
    exactShapeHandle: 33,
    geometryId: "geo_0",
    kind: "edge",
    elementId: 5,
    transform,
  });

  assert.deepEqual(createExactFaceRef(exactModel, {
    exactShapeHandle: 33,
    elementId: 7,
  }), {
    ok: true,
    exactModelId: 17,
    exactShapeHandle: 33,
    geometryId: "geo_0",
    kind: "face",
    elementId: 7,
    transform: IDENTITY_MATRIX,
  });
});

test("resolveExactElementRef returns an occurrence-scoped face ref from normalized model data", () => {
  const exactModel = normalizeExactOpenResult(makeRawExactOpenResult(), {
    sourceFileName: "fixture.step",
  });

  const resolved = resolveExactElementRef(exactModel, {
    nodeId: "occ-a",
    geometryId: "geo_0",
    kind: "face",
    elementId: 7,
  });

  assert.deepEqual(resolved, {
    ok: true,
    exactModelId: 17,
    exactShapeHandle: 33,
    nodeId: "occ-a",
    geometryId: "geo_0",
    kind: "face",
    elementId: 7,
    transform: [
      1, 0, 0, 0,
      0, 1, 0, 0,
      0, 0, 1, 0,
      10, 0, 0, 1,
    ],
  });
});

test("reused geometry instances share exactShapeHandle but keep distinct occurrence context", () => {
  const exactModel = normalizeExactOpenResult(makeRawExactOpenResult(), {
    sourceFileName: "fixture.step",
  });

  const a = resolveExactElementRef(exactModel, {
    nodeId: "occ-a",
    geometryId: "geo_0",
    kind: "face",
    elementId: 7,
  });
  const b = resolveExactElementRef(exactModel, {
    nodeId: "occ-b",
    geometryId: "geo_0",
    kind: "face",
    elementId: 7,
  });

  assert.equal(a.ok, true);
  assert.equal(b.ok, true);
  assert.equal(a.exactShapeHandle, b.exactShapeHandle);
  assert.notEqual(a.nodeId, b.nodeId);
  assert.notDeepEqual(a.transform, b.transform);
});

test("invalid geometry or topology ids fail with explicit ref-resolution codes", () => {
  const exactModel = normalizeExactOpenResult(makeRawExactOpenResult(), {
    sourceFileName: "fixture.step",
  });

  assert.deepEqual(createExactElementRef(exactModel, {
    kind: "face",
    elementId: 7,
  }), {
    ok: false,
    code: "invalid-id",
    message: "Exact ref requires geometryId or exactShapeHandle.",
  });
  assert.deepEqual(createExactElementRef(exactModel, {
    geometryId: "geo_0",
    exactShapeHandle: 99,
    kind: "face",
    elementId: 7,
  }), {
    ok: false,
    code: "exact-shape-mismatch",
    message: 'geometryId "geo_0" is bound to exactShapeHandle 33, not 99.',
  });
  assert.deepEqual(createExactElementRef(exactModel, {
    exactShapeHandle: 99,
    kind: "face",
    elementId: 7,
  }), {
    ok: false,
    code: "invalid-id",
    message: "Unknown exactShapeHandle: 99.",
  });
  assert.deepEqual(createExactElementRef(exactModel, {
    geometryId: "geo_0",
    kind: "wire",
    elementId: 7,
  }), {
    ok: false,
    code: "invalid-id",
    message: 'Unsupported exact element kind: "wire".',
  });
  assert.deepEqual(resolveExactElementRef(exactModel, {
    nodeId: "occ-a",
    geometryId: "geo-missing",
    kind: "face",
    elementId: 7,
  }), {
    ok: false,
    code: "invalid-id",
    message: 'Unknown geometryId: "geo-missing".',
  });
  assert.deepEqual(resolveExactElementRef(exactModel, {
    nodeId: "occ-a",
    geometryId: "geo_0",
    kind: "face",
    elementId: 999,
  }), {
    ok: false,
    code: "invalid-id",
    message: 'Unknown face id 999 on geometry "geo_0".',
  });
  assert.deepEqual(resolveExactElementRef(exactModel, {
    nodeId: "root",
    geometryId: "geo_0",
    kind: "face",
    elementId: 7,
  }), {
    ok: false,
    code: "occurrence-mismatch",
    message: 'Node "root" does not directly reference geometry "geo_0".',
  });
  assert.deepEqual(resolveExactElementRef({
    ...exactModel,
    exactModelId: 0,
  }, {
    nodeId: "occ-a",
    geometryId: "geo_0",
    kind: "face",
    elementId: 7,
  }), {
    ok: false,
    code: "invalid-handle",
    message: "Exact model handle is missing or invalid.",
  });
});
