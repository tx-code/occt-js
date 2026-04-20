import test from "node:test";
import assert from "node:assert/strict";
import { loadOcctFactory } from "./load_occt_factory.mjs";

const factory = loadOcctFactory();

async function createModule() {
  return factory();
}

function createEndmillLikeSpec() {
  return {
    version: 1,
    units: "mm",
    profile: {
      plane: "XZ",
      start: [0, 0],
      closure: "explicit",
      segments: [
        { kind: "line", id: "tip-axis", tag: "tip", end: [3, 0] },
        { kind: "line", id: "flank", tag: "cutting", end: [4, 1] },
        { kind: "arc_center", id: "corner-radius", tag: "corner", center: [3, 1], end: [3, 2] },
        { kind: "line", id: "body", tag: "cutting", end: [3, 8] },
        { kind: "line", id: "axis-top", tag: "closure", end: [0, 8] },
        { kind: "line", id: "axis-return", tag: "closure", end: [0, 0] },
      ],
    },
    revolve: {
      angleDeg: 360,
    },
  };
}

function createDrillLikePartialSpec() {
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
    revolve: {
      angleDeg: 210,
    },
  };
}

function createCollinearFailureSpec() {
  return {
    version: 1,
    units: "mm",
    profile: {
      plane: "XZ",
      start: [0, 0],
      closure: "explicit",
      segments: [
        { kind: "line", end: [4, 0] },
        { kind: "line", end: [2, 0] },
        { kind: "line", end: [0, 0] },
      ],
    },
    revolve: {
      angleDeg: 360,
    },
  };
}

function assertTypedDiagnostics(result) {
  assert.ok(Array.isArray(result?.diagnostics), "diagnostics should be an array");
  for (const diagnostic of result.diagnostics) {
    assert.ok(diagnostic && typeof diagnostic === "object");
    assert.equal(typeof diagnostic.code, "string");
    assert.equal(typeof diagnostic.message, "string");
    assert.equal(diagnostic.severity, "error");
  }
}

function assertCanonicalGeneratedResult(result, label) {
  assert.ok(result && typeof result === "object", `${label}: result should be an object`);
  assert.equal(result.success, true, `${label}: success should be true`);
  assert.equal(result.sourceFormat, "generated-revolved-tool", `${label}: sourceFormat should be canonical`);
  assert.ok(Array.isArray(result.rootNodes), `${label}: rootNodes should be an array`);
  assert.ok(Array.isArray(result.geometries), `${label}: geometries should be an array`);
  assert.ok(Array.isArray(result.materials), `${label}: materials should be an array`);
  assert.ok(Array.isArray(result.warnings), `${label}: warnings should be an array`);
  assert.ok(result.stats && typeof result.stats === "object", `${label}: stats should be an object`);
  assert.equal(result.stats.rootCount, result.rootNodes.length, `${label}: stats.rootCount parity`);
  assert.equal(result.stats.geometryCount, result.geometries.length, `${label}: stats.geometryCount parity`);
  assert.equal(result.stats.materialCount, result.materials.length, `${label}: stats.materialCount parity`);
}

