import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import {
  createOcctCore,
  normalizeExactOpenResult,
  resolveExactElementRef,
} from "../src/index.js";
import { loadOcctFactory } from "../../../test/load_occt_factory.mjs";

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

test("createOcctCore imports custom defaultColor through the built root carrier", async () => {
  const factory = loadOcctFactory();
  const wasmBinary = new Uint8Array(await readFile(new URL("../../../dist/occt-js.wasm", import.meta.url)));
  const stepBytes = new Uint8Array(await readFile(new URL("../../../test/ANC101_colored.stp", import.meta.url)));

  const core = createOcctCore({
    factory,
    wasmBinary,
  });

  const model = await core.importModel(stepBytes, {
    format: "step",
    fileName: "ANC101_colored.stp",
    importParams: {
      colorMode: "default",
      defaultColor: [51, 102, 153],
    },
  });

  assert.deepEqual(model.materials, [{
    id: "mat_0",
    baseColor: [0.2, 0.4, 0.6, 1],
  }]);
  assert.ok(model.geometries.length > 0);
  assert.ok(model.geometries.every((geometry) => geometry.materialId === "mat_0"));
});

test("createOcctCore imports appearancePreset cad-ghosted through the built root carrier", async () => {
  const factory = loadOcctFactory();
  const wasmBinary = new Uint8Array(await readFile(new URL("../../../dist/occt-js.wasm", import.meta.url)));
  const stepBytes = new Uint8Array(await readFile(new URL("../../../test/ANC101_colored.stp", import.meta.url)));

  const core = createOcctCore({
    factory,
    wasmBinary,
  });

  const model = await core.importModel(stepBytes, {
    format: "step",
    fileName: "ANC101_colored.stp",
    importParams: {
      appearancePreset: "cad-ghosted",
    },
  });

  assert.deepEqual(model.materials, [{
    id: "mat_0",
    baseColor: [0.9, 0.91, 0.93, 0.35],
  }]);
  assert.ok(model.geometries.length > 0);
  assert.ok(model.geometries.every((geometry) => geometry.materialId === "mat_0"));
});

test("createOcctCore imports STEP through the built root carrier", async () => {
  const factory = loadOcctFactory();
  const wasmBinary = new Uint8Array(await readFile(new URL("../../../dist/occt-js.wasm", import.meta.url)));
  const stepBytes = new Uint8Array(await readFile(new URL("../../../test/simple_part.step", import.meta.url)));

  const core = createOcctCore({
    factory,
    wasmBinary,
  });

  const model = await core.importModel(stepBytes, {
    format: "step",
    fileName: "simple_part.step",
  });

  assert.equal(model.sourceFormat, "step");
  assert.ok(model.rootNodes.length > 0);
  assert.ok(model.geometries.length > 0);
  assert.ok(model.stats.partCount > 0);
});

test("createOcctCore opens and disposes an exact STEP handle through the built root carrier", async () => {
  const factory = loadOcctFactory();
  const wasmBinary = new Uint8Array(await readFile(new URL("../../../dist/occt-js.wasm", import.meta.url)));
  const stepBytes = new Uint8Array(await readFile(new URL("../../../test/simple_part.step", import.meta.url)));

  const core = createOcctCore({
    factory,
    wasmBinary,
  });

  const exact = await core.openExactStep(stepBytes, {
    fileName: "simple_part.step",
  });

  assert.equal(exact.sourceFormat, "step");
  assert.equal(typeof exact.exactModelId, "number");
  assert.deepEqual(await core.releaseExactModel(exact.exactModelId), { ok: true });
});

test("managed exact-model helpers release real retained handles while preserving root lifecycle failures", async () => {
  const factory = loadOcctFactory();
  const wasmBinary = new Uint8Array(await readFile(new URL("../../../dist/occt-js.wasm", import.meta.url)));
  const stepBytes = new Uint8Array(await readFile(new URL("../../../test/simple_part.step", import.meta.url)));
  const identity = [
    1, 0, 0, 0,
    0, 1, 0, 0,
    0, 0, 1, 0,
    0, 0, 0, 1,
  ];

  const core = createOcctCore({
    factory,
    wasmBinary,
  });

  const managed = await core.openManagedExactStep(stepBytes, {
    fileName: "simple_part.step",
  });

  const exactShapeHandle = managed.exactModel.exactGeometryBindings?.[0]?.exactShapeHandle ?? 1;
  const representativeFaceId = managed.exactModel.geometries?.[0]?.faces?.[0]?.id ?? 1;

  assert.deepEqual(await managed.dispose(), { ok: true });
  assert.deepEqual(await managed.dispose(), { ok: true });
  assert.deepEqual(await core.retainExactModel(managed.exactModelId), {
    ok: false,
    code: "released-handle",
    message: "Exact model handle has already been released.",
  });
  assert.deepEqual(await core.getExactGeometryType({
    exactModelId: managed.exactModelId,
    exactShapeHandle,
    kind: "face",
    elementId: representativeFaceId,
    transform: identity,
  }), {
    ok: false,
    code: "released-handle",
    message: "Exact model handle has already been released.",
  });
});

function collectGeometryOccurrences(nodes, parentTransform = [
  1, 0, 0, 0,
  0, 1, 0, 0,
  0, 0, 1, 0,
  0, 0, 0, 1,
]) {
  const results = [];
  for (const node of nodes ?? []) {
    const local = Array.isArray(node.transform) && node.transform.length === 16
      ? node.transform
      : parentTransform;
    const world = multiplyMatrices(parentTransform, local);
    for (const geometryId of node.geometryIds ?? []) {
      results.push({ geometryId, nodeId: node.nodeId, transform: world });
    }
    results.push(...collectGeometryOccurrences(node.children ?? [], world));
  }
  return results;
}

function multiplyMatrices(left, right) {
  const output = new Array(16).fill(0);
  for (let row = 0; row < 4; row += 1) {
    for (let column = 0; column < 4; column += 1) {
      let sum = 0;
      for (let index = 0; index < 4; index += 1) {
        sum += left[index * 4 + row] * right[column * 4 + index];
      }
      output[column * 4 + row] = sum;
    }
  }
  return output;
}

function transformPoint(transform, point) {
  const [x, y, z] = point;
  return [
    transform[0] * x + transform[4] * y + transform[8] * z + transform[12],
    transform[1] * x + transform[5] * y + transform[9] * z + transform[13],
    transform[2] * x + transform[6] * y + transform[10] * z + transform[14],
  ];
}

