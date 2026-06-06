import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { loadOcctFactory } from "./load_occt_factory.mjs";

const IDENTITY_MATRIX = [
  1, 0, 0, 0,
  0, 1, 0, 0,
  0, 0, 1, 0,
  0, 0, 0, 1,
];

const factory = loadOcctFactory();

async function loadFixture(name) {
  return new Uint8Array(await readFile(new URL(`./${name}`, import.meta.url)));
}

async function createModule() {
  return factory();
}

function getExactRef(result, geometryIndex, kind, elementId) {
  return {
    exactModelId: result.exactModelId,
    exactShapeHandle: result.exactGeometryBindings[geometryIndex].exactShapeHandle,
    kind,
    elementId,
  };
}

function measureExactDistance(module, refA, refB, transformA = IDENTITY_MATRIX, transformB = IDENTITY_MATRIX) {
  return module.MeasureExactDistance(
    refA.exactModelId,
    refA.exactShapeHandle,
    refA.kind,
    refA.elementId,
    refB.exactShapeHandle,
    refB.kind,
    refB.elementId,
    transformA,
    transformB,
  );
}

function measureExactAngle(module, refA, refB, transformA = IDENTITY_MATRIX, transformB = IDENTITY_MATRIX) {
  return module.MeasureExactAngle(
    refA.exactModelId,
    refA.exactShapeHandle,
    refA.kind,
    refA.elementId,
    refB.exactShapeHandle,
    refB.kind,
    refB.elementId,
    transformA,
    transformB,
  );
}

function suggestExactAnglePlacement(module, refA, refB, transformA = IDENTITY_MATRIX, transformB = IDENTITY_MATRIX) {
  return module.SuggestExactAnglePlacement(
    refA.exactModelId,
    refA.exactShapeHandle,
    refA.kind,
    refA.elementId,
    refB.exactShapeHandle,
    refB.kind,
    refB.elementId,
    transformA,
    transformB,
  );
}

function measureExactThickness(module, refA, refB, transformA = IDENTITY_MATRIX, transformB = IDENTITY_MATRIX) {
  return module.MeasureExactThickness(
    refA.exactModelId,
    refA.exactShapeHandle,
    refA.kind,
    refA.elementId,
    refB.exactShapeHandle,
    refB.kind,
    refB.elementId,
    transformA,
    transformB,
  );
}

function getFaceTrianglePoints(geometry, face) {
  const triangleIndices = Array.from(geometry.indices.slice(face.firstIndex, face.firstIndex + 3));
  return triangleIndices.map((vertexIndex) => {
    const base = vertexIndex * 3;
    return [
      geometry.positions[base],
      geometry.positions[base + 1],
      geometry.positions[base + 2],
    ];
  });
}

function subtractVectors(left, right) {
  return left.map((value, index) => value - right[index]);
}

function dot(left, right) {
  return left[0] * right[0] + left[1] * right[1] + left[2] * right[2];
}

function cross(left, right) {
  return [
    left[1] * right[2] - left[2] * right[1],
    left[2] * right[0] - left[0] * right[2],
    left[0] * right[1] - left[1] * right[0],
  ];
}

function normalize(vector) {
  const length = Math.hypot(vector[0], vector[1], vector[2]);
  return length > 0 ? vector.map((value) => value / length) : [0, 0, 0];
}

function getFaceCentroid(geometry, face) {
  const points = getFaceTrianglePoints(geometry, face);
  return points[0].map((_, axis) => (
    (points[0][axis] + points[1][axis] + points[2][axis]) / 3
  ));
}

function getApproxFaceNormal(geometry, face) {
  const points = getFaceTrianglePoints(geometry, face);
  return normalize(cross(
    subtractVectors(points[1], points[0]),
    subtractVectors(points[2], points[0]),
  ));
}