function validateTopology(geometry, label) {
  assert.ok(geometry.positions.length > 0, `${label}: positions should not be empty`);
  assert.ok(geometry.normals.length > 0, `${label}: normals should not be empty`);
  assert.ok(geometry.indices.length > 0, `${label}: indices should not be empty`);
  assert.equal(geometry.positions.length % 3, 0, `${label}: positions should be XYZ triplets`);
  assert.equal(geometry.normals.length % 3, 0, `${label}: normals should be XYZ triplets`);
  assert.equal(geometry.indices.length % 3, 0, `${label}: indices should be triangles`);
  assert.equal(geometry.triangleToFaceMap.length, geometry.indices.length / 3, `${label}: triangleToFaceMap parity`);

  for (let index = 0; index < geometry.faces.length; index += 1) {
    assert.equal(geometry.faces[index].id, index + 1, `${label}: face ids should be sequential`);
  }
  for (let index = 0; index < geometry.edges.length; index += 1) {
    assert.equal(geometry.edges[index].id, index + 1, `${label}: edge ids should be sequential`);
  }
  for (let index = 0; index < geometry.vertices.length; index += 1) {
    assert.equal(geometry.vertices[index].id, index + 1, `${label}: vertex ids should be sequential`);
  }

  const totalIndexCount = geometry.faces.reduce((sum, face) => sum + face.indexCount, 0);
  assert.equal(totalIndexCount, geometry.indices.length, `${label}: face index coverage`);

  for (const face of geometry.faces) {
    for (const edgeIndex of face.edgeIndices ?? []) {
      assert.ok(edgeIndex >= 0 && edgeIndex < geometry.edges.length, `${label}: face edgeIndices should be valid`);
      assert.ok(geometry.edges[edgeIndex].ownerFaceIds.includes(face.id), `${label}: face/edge ownership should be bidirectional`);
    }
  }

  for (let edgeIndex = 0; edgeIndex < geometry.edges.length; edgeIndex += 1) {
    const edge = geometry.edges[edgeIndex];
    for (const faceId of edge.ownerFaceIds ?? []) {
      assert.ok(faceId >= 1 && faceId <= geometry.faces.length, `${label}: ownerFaceIds should be in range`);
      assert.ok(geometry.faces[faceId - 1].edgeIndices.includes(edgeIndex), `${label}: edge/face ownership should be bidirectional`);
    }
  }
}

function analyzeWeldedMeshTopology(geometry, tolerance = 1e-6) {
  const vertexCount = Math.floor((geometry.positions?.length ?? 0) / 3);
  const weldedIds = new Map();
  const weldedVertices = new Array(vertexCount);
  let weldedVertexCount = 0;

  for (let vertexIndex = 0; vertexIndex < vertexCount; vertexIndex += 1) {
    const offset = vertexIndex * 3;
    const key = [
      Math.round(geometry.positions[offset] / tolerance),
      Math.round(geometry.positions[offset + 1] / tolerance),
      Math.round(geometry.positions[offset + 2] / tolerance),
    ].join(":");
    if (!weldedIds.has(key)) {
      weldedIds.set(key, weldedVertexCount);
      weldedVertexCount += 1;
    }
    weldedVertices[vertexIndex] = weldedIds.get(key);
  }

  const edgeUseCount = new Map();
  for (let indexOffset = 0; indexOffset < geometry.indices.length; indexOffset += 3) {
    const triangle = [
      weldedVertices[geometry.indices[indexOffset]],
      weldedVertices[geometry.indices[indexOffset + 1]],
      weldedVertices[geometry.indices[indexOffset + 2]],
    ];
    if (triangle[0] === triangle[1] || triangle[1] === triangle[2] || triangle[2] === triangle[0]) {
      continue;
    }

    for (let edgeIndex = 0; edgeIndex < 3; edgeIndex += 1) {
      const left = triangle[edgeIndex];
      const right = triangle[(edgeIndex + 1) % 3];
      const key = left < right ? `${left}:${right}` : `${right}:${left}`;
      edgeUseCount.set(key, (edgeUseCount.get(key) ?? 0) + 1);
    }
  }

  let boundaryEdgeCount = 0;
  let nonManifoldEdgeCount = 0;
  for (const count of edgeUseCount.values()) {
    if (count === 1) {
      boundaryEdgeCount += 1;
    } else if (count > 2) {
      nonManifoldEdgeCount += 1;
    }
  }

  return {
    weldedVertexCount,
    boundaryEdgeCount,
    nonManifoldEdgeCount,
  };
}

