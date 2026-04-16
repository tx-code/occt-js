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

function suggestExactDistancePlacement(module, refA, refB, transformA = IDENTITY_MATRIX, transformB = IDENTITY_MATRIX) {
  return module.SuggestExactDistancePlacement(
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

function suggestExactThicknessPlacement(module, refA, refB, transformA = IDENTITY_MATRIX, transformB = IDENTITY_MATRIX) {
  return module.SuggestExactThicknessPlacement(
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

function getFaceCentroid(geometry, face) {
  const points = getFaceTrianglePoints(geometry, face);
  return points[0].map((_, axis) => (
    (points[0][axis] + points[1][axis] + points[2][axis]) / 3
  ));
}

function getExactFaceNormal(module, result, geometry, face) {
  const normal = module.EvaluateExactFaceNormal(
    result.exactModelId,
    result.exactGeometryBindings[0].exactShapeHandle,
    "face",
    face.id,
    getFaceCentroid(geometry, face),
  );
  assert.equal(normal?.ok, true);
  return normal.localNormal;
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
    const distance = module.MeasureExactDistance(
      result.exactModelId,
      result.exactGeometryBindings[0].exactShapeHandle,
      "face",
      left.id,
      result.exactGeometryBindings[0].exactShapeHandle,
      "face",
      right.id,
      IDENTITY_MATRIX,
      IDENTITY_MATRIX,
    );
    return distance?.ok === true && distance.value > 0;
  });
}

function assertPlacementFrame(frame) {
  assert.ok(frame && typeof frame === "object");
  for (const key of ["origin", "normal", "xDir", "yDir"]) {
    assert.ok(Array.isArray(frame[key]) && frame[key].length === 3, `${key} should be a 3D vector`);
  }
  assert.ok(Math.abs(Math.hypot(...frame.normal) - 1) < 1e-6);
  assert.ok(Math.abs(Math.hypot(...frame.xDir) - 1) < 1e-6);
  assert.ok(Math.abs(Math.hypot(...frame.yDir) - 1) < 1e-6);
  assert.ok(Math.abs(dot(frame.normal, frame.xDir)) < 1e-6);
  assert.ok(Math.abs(dot(frame.normal, frame.yDir)) < 1e-6);
  assert.ok(Math.abs(dot(frame.xDir, frame.yDir)) < 1e-6);
  const handedness = dot(cross(frame.xDir, frame.yDir), frame.normal);
  assert.ok(handedness > 0.999 || handedness < -0.999);
}

function assertPlacementAnchors(anchors, minimumCount = 2) {
  assert.ok(Array.isArray(anchors), "anchors should be an array");
  assert.ok(anchors.length >= minimumCount, `anchors should have at least ${minimumCount} entries`);
  for (const anchor of anchors) {
    assert.ok(anchor && typeof anchor === "object");
    assert.equal(typeof anchor.role, "string");
    assert.ok(Array.isArray(anchor.point) && anchor.point.length === 3);
  }
}

function findCircularQueryRef(module, result) {
  for (let geometryIndex = 0; geometryIndex < result.geometries.length; geometryIndex += 1) {
    const geometry = result.geometries[geometryIndex];
    for (const edge of geometry.edges ?? []) {
      const family = module.GetExactGeometryType(
        result.exactModelId,
        result.exactGeometryBindings[geometryIndex].exactShapeHandle,
        "edge",
        edge.id,
      );
      if (family?.ok === true && family.family === "circle") {
        return getExactRef(result, geometryIndex, "edge", edge.id);
      }
    }
    for (const face of geometry.faces ?? []) {
      const family = module.GetExactGeometryType(
        result.exactModelId,
        result.exactGeometryBindings[geometryIndex].exactShapeHandle,
        "face",
        face.id,
      );
      if (family?.ok === true && family.family === "cylinder") {
        return getExactRef(result, geometryIndex, "face", face.id);
      }
    }
  }
  return null;
}

test("exact distance placement returns anchors and full frame from retained exact refs", async () => {
  const module = await createModule();
  const stepBytes = await loadFixture("simple_part.step");
  const result = module.OpenExactStepModel(stepBytes, {});

  assert.equal(result?.success, true);
  const geometry = result.geometries[0];
  const facePair = findSeparatedParallelFacePair(module, result, geometry);

  assert.ok(facePair, "simple_part.step should expose a pair of separated parallel planar faces");

  const placement = suggestExactDistancePlacement(
    module,
    getExactRef(result, 0, "face", facePair[0].id),
    getExactRef(result, 0, "face", facePair[1].id),
  );

  assert.equal(placement?.ok, true);
  assert.equal(placement?.kind, "distance");
  assert.equal(typeof placement?.value, "number");
  assert.ok(placement.value > 0);
  assertPlacementFrame(placement.frame);
  assertPlacementAnchors(placement.anchors, 2);
});

test("exact angle placement returns origin directions anchors and frame for supported exact pairs", async () => {
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

  const placement = suggestExactAnglePlacement(
    module,
    getExactRef(result, 0, "edge", edgePair[0].id),
    getExactRef(result, 0, "edge", edgePair[1].id),
  );

  assert.equal(placement?.ok, true);
  assert.equal(placement?.kind, "angle");
  assert.equal(typeof placement?.value, "number");
  assert.ok(Array.isArray(placement?.directionA) && placement.directionA.length === 3);
  assert.ok(Array.isArray(placement?.directionB) && placement.directionB.length === 3);
  assertPlacementFrame(placement.frame);
  assertPlacementAnchors(placement.anchors, 3);
});

test("exact thickness placement returns attach anchors and frame for supported planar pairs", async () => {
  const module = await createModule();
  const stepBytes = await loadFixture("simple_part.step");
  const result = module.OpenExactStepModel(stepBytes, {});

  assert.equal(result?.success, true);
  const geometry = result.geometries[0];
  const facePair = findSeparatedParallelFacePair(module, result, geometry);

  assert.ok(facePair, "simple_part.step should expose a pair of separated parallel planar faces");

  const placement = suggestExactThicknessPlacement(
    module,
    getExactRef(result, 0, "face", facePair[0].id),
    getExactRef(result, 0, "face", facePair[1].id),
  );

  assert.equal(placement?.ok, true);
  assert.equal(placement?.kind, "thickness");
  assert.equal(typeof placement?.value, "number");
  assert.ok(placement.value > 0);
  assertPlacementFrame(placement.frame);
  assertPlacementAnchors(placement.anchors, 2);
});

test("pairwise placement failures stay explicit for unsupported or degenerate geometry", async () => {
  const module = await createModule();
  const stepBytes = await loadFixture("simple_part.step");
  const result = module.OpenExactStepModel(stepBytes, {});

  assert.equal(result?.success, true);
  const geometry = result.geometries[0];
  const planeFace = geometry.faces[0];
  const lineEdge = geometry.edges[0];
  const parallelEdges = findEdgePair(geometry, (left, right) => {
    const leftDirection = getApproxEdgeDirection(left);
    const rightDirection = getApproxEdgeDirection(right);
    if (Math.abs(Math.abs(dot(leftDirection, rightDirection)) - 1) >= 1e-6) {
      return false;
    }
    const distance = module.MeasureExactDistance(
      result.exactModelId,
      result.exactGeometryBindings[0].exactShapeHandle,
      "edge",
      left.id,
      result.exactGeometryBindings[0].exactShapeHandle,
      "edge",
      right.id,
      IDENTITY_MATRIX,
      IDENTITY_MATRIX,
    );
    return distance?.ok === true && distance.value > 0;
  });

  assert.ok(parallelEdges, "simple_part.step should expose a pair of separated parallel line edges");
  assert.ok(planeFace, "simple_part.step should expose at least one plane face");
  assert.ok(lineEdge, "simple_part.step should expose at least one line edge");

  assert.deepEqual(
    suggestExactAnglePlacement(
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
    suggestExactThicknessPlacement(
      module,
      getExactRef(result, 0, "face", planeFace.id),
      getExactRef(result, 0, "edge", lineEdge.id),
    ),
    {
      ok: false,
      code: "unsupported-geometry",
      message: "Exact thickness only supports parallel planar face pairs.",
    },
  );
});

test("exact radius placement returns center anchor axis and frame for supported circular geometry", async () => {
  const module = await createModule();
  const brepBytes = await loadFixture("as1_pe_203.brep");
  const result = module.OpenExactBrepModel(brepBytes, {});

  assert.equal(result?.success, true);
  const queryRef = findCircularQueryRef(module, result);

  assert.ok(queryRef, "as1_pe_203.brep should expose at least one circle or cylinder exact ref");

  const placement = module.SuggestExactRadiusPlacement(
    queryRef.exactModelId,
    queryRef.exactShapeHandle,
    queryRef.kind,
    queryRef.elementId,
  );

  assert.equal(placement?.ok, true);
  assert.equal(placement?.kind, "radius");
  assert.equal(typeof placement?.value, "number");
  assert.ok(placement.value > 0);
  assert.ok(Array.isArray(placement?.axisDirection) && placement.axisDirection.length === 3);
  assertPlacementFrame(placement.frame);
  assertPlacementAnchors(placement.anchors, 2);
  assert.ok(placement.anchors.some((anchor) => anchor.role === "center"));
  assert.ok(placement.anchors.some((anchor) => anchor.role === "anchor"));
});

test("exact diameter placement returns presentation-oriented circular anchors and frame", async () => {
  const module = await createModule();
  const brepBytes = await loadFixture("as1_pe_203.brep");
  const result = module.OpenExactBrepModel(brepBytes, {});

  assert.equal(result?.success, true);
  const queryRef = findCircularQueryRef(module, result);

  assert.ok(queryRef, "as1_pe_203.brep should expose at least one circle or cylinder exact ref");

  const placement = module.SuggestExactDiameterPlacement(
    queryRef.exactModelId,
    queryRef.exactShapeHandle,
    queryRef.kind,
    queryRef.elementId,
  );

  assert.equal(placement?.ok, true);
  assert.equal(placement?.kind, "diameter");
  assert.equal(typeof placement?.value, "number");
  assert.ok(placement.value > 0);
  assert.ok(Array.isArray(placement?.axisDirection) && placement.axisDirection.length === 3);
  assertPlacementFrame(placement.frame);
  assertPlacementAnchors(placement.anchors, 3);
  assert.ok(placement.anchors.filter((anchor) => anchor.role === "anchor").length >= 2);
  assert.ok(placement.anchors.some((anchor) => anchor.role === "center"));
});