function getExactFaceNormal(module, result, geometry, face, geometryIndex = 0) {
  const normal = module.EvaluateExactFaceNormal(
    result.exactModelId,
    result.exactGeometryBindings[geometryIndex].exactShapeHandle,
    "face",
    face.id,
    getFaceCentroid(geometry, face),
  );
  assert.equal(normal?.ok, true);
  return normal.localNormal;
}

function tryGetExactFaceNormal(module, result, geometry, face, geometryIndex = 0) {
  const normal = module.EvaluateExactFaceNormal(
    result.exactModelId,
    result.exactGeometryBindings[geometryIndex].exactShapeHandle,
    "face",
    face.id,
    getFaceCentroid(geometry, face),
  );
  return normal?.ok === true ? normal.localNormal : undefined;
}

function getApproxEdgeDirection(edge) {
  const pointValues = Array.from(edge.points);
  return normalize([
    pointValues[3] - pointValues[0],
    pointValues[4] - pointValues[1],
    pointValues[5] - pointValues[2],
  ]);
}

function findFacePair(geometry, predicate) {
  for (let leftIndex = 0; leftIndex < geometry.faces.length; leftIndex += 1) {
    for (let rightIndex = leftIndex + 1; rightIndex < geometry.faces.length; rightIndex += 1) {
      const left = geometry.faces[leftIndex];
      const right = geometry.faces[rightIndex];
      if (predicate(left, right)) {
        return [left, right];
      }
    }
  }
  return null;
}

function findEdgePair(geometry, predicate) {
  for (let leftIndex = 0; leftIndex < geometry.edges.length; leftIndex += 1) {
    for (let rightIndex = leftIndex + 1; rightIndex < geometry.edges.length; rightIndex += 1) {
      const left = geometry.edges[leftIndex];
      const right = geometry.edges[rightIndex];
      if (predicate(left, right)) {
        return [left, right];
      }
    }
  }
  return null;
}

function findSeparatedParallelFacePair(module, result, geometry) {
  const faceNormals = new Map(geometry.faces.map((face) => [face.id, getExactFaceNormal(module, result, geometry, face)]));
  return findFacePair(geometry, (left, right) => {
    const leftNormal = faceNormals.get(left.id);
    const rightNormal = faceNormals.get(right.id);
    if (Math.abs(Math.abs(dot(leftNormal, rightNormal)) - 1) >= 1e-6) {
      return false;
    }
    const distance = measureExactDistance(
      module,
      getExactRef(result, 0, "face", left.id),
      getExactRef(result, 0, "face", right.id),
    );
    return distance?.ok === true && distance.value > 0;
  });
}

function getExactGeometryFamily(module, result, geometryIndex, kind, elementId) {
  const family = module.GetExactGeometryType(
    result.exactModelId,
    result.exactGeometryBindings[geometryIndex].exactShapeHandle,
    kind,
    elementId,
  );
  return family?.ok === true ? family.family : undefined;
}

async function findMixedLinePlaneAnglePair(module) {
  const fixtures = [
    { name: "simple_part.step", opener: "OpenExactStepModel" },
    { name: "as1_pe_203.brep", opener: "OpenExactBrepModel" },
  ];

  for (const fixture of fixtures) {
    const bytes = await loadFixture(fixture.name);
    const result = module[fixture.opener](bytes, {});
    assert.equal(result?.success, true);
    for (let geometryIndex = 0; geometryIndex < result.geometries.length; geometryIndex += 1) {
      const geometry = result.geometries[geometryIndex];
      const lineEdges = geometry.edges.filter((edge) => (
        getExactGeometryFamily(module, result, geometryIndex, "edge", edge.id) === "line"
      ));
      const planeFaces = geometry.faces.filter((face) => (
        getExactGeometryFamily(module, result, geometryIndex, "face", face.id) === "plane"
      ));

      for (const edge of lineEdges) {
        const edgeDirection = getApproxEdgeDirection(edge);
        for (const face of planeFaces) {
          const faceNormal = tryGetExactFaceNormal(
            module,
            result,
            geometry,
            face,
            geometryIndex,
          );
          if (!faceNormal) {
            continue;
          }
          const normalDot = Math.abs(dot(edgeDirection, faceNormal));
          if (normalDot <= 1e-6) {
            continue;
          }
          return {
            edgeRef: getExactRef(result, geometryIndex, "edge", edge.id),
            expectedAngle: Math.asin(Math.min(1, normalDot)),
            faceRef: getExactRef(result, geometryIndex, "face", face.id),
            fixture: fixture.name,
          };
        }
      }
    }
  }

  return undefined;
}