function getFaceTriangleCentroid(geometry, face) {
  const triangleIndices = geometry.indices.slice(face.firstIndex, face.firstIndex + 3);
  const points = triangleIndices.map((vertexIndex) => {
    const base = vertexIndex * 3;
    return [
      geometry.positions[base],
      geometry.positions[base + 1],
      geometry.positions[base + 2],
    ];
  });

  return points[0].map((_, axis) => (
    (points[0][axis] + points[1][axis] + points[2][axis]) / 3
  ));
}

function dot(left, right) {
  return left[0] * right[0] + left[1] * right[1] + left[2] * right[2];
}

function findRepeatedGeometryOccurrencePair(exactModel) {
  const occurrences = collectGeometryOccurrences(exactModel.rootNodes);
  for (let leftIndex = 0; leftIndex < occurrences.length; leftIndex += 1) {
    for (let rightIndex = leftIndex + 1; rightIndex < occurrences.length; rightIndex += 1) {
      const left = occurrences[leftIndex];
      const right = occurrences[rightIndex];
      if (left.geometryId === right.geometryId && left.nodeId !== right.nodeId) {
        return {
          geometryId: left.geometryId,
          left,
          right,
        };
      }
    }
  }
  return null;
}

async function findCircularOccurrenceRef(core, exactModel) {
  const occurrences = collectGeometryOccurrences(exactModel.rootNodes);
  for (const occurrence of occurrences) {
    const geometry = exactModel.geometries.find((entry) => entry.geometryId === occurrence.geometryId);
    if (!geometry) {
      continue;
    }

    for (const edge of geometry.edges ?? []) {
      const ref = resolveExactElementRef(exactModel, {
        nodeId: occurrence.nodeId,
        geometryId: occurrence.geometryId,
        kind: "edge",
        elementId: edge.id,
      });
      if (ref?.ok !== true) {
        continue;
      }
      const family = await core.getExactGeometryType(ref);
      if (family?.ok === true && family.family === "circle") {
        return ref;
      }
    }

    for (const face of geometry.faces ?? []) {
      const ref = resolveExactElementRef(exactModel, {
        nodeId: occurrence.nodeId,
        geometryId: occurrence.geometryId,
        kind: "face",
        elementId: face.id,
      });
      if (ref?.ok !== true) {
        continue;
      }
      const family = await core.getExactGeometryType(ref);
      if (family?.ok === true && family.family === "cylinder") {
        return ref;
      }
    }
  }

  return null;
}

async function findSupportedHoleOccurrenceRef(core, exactModel) {
  const occurrences = collectGeometryOccurrences(exactModel.rootNodes);
  for (const occurrence of occurrences) {
    const geometry = exactModel.geometries.find((entry) => entry.geometryId === occurrence.geometryId);
    if (!geometry) {
      continue;
    }

    for (const edge of geometry.edges ?? []) {
      const ref = resolveExactElementRef(exactModel, {
        nodeId: occurrence.nodeId,
        geometryId: occurrence.geometryId,
        kind: "edge",
        elementId: edge.id,
      });
      if (ref?.ok !== true) {
        continue;
      }
      const family = await core.getExactGeometryType(ref);
      if (family?.ok !== true || family.family !== "circle") {
        continue;
      }
      const hole = await core.describeExactHole(ref);
      if (hole?.ok === true) {
        return ref;
      }
    }

    for (const face of geometry.faces ?? []) {
      const ref = resolveExactElementRef(exactModel, {
        nodeId: occurrence.nodeId,
        geometryId: occurrence.geometryId,
        kind: "face",
        elementId: face.id,
      });
      if (ref?.ok !== true) {
        continue;
      }
      const family = await core.getExactGeometryType(ref);
      if (family?.ok !== true || family.family !== "cylinder") {
        continue;
      }
      const hole = await core.describeExactHole(ref);
      if (hole?.ok === true) {
        return ref;
      }
    }
  }

  return null;
}

async function findSupportedChamferOccurrenceRef(core, exactModel) {
  const occurrences = collectGeometryOccurrences(exactModel.rootNodes);
  for (const occurrence of occurrences) {
    const geometry = exactModel.geometries.find((entry) => entry.geometryId === occurrence.geometryId);
    if (!geometry) {
      continue;
    }

    const planarFaces = new Map();
    for (const face of geometry.faces ?? []) {
      const ref = resolveExactElementRef(exactModel, {
        nodeId: occurrence.nodeId,
        geometryId: occurrence.geometryId,
        kind: "face",
        elementId: face.id,
      });
      if (ref?.ok !== true) {
        continue;
      }

      const family = await core.getExactGeometryType(ref);
      if (family?.ok !== true || family.family !== "plane") {
        continue;
      }

      const normal = await core.evaluateExactFaceNormal(ref, getFaceTriangleCentroid(geometry, face));
      if (normal?.ok !== true) {
        continue;
      }

      planarFaces.set(face.id, {
        face,
        ref,
        normal: normal.normal,
      });
    }

    for (const info of planarFaces.values()) {
      const obliqueSupportIds = new Set();
      for (const edgeIndex of info.face.edgeIndices ?? []) {
        const edge = geometry.edges?.[edgeIndex];
        for (const ownerFaceId of edge?.ownerFaceIds ?? []) {
          if (ownerFaceId === info.face.id) {
            continue;
          }
          const adjacent = planarFaces.get(ownerFaceId);
          if (!adjacent) {
            continue;
          }
          const alignment = Math.abs(dot(info.normal, adjacent.normal));
          if (alignment < 0.999 && alignment > 1e-4) {
            obliqueSupportIds.add(ownerFaceId);
          }
        }
      }

      if (obliqueSupportIds.size === 2) {
        const [firstId, secondId] = [...obliqueSupportIds];
        const first = planarFaces.get(firstId);
        const second = planarFaces.get(secondId);
        const supportAlignment = Math.abs(dot(first.normal, second.normal));
        if (supportAlignment >= 0.999) {
          continue;
        }
        return info.ref;
      }
    }
  }

  return null;
}

function parallelDirections(left, right, tolerance = 1e-5) {
  const cross = [
    left[1] * right[2] - left[2] * right[1],
    left[2] * right[0] - left[0] * right[2],
    left[0] * right[1] - left[1] * right[0],
  ];
  return Math.hypot(...cross) <= tolerance;
}

