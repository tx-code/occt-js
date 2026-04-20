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

test("BuildRevolvedTool builds an endmill-like spec into a canonical generated scene payload", async () => {
  const module = await createModule();
  const result = module.BuildRevolvedTool(createEndmillLikeSpec(), {});

  assertCanonicalGeneratedResult(result, "endmill-like full revolve");
  assert.ok(result.geometries.length > 0);
  assert.ok(result.materials.length > 0);
  assert.ok(result.stats.triangleCount > 0);
  validateTopology(result.geometries[0], "endmill-like full revolve");
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

test("BuildRevolvedTool emits additive generatedTool metadata without claiming stable face bindings yet", async () => {
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
  assert.equal(result.generatedTool.hasStableFaceBindings, false);
  assert.ok(Array.isArray(result.generatedTool.segments));
  assert.equal(result.generatedTool.segments.length, spec.profile.segments.length);
  assert.equal(result.generatedTool.faceBindings, undefined);
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