async function findCircleSurfaceAnglePair(module) {
  const bytes = await loadFixture("as1_pe_203.brep");
  const result = module.OpenExactBrepModel(bytes, {});
  assert.equal(result?.success, true);

  for (let geometryIndex = 0; geometryIndex < result.geometries.length; geometryIndex += 1) {
    const geometry = result.geometries[geometryIndex];
    const facesById = new Map(geometry.faces.map((face) => [face.id, face]));
    const circleEdges = geometry.edges.filter((edge) => (
      getExactGeometryFamily(module, result, geometryIndex, "edge", edge.id) === "circle"
      && Array.isArray(edge.ownerFaceIds)
    ));

    for (const edge of circleEdges) {
      for (const ownerFaceId of edge.ownerFaceIds) {
        const face = facesById.get(ownerFaceId);
        if (!face) {
          continue;
        }
        const faceFamily = getExactGeometryFamily(
          module,
          result,
          geometryIndex,
          "face",
          face.id,
        );
        if (faceFamily !== "plane" && faceFamily !== "cylinder") {
          continue;
        }
        return {
          edgeRef: getExactRef(result, geometryIndex, "edge", edge.id),
          faceFamily,
          faceRef: getExactRef(result, geometryIndex, "face", face.id),
        };
      }
    }
  }

  return undefined;
}

test("exact distance queries return attach points and working plane from retained exact refs", async () => {
  const module = await createModule();
  const stepBytes = await loadFixture("simple_part.step");
  const result = module.OpenExactStepModel(stepBytes, {});

  assert.equal(result?.success, true);
  const geometry = result.geometries[0];
  const facePair = findSeparatedParallelFacePair(module, result, geometry);

  assert.ok(facePair, "simple_part.step should expose a pair of separated parallel planar faces");

  const distance = measureExactDistance(
    module,
    getExactRef(result, 0, "face", facePair[0].id),
    getExactRef(result, 0, "face", facePair[1].id),
  );

  assert.equal(distance?.ok, true);
  assert.equal(typeof distance?.value, "number");
  assert.ok(distance.value > 0);
  assert.ok(Array.isArray(distance?.pointA) && distance.pointA.length === 3);
  assert.ok(Array.isArray(distance?.pointB) && distance.pointB.length === 3);
  assert.ok(Array.isArray(distance?.workingPlaneOrigin) && distance.workingPlaneOrigin.length === 3);
  assert.ok(Array.isArray(distance?.workingPlaneNormal) && distance.workingPlaneNormal.length === 3);
});

test("exact angle queries return origin directions and working plane for linear edges or planar faces", async () => {
  const module = await createModule();
  const stepBytes = await loadFixture("simple_part.step");
  const result = module.OpenExactStepModel(stepBytes, {});

  assert.equal(result?.success, true);
  const geometry = result.geometries[0];

  const edgePair = findEdgePair(geometry, (left, right) => {
    const leftDirection = getApproxEdgeDirection(left);
    const rightDirection = getApproxEdgeDirection(right);
    return Math.abs(dot(leftDirection, rightDirection)) < 1e-6;
  });

  assert.ok(edgePair, "simple_part.step should expose a pair of perpendicular line edges");

  const angle = measureExactAngle(
    module,
    getExactRef(result, 0, "edge", edgePair[0].id),
    getExactRef(result, 0, "edge", edgePair[1].id),
  );

  assert.equal(angle?.ok, true);
  assert.equal(typeof angle?.value, "number");
  assert.ok(Array.isArray(angle?.origin) && angle.origin.length === 3);
  assert.ok(Array.isArray(angle?.directionA) && angle.directionA.length === 3);
  assert.ok(Array.isArray(angle?.directionB) && angle.directionB.length === 3);
  assert.ok(Array.isArray(angle?.pointA) && angle.pointA.length === 3);
  assert.ok(Array.isArray(angle?.pointB) && angle.pointB.length === 3);
  assert.ok(Array.isArray(angle?.workingPlaneOrigin) && angle.workingPlaneOrigin.length === 3);
  assert.ok(Array.isArray(angle?.workingPlaneNormal) && angle.workingPlaneNormal.length === 3);
});