function distanceToAxis(pointOnAxisA, axisA, pointOnAxisB) {
  const normalizedAxis = (() => {
    const length = Math.hypot(...axisA);
    return length > 0 ? axisA.map((value) => value / length) : [0, 0, 0];
  })();
  const offset = [
    pointOnAxisB[0] - pointOnAxisA[0],
    pointOnAxisB[1] - pointOnAxisA[1],
    pointOnAxisB[2] - pointOnAxisA[2],
  ];
  const cross = [
    normalizedAxis[1] * offset[2] - normalizedAxis[2] * offset[1],
    normalizedAxis[2] * offset[0] - normalizedAxis[0] * offset[2],
    normalizedAxis[0] * offset[1] - normalizedAxis[1] * offset[0],
  ];
  return Math.hypot(...cross);
}

async function collectHoleCylinderCandidates(core, exactModel) {
  const occurrences = collectGeometryOccurrences(exactModel.rootNodes);
  const cylinders = [];
  for (const occurrence of occurrences) {
    const geometry = exactModel.geometries.find((entry) => entry.geometryId === occurrence.geometryId);
    if (!geometry) {
      continue;
    }

    for (const face of geometry.faces ?? []) {
      const ref = resolveExactElementRef(exactModel, {
        nodeId: occurrence.nodeId,
        geometryId: occurrence.geometryId,
        kind: "face",
        elementId: face.id,
      });
      if (ref?.ok !== true) {
        continue;
      }

      const family = await core.getExactGeometryType(ref);
      if (family?.ok !== true || family.family !== "cylinder") {
        continue;
      }

      const hole = await core.describeExactHole(ref);
      if (hole?.ok !== true) {
        continue;
      }

      const center = await core.measureExactCenter(ref);
      const radius = await core.measureExactRadius(ref);
      if (center?.ok !== true || radius?.ok !== true) {
        continue;
      }

      cylinders.push({
        geometry,
        face,
        ref,
        hole,
        center,
        radius,
      });
    }
  }

  return cylinders;
}

async function findSupportedCounterboreOccurrenceRef(core, exactModel) {
  const cylinders = await collectHoleCylinderCandidates(core, exactModel);
  for (let leftIndex = 0; leftIndex < cylinders.length; leftIndex += 1) {
    for (let rightIndex = leftIndex + 1; rightIndex < cylinders.length; rightIndex += 1) {
      const left = cylinders[leftIndex];
      const right = cylinders[rightIndex];
      if (!parallelDirections(left.center.axisDirection, right.center.axisDirection)) {
        continue;
      }
      if (distanceToAxis(left.center.center, left.center.axisDirection, right.center.center) > 1e-4) {
        continue;
      }
      if (Math.abs(left.radius.radius - right.radius.radius) <= 1e-4) {
        continue;
      }

      return left.radius.radius > right.radius.radius ? left.ref : right.ref;
    }
  }

  return null;
}

async function findSupportedCountersinkOccurrenceRef(core, exactModel) {
  const cylinders = await collectHoleCylinderCandidates(core, exactModel);
  const occurrences = collectGeometryOccurrences(exactModel.rootNodes);
  for (const occurrence of occurrences) {
    const geometry = exactModel.geometries.find((entry) => entry.geometryId === occurrence.geometryId);
    if (!geometry) {
      continue;
    }

    for (const face of geometry.faces ?? []) {
      const ref = resolveExactElementRef(exactModel, {
        nodeId: occurrence.nodeId,
        geometryId: occurrence.geometryId,
        kind: "face",
        elementId: face.id,
      });
      if (ref?.ok !== true) {
        continue;
      }

      const family = await core.getExactGeometryType(ref);
      if (family?.ok !== true || family.family !== "cone") {
        continue;
      }

      const center = await core.measureExactCenter(ref);
      if (center?.ok !== true) {
        continue;
      }

      const radii = [];
      for (const edgeIndex of face.edgeIndices ?? []) {
        const edge = geometry.edges?.[edgeIndex];
        if (!edge) {
          continue;
        }
        const edgeRef = resolveExactElementRef(exactModel, {
          nodeId: occurrence.nodeId,
          geometryId: occurrence.geometryId,
          kind: "edge",
          elementId: edge.id,
        });
        if (edgeRef?.ok !== true) {
          continue;
        }
        const edgeFamily = await core.getExactGeometryType(edgeRef);
        if (edgeFamily?.ok !== true || edgeFamily.family !== "circle") {
          continue;
        }
        const radius = await core.measureExactRadius(edgeRef);
        if (radius?.ok === true) {
          radii.push(radius.radius);
        }
      }

      for (const cylinder of cylinders) {
        if (!parallelDirections(center.axisDirection, cylinder.center.axisDirection)) {
          continue;
        }
        if (distanceToAxis(center.center, center.axisDirection, cylinder.center.center) > 1e-4) {
          continue;
        }
        const matchingRadius = radii.some((radius) => Math.abs(radius - cylinder.radius.radius) <= 1e-4);
        const largerRadius = radii.some((radius) => radius - cylinder.radius.radius > 1e-4);
        if (matchingRadius && largerRadius) {
          return ref;
        }
      }
    }
  }

  return null;
}

function translateTransform(transform, tx, ty, tz) {
  const output = transform.slice();
  output[12] += tx;
  output[13] += ty;
  output[14] += tz;
  return output;
}

function translatePoint(point, tx, ty, tz) {
  return [point[0] + tx, point[1] + ty, point[2] + tz];
}