function assertGeneratedToolShapeValidation(result, label) {
  const geometry = result.geometries[0];
  const validation = result.generatedTool?.shapeValidation;
  assert.ok(validation && typeof validation === "object", `${label}: shapeValidation should be present`);
  assert.ok(validation.exact && typeof validation.exact === "object", `${label}: exact validation should be present`);
  assert.ok(validation.mesh && typeof validation.mesh === "object", `${label}: mesh validation should be present`);

  const welded = analyzeWeldedMeshTopology(geometry);
  assert.equal(validation.mesh.weldedVertexCount, welded.weldedVertexCount, `${label}: welded vertex count parity`);
  assert.equal(validation.mesh.boundaryEdgeCount, welded.boundaryEdgeCount, `${label}: boundary edge count parity`);
  assert.equal(validation.mesh.nonManifoldEdgeCount, welded.nonManifoldEdgeCount, `${label}: non-manifold edge count parity`);
  assert.equal(validation.mesh.isManifold, welded.nonManifoldEdgeCount === 0, `${label}: isManifold parity`);
  assert.equal(
    validation.mesh.isWatertight,
    welded.boundaryEdgeCount === 0 && welded.nonManifoldEdgeCount === 0,
    `${label}: isWatertight parity`,
  );

  assert.equal(validation.exact.isValid, true, `${label}: exact shape should validate successfully`);
  assert.equal(validation.exact.isClosed, true, `${label}: exact shape should be closed`);
  assert.equal(validation.exact.isSolid, true, `${label}: exact shape should contain at least one solid`);
  assert.equal(typeof validation.exact.shapeType, "string", `${label}: exact shape type should be present`);
  assert.ok(validation.exact.shapeType.length > 0, `${label}: exact shape type should not be empty`);
  assert.ok(validation.exact.solidCount >= 1, `${label}: exact shape should expose at least one solid`);
  assert.equal(validation.exact.faceCount, geometry.faces.length, `${label}: face count parity`);
  assert.equal(validation.exact.edgeCount, geometry.edges.length, `${label}: edge count parity`);
  assert.equal(validation.exact.vertexCount, geometry.vertices.length, `${label}: vertex count parity`);
}

function roundColor(color) {
  return {
    r: Number(color.r.toFixed(6)),
    g: Number(color.g.toFixed(6)),
    b: Number(color.b.toFixed(6)),
  };
}

function colorKey(color) {
  const rounded = roundColor(color);
  return JSON.stringify([rounded.r, rounded.g, rounded.b]);
}

function faceColorKeyMap(geometry) {
  return new Map((geometry.faces ?? []).map((face) => [face.id, face.color ? colorKey(face.color) : null]));
}

function assertStableFaceBindings(result, spec, label) {
  const geometry = result.geometries[0];
  const faceIds = new Set((geometry.faces ?? []).map((face) => face.id));
  const faceBindings = result.generatedTool?.faceBindings;

  assert.equal(result.generatedTool.hasStableFaceBindings, true, `${label}: stable face bindings should be enabled`);
  assert.ok(Array.isArray(faceBindings), `${label}: faceBindings should be an array`);
  assert.ok(faceBindings.length > 0, `${label}: faceBindings should not be empty`);
  assert.ok(
    geometry.faces.every((face) => face.color && typeof face.color.r === "number"),
    `${label}: generated faces should expose deterministic default colors`,
  );

  for (const binding of faceBindings) {
    assert.equal(binding.geometryIndex, 0, `${label}: generated tools currently bind against geometry 0`);
    assert.ok(faceIds.has(binding.faceId), `${label}: faceId should exist in emitted geometry`);
    assert.ok(
      ["profile", "closure", "axis", "start_cap", "end_cap", "degenerated"].includes(binding.systemRole),
      `${label}: systemRole should be a supported runtime role`,
    );

    if (binding.segmentIndex !== undefined) {
      assert.ok(
        binding.segmentIndex >= 0 && binding.segmentIndex < spec.profile.segments.length,
        `${label}: segmentIndex should be in range`,
      );
      const segment = spec.profile.segments[binding.segmentIndex];
      if (segment.id !== undefined) {
        assert.equal(binding.segmentId, segment.id, `${label}: segmentId should echo the originating segment id`);
      }
      if (segment.tag !== undefined) {
        assert.equal(binding.segmentTag, segment.tag, `${label}: segmentTag should echo the originating segment tag`);
      }
    } else {
      assert.equal(binding.segmentId, undefined, `${label}: system-owned bindings should not claim a segmentId`);
      assert.equal(binding.segmentTag, undefined, `${label}: system-owned bindings should not claim a segmentTag`);
    }
  }
}