test("exact angle queries support mixed linear edge and planar face pairs", async () => {
  const module = await createModule();
  const pair = await findMixedLinePlaneAnglePair(module);

  assert.ok(pair, "fixtures should expose a non-parallel line/plane pair");

  const faceEdgeAngle = measureExactAngle(module, pair.faceRef, pair.edgeRef);
  assert.equal(faceEdgeAngle?.ok, true, `${pair.fixture} face/edge mixed angle should succeed`);
  assert.equal(typeof faceEdgeAngle?.value, "number");
  assert.ok(Math.abs(faceEdgeAngle.value - pair.expectedAngle) < 1e-6);
  assert.ok(Array.isArray(faceEdgeAngle?.origin) && faceEdgeAngle.origin.length === 3);
  assert.ok(Array.isArray(faceEdgeAngle?.directionA) && faceEdgeAngle.directionA.length === 3);
  assert.ok(Array.isArray(faceEdgeAngle?.directionB) && faceEdgeAngle.directionB.length === 3);
  assert.ok(Array.isArray(faceEdgeAngle?.pointA) && faceEdgeAngle.pointA.length === 3);
  assert.ok(Array.isArray(faceEdgeAngle?.pointB) && faceEdgeAngle.pointB.length === 3);
  assert.ok(Array.isArray(faceEdgeAngle?.workingPlaneOrigin) && faceEdgeAngle.workingPlaneOrigin.length === 3);
  assert.ok(Array.isArray(faceEdgeAngle?.workingPlaneNormal) && faceEdgeAngle.workingPlaneNormal.length === 3);

  const edgeFaceAngle = measureExactAngle(module, pair.edgeRef, pair.faceRef);
  assert.equal(edgeFaceAngle?.ok, true, `${pair.fixture} edge/face mixed angle should succeed`);
  assert.ok(Math.abs(edgeFaceAngle.value - pair.expectedAngle) < 1e-6);
});

test("exact angle queries support circular edge and analytic owner face pairs", async () => {
  const module = await createModule();
  const pair = await findCircleSurfaceAnglePair(module);

  assert.ok(pair, "as1_pe_203.brep should expose a circle edge with a plane or cylinder owner face");

  const faceEdgeAngle = measureExactAngle(module, pair.faceRef, pair.edgeRef);
  assert.equal(
    faceEdgeAngle?.ok,
    true,
    `circle/${pair.faceFamily} owner angle should succeed`,
  );
  assert.equal(typeof faceEdgeAngle?.value, "number");
  assert.ok(Math.abs(faceEdgeAngle.value) < 1e-6);
  assert.ok(Array.isArray(faceEdgeAngle?.origin) && faceEdgeAngle.origin.length === 3);
  assert.ok(Array.isArray(faceEdgeAngle?.directionA) && faceEdgeAngle.directionA.length === 3);
  assert.ok(Array.isArray(faceEdgeAngle?.directionB) && faceEdgeAngle.directionB.length === 3);
  assert.ok(Array.isArray(faceEdgeAngle?.pointA) && faceEdgeAngle.pointA.length === 3);
  assert.ok(Array.isArray(faceEdgeAngle?.pointB) && faceEdgeAngle.pointB.length === 3);
  assert.ok(Array.isArray(faceEdgeAngle?.workingPlaneOrigin) && faceEdgeAngle.workingPlaneOrigin.length === 3);
  assert.ok(Array.isArray(faceEdgeAngle?.workingPlaneNormal) && faceEdgeAngle.workingPlaneNormal.length === 3);

  const faceEdgePlacement = suggestExactAnglePlacement(module, pair.faceRef, pair.edgeRef);
  assert.equal(faceEdgePlacement?.ok, true);
  assert.ok(Array.isArray(faceEdgePlacement?.anchors) && faceEdgePlacement.anchors.length >= 2);
  assert.ok(Array.isArray(faceEdgePlacement?.frame?.origin) && faceEdgePlacement.frame.origin.length === 3);

  const edgeFaceAngle = measureExactAngle(module, pair.edgeRef, pair.faceRef);
  assert.equal(edgeFaceAngle?.ok, true);
  assert.ok(Math.abs(edgeFaceAngle.value) < 1e-6);
});