test("createOcctCore resolves repeated geometry occurrences into distinct exact refs", async () => {
  const factory = loadOcctFactory();
  const wasmBinary = new Uint8Array(await readFile(new URL("../../../dist/occt-js.wasm", import.meta.url)));
  const assemblyBytes = new Uint8Array(await readFile(new URL("../../../test/assembly.step", import.meta.url)));

  const core = createOcctCore({
    factory,
    wasmBinary,
  });

  const rawExact = await core.openExactStep(assemblyBytes, {
    fileName: "assembly.step",
  });
  const exactModel = normalizeExactOpenResult(rawExact, {
    sourceFileName: "assembly.step",
  });
  const occurrences = collectGeometryOccurrences(exactModel.rootNodes);
  const repeated = occurrences.find((candidate, index) => (
    occurrences.findIndex((other) => other.geometryId === candidate.geometryId && other.nodeId !== candidate.nodeId) > index
  ));

  assert.ok(repeated, "assembly.step should expose at least one repeated geometry occurrence");

  const matching = occurrences.filter((entry) => entry.geometryId === repeated.geometryId);
  assert.ok(matching.length >= 2, "the repeated geometry should appear under at least two nodes");

  const geometry = exactModel.geometries.find((entry) => entry.geometryId === repeated.geometryId);
  assert.ok(geometry?.faces?.length, "the repeated geometry should expose at least one face");

  const faceId = geometry.faces[0].id;
  const first = resolveExactElementRef(exactModel, {
    nodeId: matching[0].nodeId,
    geometryId: repeated.geometryId,
    kind: "face",
    elementId: faceId,
  });
  const second = resolveExactElementRef(exactModel, {
    nodeId: matching[1].nodeId,
    geometryId: repeated.geometryId,
    kind: "face",
    elementId: faceId,
  });

  assert.equal(first.ok, true);
  assert.equal(second.ok, true);
  assert.equal(first.exactShapeHandle, second.exactShapeHandle);
  assert.notEqual(first.nodeId, second.nodeId);
  assert.deepEqual(await core.releaseExactModel(exactModel.exactModelId), { ok: true });
});

test("occt-core face normal wrappers invert occurrence transforms for repeated geometry", async () => {
  const factory = loadOcctFactory();
  const wasmBinary = new Uint8Array(await readFile(new URL("../../../dist/occt-js.wasm", import.meta.url)));
  const assemblyBytes = new Uint8Array(await readFile(new URL("../../../test/assembly.step", import.meta.url)));

  const core = createOcctCore({
    factory,
    wasmBinary,
  });

  const rawExact = await core.openExactStep(assemblyBytes, {
    fileName: "assembly.step",
  });
  const exactModel = normalizeExactOpenResult(rawExact, {
    sourceFileName: "assembly.step",
  });
  const occurrences = collectGeometryOccurrences(exactModel.rootNodes);
  const repeated = occurrences.find((candidate, index) => (
    occurrences.findIndex((other) => other.geometryId === candidate.geometryId && other.nodeId !== candidate.nodeId) > index
  ));

  assert.ok(repeated, "assembly.step should expose at least one repeated geometry occurrence");

  const matching = occurrences.filter((entry) => entry.geometryId === repeated.geometryId);
  assert.ok(matching.length >= 2, "the repeated geometry should appear under at least two nodes");

  const geometry = exactModel.geometries.find((entry) => entry.geometryId === repeated.geometryId);
  assert.ok(geometry?.faces?.length, "the repeated geometry should expose at least one face");

  const faceId = geometry.faces[0].id;
  const first = resolveExactElementRef(exactModel, {
    nodeId: matching[0].nodeId,
    geometryId: repeated.geometryId,
    kind: "face",
    elementId: faceId,
  });
  const second = resolveExactElementRef(exactModel, {
    nodeId: matching[1].nodeId,
    geometryId: repeated.geometryId,
    kind: "face",
    elementId: faceId,
  });

  assert.equal(first.ok, true);
  assert.equal(second.ok, true);

  const localPoint = getFaceTriangleCentroid(geometry, geometry.faces[0]);
  const firstWorldPoint = transformPoint(first.transform, localPoint);
  const secondWorldPoint = transformPoint(second.transform, localPoint);

  const firstNormal = await core.evaluateExactFaceNormal(first, firstWorldPoint);
  const secondNormal = await core.evaluateExactFaceNormal(second, secondWorldPoint);

  assert.equal(firstNormal?.ok, true);
  assert.equal(secondNormal?.ok, true);
  assert.ok(Array.isArray(firstNormal?.point) && firstNormal.point.length === 3);
  assert.ok(Array.isArray(secondNormal?.point) && secondNormal.point.length === 3);
  assert.ok(Array.isArray(firstNormal?.normal) && firstNormal.normal.length === 3);
  assert.ok(Array.isArray(secondNormal?.normal) && secondNormal.normal.length === 3);
  assert.ok(Math.abs(Math.hypot(...firstNormal.normal) - 1) < 1e-9);
  assert.ok(Math.abs(Math.hypot(...secondNormal.normal) - 1) < 1e-9);
  assert.notDeepEqual(firstNormal.point, secondNormal.point);

  assert.deepEqual(await core.releaseExactModel(exactModel.exactModelId), { ok: true });
});

test("occt-core pairwise wrappers honor occurrence transforms for repeated geometry", async () => {
  const factory = loadOcctFactory();
  const wasmBinary = new Uint8Array(await readFile(new URL("../../../dist/occt-js.wasm", import.meta.url)));
  const assemblyBytes = new Uint8Array(await readFile(new URL("../../../test/assembly.step", import.meta.url)));

  const core = createOcctCore({
    factory,
    wasmBinary,
  });

  const rawExact = await core.openExactStep(assemblyBytes, {
    fileName: "assembly.step",
  });
  const exactModel = normalizeExactOpenResult(rawExact, {
    sourceFileName: "assembly.step",
  });
  const repeated = findRepeatedGeometryOccurrencePair(exactModel);

  assert.ok(repeated, "assembly.step should expose repeated geometry under at least two distinct nodeIds");

  const geometry = exactModel.geometries.find((entry) => entry.geometryId === repeated.geometryId);
  assert.ok(geometry?.faces?.length, "the repeated geometry should expose at least one face");

  const faceId = geometry.faces[0].id;
  const first = resolveExactElementRef(exactModel, {
    nodeId: repeated.left.nodeId,
    geometryId: repeated.geometryId,
    kind: "face",
    elementId: faceId,
  });
  const second = resolveExactElementRef(exactModel, {
    nodeId: repeated.right.nodeId,
    geometryId: repeated.geometryId,
    kind: "face",
    elementId: faceId,
  });

  assert.equal(first.ok, true);
  assert.equal(second.ok, true);

  const distance = await core.measureExactDistance(first, second);

  assert.equal(distance?.ok, true);
  assert.equal(typeof distance?.value, "number");
  assert.ok(distance.value > 0);
  assert.ok(Array.isArray(distance?.pointA) && distance.pointA.length === 3);
  assert.ok(Array.isArray(distance?.pointB) && distance.pointB.length === 3);
  assert.deepEqual(distance?.refA, first);
  assert.deepEqual(distance?.refB, second);

  assert.deepEqual(await core.releaseExactModel(exactModel.exactModelId), { ok: true });
});

