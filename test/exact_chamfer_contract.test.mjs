import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { loadOcctFactory } from "./load_occt_factory.mjs";

const FIXTURE = { name: "ANC101.stp", opener: "OpenExactStepModel" };

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

function describeExactChamfer(module, ref) {
  return module.DescribeExactChamfer(
    ref.exactModelId,
    ref.exactShapeHandle,
    ref.kind,
    ref.elementId,
  );
}

function dot(left, right) {
  return left[0] * right[0] + left[1] * right[1] + left[2] * right[2];
}

function getFaceTriangleCentroid(geometry, face) {
  const triangleIndices = Array.from(geometry.indices.slice(face.firstIndex, face.firstIndex + 3));
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

function assertPlacementFrame(frame) {
  assert.ok(frame && typeof frame === "object");
  for (const key of ["origin", "normal", "xDir", "yDir"]) {
    assert.ok(Array.isArray(frame[key]) && frame[key].length === 3, `${key} should be a 3D vector`);
  }
}

function assertChamferResult(result) {
  assert.equal(result?.ok, true);
  assert.equal(result?.kind, "chamfer");
  assert.equal(result?.profile, "planar");
  assert.ok(result?.variant === "equal-distance" || result?.variant === "two-distance");
  assert.equal(typeof result?.distanceA, "number");
  assert.equal(typeof result?.distanceB, "number");
  assert.ok(result.distanceA > 0);
  assert.ok(result.distanceB > 0);
  assert.equal(typeof result?.supportAngle, "number");
  assert.ok(result.supportAngle > 0);
  assertPlacementFrame(result.frame);
  assert.ok(Array.isArray(result?.anchors) && result.anchors.length >= 2);
  assert.ok(Array.isArray(result?.edgeDirection) && result.edgeDirection.length === 3);
  assert.ok(Array.isArray(result?.supportNormalA) && result.supportNormalA.length === 3);
  assert.ok(Array.isArray(result?.supportNormalB) && result.supportNormalB.length === 3);
}

function collectPlanarFaceInfo(module, result, geometryIndex) {
  const geometry = result.geometries[geometryIndex];
  const handle = result.exactGeometryBindings[geometryIndex].exactShapeHandle;
  const planarFaces = new Map();

  for (const face of geometry.faces ?? []) {
    const family = module.GetExactGeometryType(result.exactModelId, handle, "face", face.id);
    if (family?.ok !== true || family.family !== "plane") {
      continue;
    }

    const normal = module.EvaluateExactFaceNormal(
      result.exactModelId,
      handle,
      "face",
      face.id,
      getFaceTriangleCentroid(geometry, face),
    );
    if (normal?.ok !== true) {
      continue;
    }

    planarFaces.set(face.id, {
      face,
      normal: normal.localNormal,
    });
  }

  return planarFaces;
}

function countObliquePlanarSupports(geometry, planarFaces, faceId) {
  const info = planarFaces.get(faceId);
  if (!info) {
    return [];
  }

  const supportIds = new Set();
  for (const edgeIndex of info.face.edgeIndices ?? []) {
    const edge = geometry.edges?.[edgeIndex];
    for (const ownerFaceId of edge?.ownerFaceIds ?? []) {
      if (ownerFaceId === faceId) {
        continue;
      }
      const adjacent = planarFaces.get(ownerFaceId);
      if (!adjacent) {
        continue;
      }
      const alignment = Math.abs(dot(info.normal, adjacent.normal));
      if (alignment < 0.999 && alignment > 1e-4) {
        supportIds.add(ownerFaceId);
      }
    }
  }

  return [...supportIds];
}

function findSupportedChamferCandidate(module, result) {
  for (let geometryIndex = 0; geometryIndex < result.geometries.length; geometryIndex += 1) {
    const geometry = result.geometries[geometryIndex];
    const planarFaces = collectPlanarFaceInfo(module, result, geometryIndex);

    for (const faceId of planarFaces.keys()) {
      const supportIds = countObliquePlanarSupports(geometry, planarFaces, faceId);
      if (supportIds.length !== 2) {
        continue;
      }
      const supportAlignment = Math.abs(dot(
        planarFaces.get(supportIds[0]).normal,
        planarFaces.get(supportIds[1]).normal,
      ));
      if (supportAlignment >= 0.999) {
        continue;
      }
      return {
        geometryIndex,
        faceRef: getExactRef(result, geometryIndex, "face", faceId),
      };
    }
  }

  return null;
}

function findUnsupportedPlanarCandidate(module, result, excluded = new Set()) {
  for (let geometryIndex = 0; geometryIndex < result.geometries.length; geometryIndex += 1) {
    const geometry = result.geometries[geometryIndex];
    const planarFaces = collectPlanarFaceInfo(module, result, geometryIndex);

    for (const faceId of planarFaces.keys()) {
      const key = `${geometryIndex}:face:${faceId}`;
      if (excluded.has(key)) {
        continue;
      }
      const supportIds = countObliquePlanarSupports(geometry, planarFaces, faceId);
      const isSupported = supportIds.length === 2 && Math.abs(dot(
        planarFaces.get(supportIds[0]).normal,
        planarFaces.get(supportIds[1]).normal,
      )) < 0.999;
      if (isSupported) {
        continue;
      }
      return {
        geometryIndex,
        faceRef: getExactRef(result, geometryIndex, "face", faceId),
      };
    }
  }

  return null;
}

async function openFixture(module, fixture) {
  const bytes = await loadFixture(fixture.name);
  const result = module[fixture.opener](bytes, {});
  assert.equal(result?.success, true, `${fixture.name} should open as an exact model fixture`);
  return result;
}

test("exact chamfer helper describes a supported planar chamfer face ref", async () => {
  const module = await createModule();
  const result = await openFixture(module, FIXTURE);

  try {
    const candidate = findSupportedChamferCandidate(module, result);
    assert.ok(candidate, "ANC101.stp should expose a supported planar chamfer-face candidate");

    const chamfer = describeExactChamfer(module, candidate.faceRef);

    assertChamferResult(chamfer);
    assert.ok(chamfer.anchors.some((anchor) => anchor.role === "support-a"));
    assert.ok(chamfer.anchors.some((anchor) => anchor.role === "support-b"));
  } finally {
    module.ReleaseExactModel(result.exactModelId);
  }
});

test("exact chamfer helper failures stay explicit for unsupported or non-chamfer planar faces", async () => {
  const module = await createModule();
  const result = await openFixture(module, FIXTURE);

  try {
    const supported = findSupportedChamferCandidate(module, result);
    assert.ok(supported, "ANC101.stp should expose a supported planar chamfer-face candidate");

    const unsupported = findUnsupportedPlanarCandidate(module, result, new Set([
      `${supported.geometryIndex}:face:${supported.faceRef.elementId}`,
    ]));
    assert.ok(unsupported, "ANC101.stp should expose at least one unsupported planar face candidate");

    const chamfer = describeExactChamfer(module, unsupported.faceRef);

    assert.equal(chamfer?.ok, false);
    assert.equal(chamfer?.code, "unsupported-geometry");
    assert.equal(typeof chamfer?.message, "string");
    assert.ok(chamfer.message.length > 0);
  } finally {
    module.ReleaseExactModel(result.exactModelId);
  }
});