test("exact thickness queries use plane distance for parallel planar face pairs", async () => {
  const module = await createModule();
  const stepBytes = await loadFixture("simple_part.step");
  const result = module.OpenExactStepModel(stepBytes, {});

  assert.equal(result?.success, true);
  const geometry = result.geometries[0];
  const facePair = findSeparatedParallelFacePair(module, result, geometry);

  assert.ok(facePair, "simple_part.step should expose a pair of separated parallel planar faces");

  const thickness = measureExactThickness(
    module,
    getExactRef(result, 0, "face", facePair[0].id),
    getExactRef(result, 0, "face", facePair[1].id),
  );

  assert.equal(thickness?.ok, true);
  assert.equal(typeof thickness?.value, "number");
  assert.ok(thickness.value > 0);
  assert.ok(Array.isArray(thickness?.pointA) && thickness.pointA.length === 3);
  assert.ok(Array.isArray(thickness?.pointB) && thickness.pointB.length === 3);
  assert.ok(Array.isArray(thickness?.workingPlaneOrigin) && thickness.workingPlaneOrigin.length === 3);
  assert.ok(Array.isArray(thickness?.workingPlaneNormal) && thickness.workingPlaneNormal.length === 3);
});

test("exact angle failures stay explicit for parallel or unsupported geometry", async () => {
  const module = await createModule();
  const stepBytes = await loadFixture("simple_part.step");
  const result = module.OpenExactStepModel(stepBytes, {});

  assert.equal(result?.success, true);
  const geometry = result.geometries[0];
  const planeFace = geometry.faces[0];

  const parallelEdges = findEdgePair(geometry, (left, right) => {
    const leftDirection = getApproxEdgeDirection(left);
    const rightDirection = getApproxEdgeDirection(right);
    if (Math.abs(Math.abs(dot(leftDirection, rightDirection)) - 1) >= 1e-6) {
      return false;
    }
    const distance = measureExactDistance(
      module,
      getExactRef(result, 0, "edge", left.id),
      getExactRef(result, 0, "edge", right.id),
    );
    return distance?.ok === true && distance.value > 0;
  });
  const lineEdge = geometry.edges.find((edge) => Array.isArray(edge.points) || edge.points?.length === 6);
  const vertex = geometry.vertices[0];

  assert.ok(parallelEdges, "simple_part.step should expose a pair of separated parallel line edges");
  assert.ok(planeFace, "simple_part.step should expose at least one plane face");
  assert.ok(lineEdge, "simple_part.step should expose at least one line edge");
  assert.ok(vertex, "simple_part.step should expose at least one vertex");

  assert.deepEqual(
    measureExactAngle(
      module,
      getExactRef(result, 0, "edge", parallelEdges[0].id),
      getExactRef(result, 0, "edge", parallelEdges[1].id),
    ),
    {
      ok: false,
      code: "parallel-geometry",
      message: "Exact angle is not defined for parallel planar faces or collinear linear edges.",
    },
  );

  assert.deepEqual(
    measureExactAngle(
      module,
      getExactRef(result, 0, "face", planeFace.id),
      getExactRef(result, 0, "vertex", vertex.id),
    ),
    {
      ok: false,
      code: "unsupported-geometry",
      message: "Exact angle only supports line/line, plane/plane, mixed line/plane, or circle/plane and circle/cylinder pairs.",
    },
  );
});