test("occt-core relation wrappers honor occurrence transforms for repeated geometry", async () => {
  const factory = loadOcctFactory();
  const wasmBinary = new Uint8Array(await readFile(new URL("../../../dist/occt-js.wasm", import.meta.url)));
  const assemblyBytes = new Uint8Array(await readFile(new URL("../../../test/assembly.step", import.meta.url)));

  const core = createOcctCore({
    factory,
    wasmBinary,
  });

  const rawExact = await core.openExactStep(assemblyBytes, {
    fileName: "assembly.step",
  });
  const exactModel = normalizeExactOpenResult(rawExact, {
    sourceFileName: "assembly.step",
  });
  const repeated = findRepeatedGeometryOccurrencePair(exactModel);

  assert.ok(repeated, "assembly.step should expose repeated geometry under at least two distinct nodeIds");

  const geometry = exactModel.geometries.find((entry) => entry.geometryId === repeated.geometryId);
  assert.ok(geometry?.faces?.length, "the repeated geometry should expose at least one face");

  const faceId = geometry.faces[0].id;
  const first = resolveExactElementRef(exactModel, {
    nodeId: repeated.left.nodeId,
    geometryId: repeated.geometryId,
    kind: "face",
    elementId: faceId,
  });
  const second = resolveExactElementRef(exactModel, {
    nodeId: repeated.right.nodeId,
    geometryId: repeated.geometryId,
    kind: "face",
    elementId: faceId,
  });

  assert.equal(first.ok, true);
  assert.equal(second.ok, true);

  const relation = await core.classifyExactRelation(first, second);

  assert.equal(relation?.ok, true);
  assert.equal(relation?.kind, "parallel");
  assert.ok(Array.isArray(relation?.anchors) && relation.anchors.length >= 2);
  assert.ok(Array.isArray(relation?.frame?.origin) && relation.frame.origin.length === 3);
  assert.ok(Array.isArray(relation?.directionA) && relation.directionA.length === 3);
  assert.ok(Array.isArray(relation?.directionB) && relation.directionB.length === 3);
  assert.deepEqual(relation?.refA, first);
  assert.deepEqual(relation?.refB, second);

  assert.deepEqual(await core.releaseExactModel(exactModel.exactModelId), { ok: true });
});

test("occt-core pairwise placement wrappers honor occurrence transforms for repeated geometry", async () => {
  const factory = loadOcctFactory();
  const wasmBinary = new Uint8Array(await readFile(new URL("../../../dist/occt-js.wasm", import.meta.url)));
  const assemblyBytes = new Uint8Array(await readFile(new URL("../../../test/assembly.step", import.meta.url)));

  const core = createOcctCore({
    factory,
    wasmBinary,
  });

  const rawExact = await core.openExactStep(assemblyBytes, {
    fileName: "assembly.step",
  });
  const exactModel = normalizeExactOpenResult(rawExact, {
    sourceFileName: "assembly.step",
  });
  const repeated = findRepeatedGeometryOccurrencePair(exactModel);

  assert.ok(repeated, "assembly.step should expose repeated geometry under at least two distinct nodeIds");

  const geometry = exactModel.geometries.find((entry) => entry.geometryId === repeated.geometryId);
  assert.ok(geometry?.faces?.length, "the repeated geometry should expose at least one face");

  const faceId = geometry.faces[0].id;
  const first = resolveExactElementRef(exactModel, {
    nodeId: repeated.left.nodeId,
    geometryId: repeated.geometryId,
    kind: "face",
    elementId: faceId,
  });
  const second = resolveExactElementRef(exactModel, {
    nodeId: repeated.right.nodeId,
    geometryId: repeated.geometryId,
    kind: "face",
    elementId: faceId,
  });

  assert.equal(first.ok, true);
  assert.equal(second.ok, true);

  const placement = await core.suggestExactDistancePlacement(first, second);

  assert.equal(placement?.ok, true);
  assert.equal(placement?.kind, "distance");
  assert.equal(typeof placement?.value, "number");
  assert.ok(Array.isArray(placement?.anchors) && placement.anchors.length >= 2);
  assert.ok(Array.isArray(placement?.frame?.origin) && placement.frame.origin.length === 3);
  assert.deepEqual(placement?.refA, first);
  assert.deepEqual(placement?.refB, second);

  assert.deepEqual(await core.releaseExactModel(exactModel.exactModelId), { ok: true });
});

test("occt-core placement wrappers normalize local circular placement into occurrence space", async () => {
  const factory = loadOcctFactory();
  const wasmBinary = new Uint8Array(await readFile(new URL("../../../dist/occt-js.wasm", import.meta.url)));
  const brepBytes = new Uint8Array(await readFile(new URL("../../../test/as1_pe_203.brep", import.meta.url)));

  const core = createOcctCore({
    factory,
    wasmBinary,
  });

  const rawExact = await core.openExactBrep(brepBytes, {
    fileName: "as1_pe_203.brep",
  });
  const exactModel = normalizeExactOpenResult(rawExact, {
    sourceFileName: "as1_pe_203.brep",
  });
  const baseRef = await findCircularOccurrenceRef(core, exactModel);

  assert.ok(baseRef?.ok === true, "as1_pe_203.brep should expose at least one circular or cylindrical exact ref");

  const shiftedRef = {
    ...baseRef,
    transform: translateTransform(baseRef.transform, 40, -20, 15),
  };

  const basePlacement = await core.suggestExactRadiusPlacement(baseRef);
  const shiftedPlacement = await core.suggestExactRadiusPlacement(shiftedRef);

  assert.equal(basePlacement?.ok, true);
  assert.equal(shiftedPlacement?.ok, true);
  assert.equal(basePlacement?.kind, "radius");
  assert.equal(shiftedPlacement?.kind, "radius");
  assert.deepEqual(shiftedPlacement?.frame.origin, translatePoint(basePlacement.frame.origin, 40, -20, 15));
  assert.deepEqual(shiftedPlacement?.anchors[0].point, translatePoint(basePlacement.anchors[0].point, 40, -20, 15));
  assert.deepEqual(shiftedPlacement?.anchors[1].point, translatePoint(basePlacement.anchors[1].point, 40, -20, 15));
  assert.deepEqual(shiftedPlacement?.axisDirection, basePlacement.axisDirection);
  assert.deepEqual(await core.releaseExactModel(exactModel.exactModelId), { ok: true });
});

