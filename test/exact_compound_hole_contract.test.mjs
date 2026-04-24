import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { loadOcctFactory } from "./load_occt_factory.mjs";

const factory = loadOcctFactory();

async function createModule() {
  return factory();
}

const FIXTURES = {
  counterbore: "freecad_hole_puzzle_counterbore.brep",
  countersink: "freecad_hole_puzzle_countersink.brep",
  unsupported: "as1_pe_203.brep",
};

async function loadFixture(name) {
  return new Uint8Array(await readFile(new URL(`./${name}`, import.meta.url)));
}

function getExactRef(result, geometryIndex, kind, elementId) {
  return {
    exactModelId: result.exactModelId,
    exactShapeHandle: result.exactGeometryBindings[geometryIndex].exactShapeHandle,
    kind,
    elementId,
  };
}

function describeExactCompoundHole(module, ref) {
  return module.DescribeExactCompoundHole(
    ref.exactModelId,
    ref.exactShapeHandle,
    ref.kind,
    ref.elementId,
  );
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

function magnitude(vector) {
  return Math.hypot(vector[0], vector[1], vector[2]);
}

function normalize(vector) {
  const length = magnitude(vector);
  return length > 0 ? vector.map((value) => value / length) : [0, 0, 0];
}

function isParallel(left, right, tolerance = 1e-5) {
  return magnitude(cross(normalize(left), normalize(right))) <= tolerance;
}

function lineDistance(pointOnAxisA, axisA, pointOnAxisB) {
  return magnitude(cross(normalize(axisA), [
    pointOnAxisB[0] - pointOnAxisA[0],
    pointOnAxisB[1] - pointOnAxisA[1],
    pointOnAxisB[2] - pointOnAxisA[2],
  ]));
}

function assertPlacementFrame(frame) {
  assert.ok(frame && typeof frame === "object");
  for (const key of ["origin", "normal", "xDir", "yDir"]) {
    assert.ok(Array.isArray(frame[key]) && frame[key].length === 3, `${key} should be a 3D vector`);
  }
}

async function openExactBrep(module, fixtureName) {
  const bytes = await loadFixture(fixtureName);
  const result = module.OpenExactBrepModel(bytes, {});
  assert.equal(result?.success, true, `${fixtureName} should open as an exact BREP fixture`);
  return result;
}

function collectHoleCylinders(module, result) {
  const cylinders = [];
  for (let geometryIndex = 0; geometryIndex < result.geometries.length; geometryIndex += 1) {
    const geometry = result.geometries[geometryIndex];
    const exactShapeHandle = result.exactGeometryBindings[geometryIndex].exactShapeHandle;
    for (const face of geometry.faces ?? []) {
      const family = module.GetExactGeometryType(result.exactModelId, exactShapeHandle, "face", face.id);
      if (family?.ok !== true || family.family !== "cylinder") {
        continue;
      }

      const hole = module.DescribeExactHole(result.exactModelId, exactShapeHandle, "face", face.id);
      const center = module.MeasureExactCenter(result.exactModelId, exactShapeHandle, "face", face.id);
      const radius = module.MeasureExactRadius(result.exactModelId, exactShapeHandle, "face", face.id);
      if (hole?.ok !== true || center?.ok !== true || radius?.ok !== true) {
        continue;
      }

      cylinders.push({
        geometryIndex,
        faceId: face.id,
        hole,
        center,
        radius,
      });
    }
  }
  return cylinders;
}

function findSupportedCounterboreRef(module, result) {
  const cylinders = collectHoleCylinders(module, result);
  for (let leftIndex = 0; leftIndex < cylinders.length; leftIndex += 1) {
    for (let rightIndex = leftIndex + 1; rightIndex < cylinders.length; rightIndex += 1) {
      const left = cylinders[leftIndex];
      const right = cylinders[rightIndex];
      if (!isParallel(left.center.localAxisDirection, right.center.localAxisDirection)) {
        continue;
      }
      if (lineDistance(left.center.localCenter, left.center.localAxisDirection, right.center.localCenter) > 1e-4) {
        continue;
      }
      if (Math.abs(left.radius.radius - right.radius.radius) <= 1e-4) {
        continue;
      }

      const larger = left.radius.radius > right.radius.radius ? left : right;
      return {
        ref: getExactRef(result, larger.geometryIndex, "face", larger.faceId),
        largerRadius: larger.radius.radius,
        smallerRadius: (larger === left ? right : left).radius.radius,
      };
    }
  }
  return null;
}

function findSupportedCountersinkRef(module, result) {
  const holeCylinders = collectHoleCylinders(module, result);
  for (let geometryIndex = 0; geometryIndex < result.geometries.length; geometryIndex += 1) {
    const geometry = result.geometries[geometryIndex];
    const exactShapeHandle = result.exactGeometryBindings[geometryIndex].exactShapeHandle;
    for (const face of geometry.faces ?? []) {
      const family = module.GetExactGeometryType(result.exactModelId, exactShapeHandle, "face", face.id);
      if (family?.ok !== true || family.family !== "cone") {
        continue;
      }

      const coneCenter = module.MeasureExactCenter(result.exactModelId, exactShapeHandle, "face", face.id);
      if (coneCenter?.ok !== true) {
        continue;
      }

      const radii = [];
      for (const edgeIndex of face.edgeIndices ?? []) {
        const edge = geometry.edges?.[edgeIndex];
        if (!edge) {
          continue;
        }
        const edgeFamily = module.GetExactGeometryType(result.exactModelId, exactShapeHandle, "edge", edge.id);
        if (edgeFamily?.ok !== true || edgeFamily.family !== "circle") {
          continue;
        }
        const radius = module.MeasureExactRadius(result.exactModelId, exactShapeHandle, "edge", edge.id);
        if (radius?.ok === true) {
          radii.push(radius.radius);
        }
      }

      for (const cylinder of holeCylinders) {
        if (!isParallel(coneCenter.localAxisDirection, cylinder.center.localAxisDirection)) {
          continue;
        }
        if (lineDistance(coneCenter.localCenter, coneCenter.localAxisDirection, cylinder.center.localCenter) > 1e-4) {
          continue;
        }
        const matchingRadius = radii.some((radius) => Math.abs(radius - cylinder.radius.radius) <= 1e-4);
        const largerRadius = radii.some((radius) => radius - cylinder.radius.radius > 1e-4);
        if (matchingRadius && largerRadius) {
          return {
            ref: getExactRef(result, geometryIndex, "face", face.id),
            holeRadius: cylinder.radius.radius,
            coneRadii: radii,
          };
        }
      }
    }
  }

  return null;
}

async function findUnsupportedPlainHoleRef(module, result) {
  for (let geometryIndex = 0; geometryIndex < result.geometries.length; geometryIndex += 1) {
    const geometry = result.geometries[geometryIndex];
    const exactShapeHandle = result.exactGeometryBindings[geometryIndex].exactShapeHandle;
    for (const face of geometry.faces ?? []) {
      const family = module.GetExactGeometryType(result.exactModelId, exactShapeHandle, "face", face.id);
      if (family?.ok !== true || family.family !== "cylinder") {
        continue;
      }
      const hole = module.DescribeExactHole(result.exactModelId, exactShapeHandle, "face", face.id);
      if (hole?.ok === true) {
        return getExactRef(result, geometryIndex, "face", face.id);
      }
    }
  }
  return null;
}

test("exact compound-hole helper describes a supported counterbore selection", async () => {
  const module = await createModule();
  const result = await openExactBrep(module, FIXTURES.counterbore);
  const candidate = findSupportedCounterboreRef(module, result);

  try {
    assert.ok(candidate, "counterbore fixture should expose a supported compound-hole cylinder selection");
    const compoundHole = describeExactCompoundHole(module, candidate.ref);
    assert.equal(compoundHole?.ok, true);
    assert.equal(compoundHole?.kind, "compound-hole");
    assert.equal(compoundHole?.family, "counterbore");
    assert.equal(typeof compoundHole?.holeDiameter, "number");
    assert.ok(compoundHole.holeDiameter > 0);
    assert.equal(typeof compoundHole?.counterboreDiameter, "number");
    assert.ok(compoundHole.counterboreDiameter > compoundHole.holeDiameter);
    assert.equal(typeof compoundHole?.counterboreDepth, "number");
    assert.ok(compoundHole.counterboreDepth > 0);
    assertPlacementFrame(compoundHole.frame);
    assert.ok(Array.isArray(compoundHole?.anchors) && compoundHole.anchors.length >= 2);
    assert.ok(Array.isArray(compoundHole?.axisDirection) && compoundHole.axisDirection.length === 3);
  } finally {
    module.ReleaseExactModel(result.exactModelId);
  }
});

test("exact compound-hole helper describes a supported countersink selection", async () => {
  const module = await createModule();
  const result = await openExactBrep(module, FIXTURES.countersink);
  const candidate = findSupportedCountersinkRef(module, result);

  try {
    assert.ok(candidate, "countersink fixture should expose a supported compound-hole cone selection");
    const compoundHole = describeExactCompoundHole(module, candidate.ref);
    assert.equal(compoundHole?.ok, true);
    assert.equal(compoundHole?.kind, "compound-hole");
    assert.equal(compoundHole?.family, "countersink");
    assert.equal(typeof compoundHole?.holeDiameter, "number");
    assert.ok(compoundHole.holeDiameter > 0);
    assert.equal(typeof compoundHole?.countersinkDiameter, "number");
    assert.ok(compoundHole.countersinkDiameter > compoundHole.holeDiameter);
    assert.equal(typeof compoundHole?.countersinkAngle, "number");
    assert.ok(compoundHole.countersinkAngle > 0);
    assertPlacementFrame(compoundHole.frame);
    assert.ok(Array.isArray(compoundHole?.anchors) && compoundHole.anchors.length >= 2);
    assert.ok(Array.isArray(compoundHole?.axisDirection) && compoundHole.axisDirection.length === 3);
  } finally {
    module.ReleaseExactModel(result.exactModelId);
  }
});

test("exact compound-hole helper failures stay explicit for unsupported or plain cylindrical holes", async () => {
  const module = await createModule();
  const result = await openExactBrep(module, FIXTURES.unsupported);
  const ref = await findUnsupportedPlainHoleRef(module, result);

  try {
    assert.ok(ref, "unsupported fixture should expose at least one plain cylindrical hole ref");
    const compoundHole = describeExactCompoundHole(module, ref);
    assert.equal(compoundHole?.ok, false);
    assert.equal(compoundHole?.code, "unsupported-geometry");
    assert.equal(typeof compoundHole?.message, "string");
    assert.ok(compoundHole.message.length > 0);
  } finally {
    module.ReleaseExactModel(result.exactModelId);
  }
});
