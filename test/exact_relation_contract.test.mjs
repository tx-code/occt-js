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

function getExactRef(result, geometryIndex, kind, elementId, transform = IDENTITY_MATRIX) {
  return {
    exactModelId: result.exactModelId,
    exactShapeHandle: result.exactGeometryBindings[geometryIndex].exactShapeHandle,
    kind,
    elementId,
    transform,
  };
}

function classifyExactRelation(module, refA, refB) {
  return module.ClassifyExactRelation(
    refA.exactModelId,
    refA.exactShapeHandle,
    refA.kind,
    refA.elementId,
    refB.exactShapeHandle,
    refB.kind,
    refB.elementId,
    refA.transform ?? IDENTITY_MATRIX,
    refB.transform ?? IDENTITY_MATRIX,
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

function translationMatrix(offset) {
  return [
    1, 0, 0, 0,
    0, 1, 0, 0,
    0, 0, 1, 0,
    offset[0], offset[1], offset[2], 1,
  ];
}

function choosePlanarOffset(axisDirection, distance) {
  const candidates = [
    [1, 0, 0],
    [0, 1, 0],
    [0, 0, 1],
  ];
  for (const candidate of candidates) {
    const projected = subtractVectors(candidate, axisDirection.map((value) => value * dot(candidate, axisDirection)));
    const normalized = normalize(projected);
    if (Math.hypot(...normalized) > 0) {
      return normalized.map((value) => value * distance);
    }
  }
  return [distance, 0, 0];
}

function getApproxEdgeDirection(edge) {
  const pointValues = Array.from(edge.points);
  return normalize([
    pointValues[3] - pointValues[0],
    pointValues[4] - pointValues[1],
    pointValues[5] - pointValues[2],
  ]);
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

function assertRelationFrame(frame) {
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
}

function assertRelationAnchors(anchors, minimumCount = 2) {
  assert.ok(Array.isArray(anchors), "anchors should be an array");
  assert.ok(anchors.length >= minimumCount, `anchors should have at least ${minimumCount} entries`);
  for (const anchor of anchors) {
    assert.ok(anchor && typeof anchor === "object");
    assert.equal(typeof anchor.role, "string");
    assert.ok(Array.isArray(anchor.point) && anchor.point.length === 3);
  }
}

function assertDirectionVector(direction, label) {
  assert.ok(Array.isArray(direction) && direction.length === 3, `${label} should be a 3D vector`);
  assert.ok(Math.abs(Math.hypot(...direction) - 1) < 1e-6, `${label} should be normalized`);
}

function findConcentricCircleCylinderPair(module, result) {
  for (let geometryIndex = 0; geometryIndex < result.geometries.length; geometryIndex += 1) {
    const geometry = result.geometries[geometryIndex];
    const exactShapeHandle = result.exactGeometryBindings[geometryIndex].exactShapeHandle;
    const circleEdges = [];
    const cylinderFaces = [];

    for (const edge of geometry.edges ?? []) {
      const family = module.GetExactGeometryType(result.exactModelId, exactShapeHandle, "edge", edge.id);
      if (family?.ok === true && family.family === "circle") {
        circleEdges.push(edge.id);
      }
    }

    for (const face of geometry.faces ?? []) {
      const family = module.GetExactGeometryType(result.exactModelId, exactShapeHandle, "face", face.id);
      if (family?.ok === true && family.family === "cylinder") {
        cylinderFaces.push(face.id);
      }
    }

    for (const edgeId of circleEdges) {
      const circleCenter = module.MeasureExactCenter(result.exactModelId, exactShapeHandle, "edge", edgeId);
      const circleRadius = module.MeasureExactRadius(result.exactModelId, exactShapeHandle, "edge", edgeId);
      if (circleCenter?.ok !== true || circleRadius?.ok !== true) {
        continue;
      }

      for (const faceId of cylinderFaces) {
        const cylinderCenter = module.MeasureExactCenter(result.exactModelId, exactShapeHandle, "face", faceId);
        const cylinderRadius = module.MeasureExactRadius(result.exactModelId, exactShapeHandle, "face", faceId);
        if (cylinderCenter?.ok !== true || cylinderRadius?.ok !== true) {
          continue;
        }

        const centerDelta = Math.hypot(
          circleCenter.localCenter[0] - cylinderCenter.localCenter[0],
          circleCenter.localCenter[1] - cylinderCenter.localCenter[1],
          circleCenter.localCenter[2] - cylinderCenter.localCenter[2],
        );
        const axisAlignment = Math.abs(dot(circleCenter.localAxisDirection, cylinderCenter.localAxisDirection));
        if (centerDelta <= 1e-6 && axisAlignment >= 0.999999 && Math.abs(circleRadius.radius - cylinderRadius.radius) <= 1e-6) {
          return {
            circleRef: getExactRef(result, geometryIndex, "edge", edgeId),
            cylinderRef: getExactRef(result, geometryIndex, "face", faceId),
            radius: circleRadius.radius,
            axisDirection: circleCenter.localAxisDirection,
          };
        }
      }
    }
  }

  return null;
}

function findCircularQueryRef(module, result) {
  for (let geometryIndex = 0; geometryIndex < result.geometries.length; geometryIndex += 1) {
    const geometry = result.geometries[geometryIndex];
    const exactShapeHandle = result.exactGeometryBindings[geometryIndex].exactShapeHandle;
    for (const edge of geometry.edges ?? []) {
      const family = module.GetExactGeometryType(result.exactModelId, exactShapeHandle, "edge", edge.id);
      if (family?.ok === true && family.family === "circle") {
        const radius = module.MeasureExactRadius(result.exactModelId, exactShapeHandle, "edge", edge.id);
        if (radius?.ok === true) {
          return {
            ref: getExactRef(result, geometryIndex, "edge", edge.id),
            radius: radius.radius,
            axisDirection: radius.localAxisDirection,
          };
        }
      }
    }
  }
  return null;
}

test("exact relation classifier returns parallel and perpendicular with supporting geometry for analytic pairs", async () => {
  const module = await createModule();
  const stepBytes = await loadFixture("simple_part.step");
  const result = module.OpenExactStepModel(stepBytes, {});

  assert.equal(result?.success, true);
  const geometry = result.geometries[0];

  const parallelEdges = findEdgePair(geometry, (left, right) => {
    const leftDirection = getApproxEdgeDirection(left);
    const rightDirection = getApproxEdgeDirection(right);
    return Math.abs(Math.abs(dot(leftDirection, rightDirection)) - 1) < 1e-6;
  });
  const perpendicularEdges = findEdgePair(geometry, (left, right) => {
    const leftDirection = getApproxEdgeDirection(left);
    const rightDirection = getApproxEdgeDirection(right);
    return Math.abs(dot(leftDirection, rightDirection)) < 1e-6;
  });

  assert.ok(parallelEdges, "simple_part.step should expose a pair of parallel line edges");
  assert.ok(perpendicularEdges, "simple_part.step should expose a pair of perpendicular line edges");

  const parallel = classifyExactRelation(
    module,
    getExactRef(result, 0, "edge", parallelEdges[0].id),
    getExactRef(result, 0, "edge", parallelEdges[1].id),
  );
  const perpendicular = classifyExactRelation(
    module,
    getExactRef(result, 0, "edge", perpendicularEdges[0].id),
    getExactRef(result, 0, "edge", perpendicularEdges[1].id),
  );

  assert.equal(parallel?.ok, true);
  assert.equal(parallel?.kind, "parallel");
  assertDirectionVector(parallel.directionA, "parallel.directionA");
  assertDirectionVector(parallel.directionB, "parallel.directionB");
  assertRelationFrame(parallel.frame);
  assertRelationAnchors(parallel.anchors, 2);

  assert.equal(perpendicular?.ok, true);
  assert.equal(perpendicular?.kind, "perpendicular");
  assertDirectionVector(perpendicular.directionA, "perpendicular.directionA");
  assertDirectionVector(perpendicular.directionB, "perpendicular.directionB");
  assertRelationFrame(perpendicular.frame);
  assertRelationAnchors(perpendicular.anchors, 2);
});

test("exact relation classifier returns concentric and tangent for supported analytic rotational pairs", async () => {
  const module = await createModule();
  const brepBytes = await loadFixture("as1_pe_203.brep");
  const result = module.OpenExactBrepModel(brepBytes, {});

  assert.equal(result?.success, true);
  const concentricPair = findConcentricCircleCylinderPair(module, result);
  const circularQuery = findCircularQueryRef(module, result);

  assert.ok(concentricPair, "as1_pe_203.brep should expose a circle-cylinder concentric pair");
  assert.ok(circularQuery, "as1_pe_203.brep should expose at least one circle exact ref");

  const concentric = classifyExactRelation(module, concentricPair.circleRef, concentricPair.cylinderRef);
  const tangentOffset = choosePlanarOffset(circularQuery.axisDirection, circularQuery.radius * 2);
  const tangent = classifyExactRelation(
    module,
    circularQuery.ref,
    { ...circularQuery.ref, transform: translationMatrix(tangentOffset) },
  );

  assert.equal(concentric?.ok, true);
  assert.equal(concentric?.kind, "concentric");
  assert.ok(Array.isArray(concentric.center) && concentric.center.length === 3);
  assertDirectionVector(concentric.axisDirection, "concentric.axisDirection");
  assertRelationFrame(concentric.frame);
  assertRelationAnchors(concentric.anchors, 2);

  assert.equal(tangent?.ok, true);
  assert.equal(tangent?.kind, "tangent");
  assert.ok(Array.isArray(tangent.tangentPoint) && tangent.tangentPoint.length === 3);
  assertDirectionVector(tangent.axisDirection, "tangent.axisDirection");
  assertRelationFrame(tangent.frame);
  assertRelationAnchors(tangent.anchors, 3);
});

test("exact relation classifier returns none for valid analytic pairs with no supported relation", async () => {
  const module = await createModule();
  const brepBytes = await loadFixture("as1_pe_203.brep");
  const result = module.OpenExactBrepModel(brepBytes, {});

  assert.equal(result?.success, true);
  const circularQuery = findCircularQueryRef(module, result);

  assert.ok(circularQuery, "as1_pe_203.brep should expose at least one circle exact ref");

  const none = classifyExactRelation(
    module,
    circularQuery.ref,
    { ...circularQuery.ref, transform: translationMatrix(choosePlanarOffset(circularQuery.axisDirection, circularQuery.radius * 3)) },
  );

  assert.deepEqual(none, {
    ok: true,
    kind: "none",
  });
});

test("exact relation classifier failures stay explicit for invalid ids and unsupported geometry", async () => {
  const module = await createModule();
  const stepBytes = await loadFixture("simple_part.step");
  const result = module.OpenExactStepModel(stepBytes, {});

  assert.equal(result?.success, true);
  const geometry = result.geometries[0];
  const lineEdge = geometry.edges[0];
  const planeFace = geometry.faces[0];

  assert.ok(lineEdge, "simple_part.step should expose at least one line edge");
  assert.ok(planeFace, "simple_part.step should expose at least one plane face");

  assert.deepEqual(
    classifyExactRelation(
      module,
      getExactRef(result, 0, "edge", 9999),
      getExactRef(result, 0, "edge", lineEdge.id),
    ),
    {
      ok: false,
      code: "invalid-id",
      message: "Requested edge id is out of range for this exact geometry.",
    },
  );

  const unsupported = classifyExactRelation(
    module,
    getExactRef(result, 0, "face", planeFace.id),
    getExactRef(result, 0, "edge", lineEdge.id),
  );

  assert.equal(unsupported?.ok, false);
  assert.equal(unsupported?.code, "unsupported-geometry");
  assert.equal(typeof unsupported?.message, "string");
  assert.ok(unsupported.message.length > 0);
});