test("occt-core describeExactHole normalizes live hole semantics into occurrence space", async () => {
  const factory = loadOcctFactory();
  const wasmBinary = new Uint8Array(await readFile(new URL("../../../dist/occt-js.wasm", import.meta.url)));
  const brepBytes = new Uint8Array(await readFile(new URL("../../../test/as1_pe_203.brep", import.meta.url)));

  const core = createOcctCore({
    factory,
    wasmBinary,
  });

  const rawExact = await core.openExactBrep(brepBytes, {
    fileName: "as1_pe_203.brep",
  });
  const exactModel = normalizeExactOpenResult(rawExact, {
    sourceFileName: "as1_pe_203.brep",
  });
  const baseRef = await findSupportedHoleOccurrenceRef(core, exactModel);

  assert.ok(baseRef?.ok === true, "as1_pe_203.brep should expose at least one supported exact hole ref");

  const shiftedRef = {
    ...baseRef,
    transform: translateTransform(baseRef.transform, 40, -20, 15),
  };

  const baseHole = await core.describeExactHole(baseRef);
  const shiftedHole = await core.describeExactHole(shiftedRef);

  assert.equal(baseHole?.ok, true);
  assert.equal(shiftedHole?.ok, true);
  assert.equal(baseHole?.kind, "hole");
  assert.equal(shiftedHole?.kind, "hole");
  assert.equal(baseHole?.profile, "cylindrical");
  assert.equal(shiftedHole?.profile, "cylindrical");
  assert.ok(Math.abs(baseHole.radius - shiftedHole.radius) < 1e-6);
  assert.ok(Math.abs(baseHole.diameter - shiftedHole.diameter) < 1e-6);
  assert.deepEqual(shiftedHole?.frame.origin, translatePoint(baseHole.frame.origin, 40, -20, 15));
  assert.deepEqual(shiftedHole?.anchors[0].point, translatePoint(baseHole.anchors[0].point, 40, -20, 15));
  assert.deepEqual(shiftedHole?.anchors[1].point, translatePoint(baseHole.anchors[1].point, 40, -20, 15));
  assert.deepEqual(shiftedHole?.axisDirection, baseHole.axisDirection);
  assert.deepEqual(await core.releaseExactModel(exactModel.exactModelId), { ok: true });
});

test("occt-core describeExactChamfer normalizes live chamfer semantics into occurrence space", async () => {
  const factory = loadOcctFactory();
  const wasmBinary = new Uint8Array(await readFile(new URL("../../../dist/occt-js.wasm", import.meta.url)));
  const stepBytes = new Uint8Array(await readFile(new URL("../../../test/ANC101.stp", import.meta.url)));

  const core = createOcctCore({
    factory,
    wasmBinary,
  });

  const rawExact = await core.openExactStep(stepBytes, {
    fileName: "ANC101.stp",
  });
  const exactModel = normalizeExactOpenResult(rawExact, {
    sourceFileName: "ANC101.stp",
  });
  const baseRef = await findSupportedChamferOccurrenceRef(core, exactModel);

  assert.ok(baseRef?.ok === true, "ANC101.stp should expose at least one supported exact chamfer ref");

  const shiftedRef = {
    ...baseRef,
    transform: translateTransform(baseRef.transform, 40, -20, 15),
  };

  const baseChamfer = await core.describeExactChamfer(baseRef);
  const shiftedChamfer = await core.describeExactChamfer(shiftedRef);

  assert.equal(baseChamfer?.ok, true);
  assert.equal(shiftedChamfer?.ok, true);
  assert.equal(baseChamfer?.kind, "chamfer");
  assert.equal(shiftedChamfer?.kind, "chamfer");
  assert.equal(baseChamfer?.profile, "planar");
  assert.equal(shiftedChamfer?.profile, "planar");
  assert.ok(Math.abs(baseChamfer.distanceA - shiftedChamfer.distanceA) < 1e-6);
  assert.ok(Math.abs(baseChamfer.distanceB - shiftedChamfer.distanceB) < 1e-6);
  assert.ok(Math.abs(baseChamfer.supportAngle - shiftedChamfer.supportAngle) < 1e-6);
  assert.deepEqual(shiftedChamfer?.frame.origin, translatePoint(baseChamfer.frame.origin, 40, -20, 15));
  assert.deepEqual(shiftedChamfer?.anchors[0].point, translatePoint(baseChamfer.anchors[0].point, 40, -20, 15));
  assert.deepEqual(shiftedChamfer?.anchors[1].point, translatePoint(baseChamfer.anchors[1].point, 40, -20, 15));
  assert.deepEqual(shiftedChamfer?.edgeDirection, baseChamfer.edgeDirection);
  assert.deepEqual(shiftedChamfer?.supportNormalA, baseChamfer.supportNormalA);
  assert.deepEqual(shiftedChamfer?.supportNormalB, baseChamfer.supportNormalB);
  assert.deepEqual(await core.releaseExactModel(exactModel.exactModelId), { ok: true });
});