test("BuildRevolvedTool builds an endmill-like spec into a canonical generated scene payload", async () => {
  const module = await createModule();
  const result = module.BuildRevolvedTool(createEndmillLikeSpec(), {});

  assertCanonicalGeneratedResult(result, "endmill-like full revolve");
  assert.ok(result.geometries.length > 0);
  assert.ok(result.materials.length > 0);
  assert.ok(result.stats.triangleCount > 0);
  validateTopology(result.geometries[0], "endmill-like full revolve");
});

test("BuildRevolvedTool emits a welded-manifold mesh for the endmill-like full revolve", async () => {
  const module = await createModule();
  const result = module.BuildRevolvedTool(createEndmillLikeSpec(), {});

  assertCanonicalGeneratedResult(result, "endmill-like welded manifold");
  const welded = analyzeWeldedMeshTopology(result.geometries[0]);
  assert.equal(welded.boundaryEdgeCount, 0, "endmill-like welded manifold: mesh should not expose free boundary edges");
  assert.equal(welded.nonManifoldEdgeCount, 0, "endmill-like welded manifold: mesh should not expose non-manifold welded edges");
});

test("BuildRevolvedTool reports exact and mesh validation metadata for the full revolve", async () => {
  const module = await createModule();
  const result = module.BuildRevolvedTool(createEndmillLikeSpec(), {});

  assertCanonicalGeneratedResult(result, "endmill-like validation metadata");
  assertGeneratedToolShapeValidation(result, "endmill-like validation metadata");
});

test("BuildRevolvedTool builds a drill-like partial revolve and keeps topology invariants intact", async () => {
  const module = await createModule();
  const result = module.BuildRevolvedTool(createDrillLikePartialSpec(), {});

  assertCanonicalGeneratedResult(result, "drill-like partial revolve");
  assert.ok(result.geometries.length === 1, "partial revolve should still emit one generated geometry");
  assert.ok(result.rootNodes.length === 1, "partial revolve should emit one root node");
  assert.ok(result.geometries[0].positions.length > 0);
  assert.ok(result.geometries[0].indices.length > 0);
  validateTopology(result.geometries[0], "drill-like partial revolve");
});

test("BuildRevolvedTool emits stable generatedTool face bindings with runtime roles", async () => {
  const module = await createModule();
  const spec = createEndmillLikeSpec();
  const result = module.BuildRevolvedTool(spec, {});

  assertCanonicalGeneratedResult(result, "generatedTool metadata");
  assert.ok(result.generatedTool && typeof result.generatedTool === "object");
  assert.equal(result.generatedTool.version, 1);
  assert.equal(result.generatedTool.units, spec.units);
  assert.equal(result.generatedTool.plane, "XZ");
  assert.equal(result.generatedTool.closure, spec.profile.closure);
  assert.equal(result.generatedTool.angleDeg, 360);
  assert.equal(result.generatedTool.segmentCount, spec.profile.segments.length);
  assert.ok(Array.isArray(result.generatedTool.segments));
  assert.equal(result.generatedTool.segments.length, spec.profile.segments.length);
  assertStableFaceBindings(result, spec, "generatedTool metadata");

  const roleSet = new Set(result.generatedTool.faceBindings.map((binding) => binding.systemRole));
  assert.ok(roleSet.has("profile"), "generatedTool metadata: full revolve should expose profile bindings");
  assert.ok(roleSet.has("closure"), "generatedTool metadata: full revolve should expose closure bindings");
  assert.ok(
    result.generatedTool.faceBindings.some((binding) => binding.segmentId === "flank"),
    "generatedTool metadata: segment bindings should preserve caller segment ids",
  );

  const faceColors = faceColorKeyMap(result.geometries[0]);
  const closureKeys = new Set(
    result.generatedTool.faceBindings
      .filter((binding) => binding.systemRole === "closure")
      .map((binding) => faceColors.get(binding.faceId)),
  );
  const cuttingKeys = new Set(
    result.generatedTool.faceBindings
      .filter((binding) => binding.systemRole === "profile" && binding.segmentTag === "cutting")
      .map((binding) => faceColors.get(binding.faceId)),
  );
  const profileKeys = new Set(
    result.generatedTool.faceBindings
      .filter((binding) => binding.systemRole === "profile")
      .map((binding) => faceColors.get(binding.faceId)),
  );

  assert.equal(closureKeys.size, 1, "generatedTool metadata: closure faces should collapse to one runtime-owned appearance");
  assert.equal(cuttingKeys.size, 1, "generatedTool metadata: matching cutting tags should collapse to one appearance group");
  assert.ok(profileKeys.size >= 2, "generatedTool metadata: different profile semantics should produce multiple appearances");
  assert.notEqual(
    [...closureKeys][0],
    [...cuttingKeys][0],
    "generatedTool metadata: closure appearance should stay distinct from cutting profile appearance",
  );
  assert.ok(result.materials.length >= 4, "generatedTool metadata: materials should reflect grouped face appearances plus fallback geometry color");
});