test("exact thickness failures stay explicit for nonparallel or unsupported geometry", async () => {
  const module = await createModule();
  const stepBytes = await loadFixture("simple_part.step");
  const result = module.OpenExactStepModel(stepBytes, {});

  assert.equal(result?.success, true);
  const geometry = result.geometries[0];
  const nonParallelFaces = findFacePair(geometry, (left, right) => {
    const leftNormal = getExactFaceNormal(module, result, geometry, left);
    const rightNormal = getExactFaceNormal(module, result, geometry, right);
    return Math.abs(dot(leftNormal, rightNormal)) < 1e-6;
  });
  const lineEdge = geometry.edges[0];

  assert.ok(nonParallelFaces, "simple_part.step should expose a pair of perpendicular planar faces");
  assert.ok(lineEdge, "simple_part.step should expose at least one edge");

  assert.deepEqual(
    measureExactThickness(
      module,
      getExactRef(result, 0, "face", nonParallelFaces[0].id),
      getExactRef(result, 0, "face", nonParallelFaces[1].id),
    ),
    {
      ok: false,
      code: "unsupported-geometry",
      message: "Exact thickness only supports parallel planar face pairs.",
    },
  );

  assert.deepEqual(
    measureExactThickness(
      module,
      getExactRef(result, 0, "face", nonParallelFaces[0].id),
      getExactRef(result, 0, "edge", lineEdge.id),
    ),
    {
      ok: false,
      code: "unsupported-geometry",
      message: "Exact thickness only supports parallel planar face pairs.",
    },
  );
});

test("exact pairwise failures preserve stable codes and messages", async () => {
  const module = await createModule();
  const stepBytes = await loadFixture("simple_part.step");
  const result = module.OpenExactStepModel(stepBytes, {});

  assert.equal(result?.success, true);
  const geometry = result.geometries[0];
  const parallelEdges = findEdgePair(geometry, (left, right) => {
    const leftDirection = getApproxEdgeDirection(left);
    const rightDirection = getApproxEdgeDirection(right);
    if (Math.abs(Math.abs(dot(leftDirection, rightDirection)) - 1) >= 1e-6) {
      return false;
    }
    const distance = measureExactDistance(
      module,
      getExactRef(result, 0, "edge", left.id),
      getExactRef(result, 0, "edge", right.id),
    );
    return distance?.ok === true && distance.value > 0;
  });

  assert.ok(parallelEdges, "simple_part.step should expose a pair of separated parallel line edges");

  assert.deepEqual(
    measureExactDistance(
      module,
      getExactRef(result, 0, "face", 9999),
      getExactRef(result, 0, "face", geometry.faces[0].id),
    ),
    {
      ok: false,
      code: "invalid-id",
      message: "Requested face id is out of range for this exact geometry.",
    },
  );

  assert.deepEqual(
    measureExactAngle(
      module,
      getExactRef(result, 0, "edge", parallelEdges[0].id),
      getExactRef(result, 0, "edge", parallelEdges[1].id),
    ),
    {
      ok: false,
      code: "parallel-geometry",
      message: "Exact angle is not defined for parallel planar faces or collinear linear edges.",
    },
  );

  assert.deepEqual(module.ReleaseExactModel(result.exactModelId), { ok: true });

  assert.deepEqual(
    measureExactDistance(
      module,
      getExactRef(result, 0, "face", geometry.faces[0].id),
      getExactRef(result, 0, "face", geometry.faces[1].id),
    ),
    {
      ok: false,
      code: "released-handle",
      message: "Exact model handle has already been released.",
    },
  );
});