test("occt-core package-only helper semantics compose over retained exact placements and relations", async () => {
  const factory = loadOcctFactory();
  const wasmBinary = new Uint8Array(await readFile(new URL("../../../dist/occt-js.wasm", import.meta.url)));
  const assemblyBytes = new Uint8Array(await readFile(new URL("../../../test/assembly.step", import.meta.url)));

  const core = createOcctCore({
    factory,
    wasmBinary,
  });

  const rawExact = await core.openExactStep(assemblyBytes, {
    fileName: "assembly.step",
  });
  const exactModel = normalizeExactOpenResult(rawExact, {
    sourceFileName: "assembly.step",
  });
  const repeated = findRepeatedGeometryOccurrencePair(exactModel);

  assert.ok(repeated, "assembly.step should expose repeated geometry under at least two distinct nodeIds");

  const geometry = exactModel.geometries.find((entry) => entry.geometryId === repeated.geometryId);
  assert.ok(geometry?.faces?.length, "the repeated geometry should expose at least one face");

  const faceId = geometry.faces[0].id;
  const first = resolveExactElementRef(exactModel, {
    nodeId: repeated.left.nodeId,
    geometryId: repeated.geometryId,
    kind: "face",
    elementId: faceId,
  });
  const second = resolveExactElementRef(exactModel, {
    nodeId: repeated.right.nodeId,
    geometryId: repeated.geometryId,
    kind: "face",
    elementId: faceId,
  });

  assert.equal(first.ok, true);
  assert.equal(second.ok, true);

  const midpoint = await core.suggestExactMidpointPlacement(first, second);
  const symmetry = await core.suggestExactSymmetryPlacement(first, second);
  const equalDistance = await core.describeExactEqualDistance(first, second, first, second);

  assert.equal(midpoint?.ok, true);
  assert.equal(midpoint?.kind, "midpoint");
  assert.ok(Array.isArray(midpoint?.point) && midpoint.point.length === 3);
  assert.ok(Array.isArray(midpoint?.anchors) && midpoint.anchors.some((anchor) => anchor.role === "center"));
  assert.deepEqual(midpoint?.refA, first);
  assert.deepEqual(midpoint?.refB, second);

  assert.equal(symmetry?.ok, true);
  assert.equal(symmetry?.kind, "symmetry");
  assert.equal(symmetry?.variant, "midplane");
  assert.ok(Array.isArray(symmetry?.planeNormal) && symmetry.planeNormal.length === 3);
  assert.ok(Array.isArray(symmetry?.anchors) && symmetry.anchors.some((anchor) => anchor.role === "center"));
  assert.deepEqual(symmetry?.frame.origin, midpoint?.point);

  assert.equal(equalDistance?.ok, true);
  assert.equal(equalDistance?.kind, "equal-distance");
  assert.equal(equalDistance?.equal, true);
  assert.ok(equalDistance?.delta <= equalDistance?.tolerance);
  assert.deepEqual(equalDistance?.refA, first);
  assert.deepEqual(equalDistance?.refB, second);
  assert.deepEqual(equalDistance?.refC, first);
  assert.deepEqual(equalDistance?.refD, second);

  assert.deepEqual(await core.releaseExactModel(exactModel.exactModelId), { ok: true });
});

test("occt-core compound-hole helpers normalize live semantics into occurrence space", async () => {
  const factory = loadOcctFactory();
  const wasmBinary = new Uint8Array(await readFile(new URL("../../../dist/occt-js.wasm", import.meta.url)));
  const counterboreBytes = new Uint8Array(await readFile(new URL("../../../test/freecad_hole_puzzle_counterbore.brep", import.meta.url)));
  const countersinkBytes = new Uint8Array(await readFile(new URL("../../../test/freecad_hole_puzzle_countersink.brep", import.meta.url)));

  const core = createOcctCore({
    factory,
    wasmBinary,
  });

  const counterboreExact = normalizeExactOpenResult(await core.openExactBrep(counterboreBytes, {
    fileName: "freecad_hole_puzzle_counterbore.brep",
  }), {
    sourceFileName: "freecad_hole_puzzle_counterbore.brep",
  });
  const countersinkExact = normalizeExactOpenResult(await core.openExactBrep(countersinkBytes, {
    fileName: "freecad_hole_puzzle_countersink.brep",
  }), {
    sourceFileName: "freecad_hole_puzzle_countersink.brep",
  });

  try {
    const counterboreRef = await findSupportedCounterboreOccurrenceRef(core, counterboreExact);
    const countersinkRef = await findSupportedCountersinkOccurrenceRef(core, countersinkExact);

    assert.ok(counterboreRef?.ok === true, "counterbore fixture should expose a supported counterbore exact ref");
    assert.ok(countersinkRef?.ok === true, "countersink fixture should expose a supported countersink exact ref");

    const shiftedCounterboreRef = {
      ...counterboreRef,
      transform: translateTransform(counterboreRef.transform, 40, -20, 15),
    };
    const shiftedCountersinkRef = {
      ...countersinkRef,
      transform: translateTransform(countersinkRef.transform, -25, 30, 12),
    };

    const counterbore = await core.describeExactCounterbore(counterboreRef);
    const shiftedCounterbore = await core.describeExactCounterbore(shiftedCounterboreRef);
    const countersink = await core.describeExactCountersink(countersinkRef);
    const shiftedCountersink = await core.describeExactCountersink(shiftedCountersinkRef);

    assert.equal(counterbore?.ok, true);
    assert.equal(shiftedCounterbore?.ok, true);
    assert.equal(counterbore?.kind, "counterbore");
    assert.equal(shiftedCounterbore?.kind, "counterbore");
    assert.ok(Math.abs(counterbore.holeDiameter - shiftedCounterbore.holeDiameter) < 1e-6);
    assert.ok(Math.abs(counterbore.counterboreDiameter - shiftedCounterbore.counterboreDiameter) < 1e-6);
    assert.ok(Math.abs(counterbore.counterboreDepth - shiftedCounterbore.counterboreDepth) < 1e-6);
    assert.deepEqual(shiftedCounterbore.frame.origin, translatePoint(counterbore.frame.origin, 40, -20, 15));
    assert.deepEqual(shiftedCounterbore.anchors[0].point, translatePoint(counterbore.anchors[0].point, 40, -20, 15));
    assert.deepEqual(shiftedCounterbore.axisDirection, counterbore.axisDirection);

    assert.equal(countersink?.ok, true);
    assert.equal(shiftedCountersink?.ok, true);
    assert.equal(countersink?.kind, "countersink");
    assert.equal(shiftedCountersink?.kind, "countersink");
    assert.ok(Math.abs(countersink.holeDiameter - shiftedCountersink.holeDiameter) < 1e-6);
    assert.ok(Math.abs(countersink.countersinkDiameter - shiftedCountersink.countersinkDiameter) < 1e-6);
    assert.ok(Math.abs(countersink.countersinkAngle - shiftedCountersink.countersinkAngle) < 1e-6);
    assert.deepEqual(shiftedCountersink.frame.origin, translatePoint(countersink.frame.origin, -25, 30, 12));
    assert.deepEqual(shiftedCountersink.anchors[0].point, translatePoint(countersink.anchors[0].point, -25, 30, 12));
    assert.deepEqual(shiftedCountersink.axisDirection, countersink.axisDirection);
  } finally {
    await core.releaseExactModel(counterboreExact.exactModelId);
    await core.releaseExactModel(countersinkExact.exactModelId);
  }
});