test("BuildRevolvedTool reports runtime-owned cap bindings for partial revolves", async () => {
  const module = await createModule();
  const spec = createDrillLikePartialSpec();
  const result = module.BuildRevolvedTool(spec, {});

  assertCanonicalGeneratedResult(result, "partial revolve face bindings");
  assertStableFaceBindings(result, spec, "partial revolve face bindings");

  const roleSet = new Set(result.generatedTool.faceBindings.map((binding) => binding.systemRole));
  assert.ok(roleSet.has("profile"), "partial revolve face bindings: partial revolve should expose profile bindings");
  assert.ok(roleSet.has("closure"), "partial revolve face bindings: partial revolve should expose closure bindings");
  assert.ok(roleSet.has("start_cap"), "partial revolve face bindings: partial revolve should expose a start cap");
  assert.ok(roleSet.has("end_cap"), "partial revolve face bindings: partial revolve should expose an end cap");
  assert.ok(
    result.generatedTool.faceBindings.some(
      (binding) => binding.systemRole === "start_cap" && binding.segmentIndex === undefined,
    ),
    "partial revolve face bindings: system-owned caps should not claim caller segment indices",
  );

  const faceColors = faceColorKeyMap(result.geometries[0]);
  const startCapKey = faceColors.get(
    result.generatedTool.faceBindings.find((binding) => binding.systemRole === "start_cap").faceId,
  );
  const endCapKey = faceColors.get(
    result.generatedTool.faceBindings.find((binding) => binding.systemRole === "end_cap").faceId,
  );
  const closureKey = faceColors.get(
    result.generatedTool.faceBindings.find((binding) => binding.systemRole === "closure").faceId,
  );

  assert.ok(startCapKey, "partial revolve face bindings: start cap should carry a deterministic color");
  assert.ok(endCapKey, "partial revolve face bindings: end cap should carry a deterministic color");
  assert.notEqual(startCapKey, endCapKey, "partial revolve face bindings: start/end caps should remain visually distinguishable");
  assert.notEqual(startCapKey, closureKey, "partial revolve face bindings: cap appearance should stay distinct from closure appearance");
});

test("BuildRevolvedTool reports exact and mesh validation metadata for the partial revolve", async () => {
  const module = await createModule();
  const result = module.BuildRevolvedTool(createDrillLikePartialSpec(), {});

  assertCanonicalGeneratedResult(result, "partial revolve validation metadata");
  assertGeneratedToolShapeValidation(result, "partial revolve validation metadata");
});

test("BuildRevolvedTool preserves explicit diagnostics for validation-passing specs that OCCT cannot build", async () => {
  const module = await createModule();
  const result = module.BuildRevolvedTool(createCollinearFailureSpec(), {});

  assert.equal(result?.success, false);
  assert.equal(result?.sourceFormat, "generated-revolved-tool");
  assert.equal(typeof result?.error, "string");
  assert.ok(result.error.length > 0);
  assertTypedDiagnostics(result);
  assert.ok(result.diagnostics.some((diagnostic) => diagnostic.code === "build-failed"));
});