test("occt-core live package surface no longer publishes candidate-analysis helpers", async () => {
  const core = createOcctCore({
    factory: loadOcctFactory(),
    wasmBinary: new Uint8Array(await readFile(new URL("../../../dist/occt-js.wasm", import.meta.url))),
  });

  assert.equal("analyzeExactMeasurementCandidates" in core, false);
  assert.equal(typeof core.analyzeExactMeasurementCandidates, "undefined");
});

test("occt-core exact thickness wrappers honor repeated parallel occurrences", async () => {
  const factory = loadOcctFactory();
  const wasmBinary = new Uint8Array(await readFile(new URL("../../../dist/occt-js.wasm", import.meta.url)));
  const assemblyBytes = new Uint8Array(await readFile(new URL("../../../test/assembly.step", import.meta.url)));

  const core = createOcctCore({
    factory,
    wasmBinary,
  });

  const rawExact = await core.openExactStep(assemblyBytes, {
    fileName: "assembly.step",
  });
  const exactModel = normalizeExactOpenResult(rawExact, {
    sourceFileName: "assembly.step",
  });
  const repeated = findRepeatedGeometryOccurrencePair(exactModel);

  assert.ok(repeated, "assembly.step should expose repeated geometry under at least two distinct nodeIds");

  const geometry = exactModel.geometries.find((entry) => entry.geometryId === repeated.geometryId);
  assert.ok(geometry?.faces?.length, "the repeated geometry should expose at least one face");

  const faceId = geometry.faces[0].id;
  const first = resolveExactElementRef(exactModel, {
    nodeId: repeated.left.nodeId,
    geometryId: repeated.geometryId,
    kind: "face",
    elementId: faceId,
  });
  const second = resolveExactElementRef(exactModel, {
    nodeId: repeated.right.nodeId,
    geometryId: repeated.geometryId,
    kind: "face",
    elementId: faceId,
  });

  assert.equal(first.ok, true);
  assert.equal(second.ok, true);

  const thickness = await core.measureExactThickness(first, second);

  assert.equal(thickness?.ok, true);
  assert.equal(typeof thickness?.value, "number");
  assert.ok(thickness.value > 0);
  assert.ok(Array.isArray(thickness?.pointA) && thickness.pointA.length === 3);
  assert.ok(Array.isArray(thickness?.pointB) && thickness.pointB.length === 3);
  assert.deepEqual(thickness?.refA, first);
  assert.deepEqual(thickness?.refB, second);

  assert.deepEqual(await core.releaseExactModel(exactModel.exactModelId), { ok: true });
});

test("cross-model exact pairwise wrappers accept different exactModelId values for generated extruded faces", async () => {
  const factory = loadOcctFactory();
  const wasmBinary = new Uint8Array(await readFile(new URL("../../../dist/occt-js.wasm", import.meta.url)));
  const core = createOcctCore({
    factory,
    wasmBinary,
  });
  const spec = createExtrudedShapeSpec();
  let exactModelA = null;
  let exactModelB = null;

  try {
    exactModelA = normalizeExactOpenResult(await core.openExactExtrudedShape(spec), {
      sourceFileName: "cross-model-a.generated-extruded",
    });
    exactModelB = normalizeExactOpenResult(await core.openExactExtrudedShape(spec), {
      sourceFileName: "cross-model-b.generated-extruded",
    });

    const geometryIdA = exactModelA.geometries[0]?.geometryId ?? exactModelA.geometries[0]?.id;
    const geometryIdB = exactModelB.geometries[0]?.geometryId ?? exactModelB.geometries[0]?.id;
    const nodeIdA = exactModelA.rootNodes[0]?.nodeId ?? exactModelA.rootNodes[0]?.id;
    const nodeIdB = exactModelB.rootNodes[0]?.nodeId ?? exactModelB.rootNodes[0]?.id;

    const refA = resolveExactElementRef(exactModelA, {
      nodeId: nodeIdA,
      geometryId: geometryIdA,
      kind: "face",
      elementId: 5,
    });
    const refBBase = resolveExactElementRef(exactModelB, {
      nodeId: nodeIdB,
      geometryId: geometryIdB,
      kind: "face",
      elementId: 5,
    });
    const refB = {
      ...refBBase,
      transform: translateTransform(refBBase.transform, 0, 0, 40),
    };

    assert.equal(refA?.ok, true);
    assert.equal(refBBase?.ok, true);
    assert.notEqual(refA.exactModelId, refB.exactModelId);

    const distance = await core.measureExactDistance(refA, refB);
    const thickness = await core.measureExactThickness(refA, refB);
    const relation = await core.classifyExactRelation(refA, refB);
    const placement = await core.suggestExactDistancePlacement(refA, refB);
    const thicknessPlacement = await core.suggestExactThicknessPlacement(refA, refB);

    assert.equal(distance?.ok, true);
    assert.ok(Math.abs(distance.value - 40) < 1e-6);
    assert.deepEqual(distance?.refA, refA);
    assert.deepEqual(distance?.refB, refB);

    assert.equal(thickness?.ok, true);
    assert.ok(Math.abs(thickness.value - 40) < 1e-6);
    assert.deepEqual(thickness?.refA, refA);
    assert.deepEqual(thickness?.refB, refB);

    assert.equal(relation?.ok, true);
    assert.equal(relation?.kind, "parallel");
    assert.deepEqual(relation?.refA, refA);
    assert.deepEqual(relation?.refB, refB);

    assert.equal(placement?.ok, true);
    assert.equal(placement?.kind, "distance");
    assert.ok(Math.abs(placement.value - 40) < 1e-6);
    assert.deepEqual(placement?.refA, refA);
    assert.deepEqual(placement?.refB, refB);

    assert.equal(thicknessPlacement?.ok, true);
    assert.equal(thicknessPlacement?.kind, "thickness");
    assert.ok(Math.abs(thicknessPlacement.value - 40) < 1e-6);
    assert.deepEqual(thicknessPlacement?.refA, refA);
    assert.deepEqual(thicknessPlacement?.refB, refB);
  } finally {
    if (exactModelA?.exactModelId) {
      await core.releaseExactModel(exactModelA.exactModelId);
    }
    if (exactModelB?.exactModelId) {
      await core.releaseExactModel(exactModelB.exactModelId);
    }
  }
});
