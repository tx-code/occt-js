import { createRequire } from "module";
import { readFileSync } from "fs";
import { dirname, resolve } from "path";
import { fileURLToPath } from "url";

const require = createRequire(import.meta.url);
const factory = require("../dist/occt-js.js");
const __dirname = dirname(fileURLToPath(import.meta.url));

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}
assert.equal = function(actual, expected, message) {
  if (actual !== expected) {
    throw new Error(message + ` (got ${actual}, expected ${expected})`);
  }
};

function validateTopology(result, label) {
  const g = result.geometries[0];

  // Faces: sequential 1-based IDs
  assert(g.faces.length > 0, `${label}: should have faces`);
  for (let i = 0; i < g.faces.length; i++) {
    assert.equal(g.faces[i].id, i + 1, `${label}: face[${i}].id should be ${i + 1}`);
  }

  // Edges: sequential 1-based IDs
  assert(g.edges.length > 0, `${label}: should have edges`);
  for (let i = 0; i < g.edges.length; i++) {
    assert.equal(g.edges[i].id, i + 1, `${label}: edge[${i}].id should be ${i + 1}`);
  }

  // Vertices: sequential 1-based IDs
  assert(g.vertices.length > 0, `${label}: should have vertices`);
  for (let i = 0; i < g.vertices.length; i++) {
    assert.equal(g.vertices[i].id, i + 1, `${label}: vertex[${i}].id should be ${i + 1}`);
  }

  // Index coverage: sum of face indexCounts = indices.length
  const totalIndexCount = g.faces.reduce((sum, f) => sum + f.indexCount, 0);
  assert.equal(totalIndexCount, g.indices.length, `${label}: face indexCount sum should equal indices.length`);

  // triangleToFaceMap
  assert.equal(g.triangleToFaceMap.length, g.indices.length / 3, `${label}: triangleToFaceMap length`);
  for (let i = 0; i < g.triangleToFaceMap.length; i++) {
    const fid = g.triangleToFaceMap[i];
    assert(fid >= 1 && fid <= g.faces.length, `${label}: triangleToFaceMap[${i}]=${fid} out of range`);
  }

  // Edge ownerFaceIds validity
  for (const edge of g.edges) {
    for (const fid of edge.ownerFaceIds) {
      assert(fid >= 1 && fid <= g.faces.length, `${label}: edge ${edge.id} ownerFaceId ${fid} out of range`);
    }
    if (edge.isFreeEdge) {
      assert.equal(edge.ownerFaceIds.length, 0, `${label}: free edge ${edge.id} should have no owners`);
    }
  }

  // Face edgeIndices validity
  for (const face of g.faces) {
    for (const ei of face.edgeIndices) {
      assert(ei >= 0 && ei < g.edges.length, `${label}: face ${face.id} edgeIndex ${ei} out of range`);
    }
  }

  // Bidirectional consistency
  for (const face of g.faces) {
    for (const ei of face.edgeIndices) {
      const edge = g.edges[ei];
      assert(edge.ownerFaceIds.includes(face.id),
        `${label}: face ${face.id} lists edge ${ei} but edge's ownerFaceIds doesn't include face`);
    }
  }
  for (let ei = 0; ei < g.edges.length; ei++) {
    const edge = g.edges[ei];
    for (const fid of edge.ownerFaceIds) {
      const face = g.faces[fid - 1];
      assert(face.edgeIndices.includes(ei),
        `${label}: edge ${edge.id} lists face ${fid} but face's edgeIndices doesn't include edge`);
    }
  }
}

async function main() {
  const m = await factory();

  assert(typeof m.ReadStepFile === "function", "ReadStepFile must exist");
  assert(typeof m.ReadIgesFile === "function", "ReadIgesFile must exist");
  assert(typeof m.ReadBrepFile === "function", "ReadBrepFile must exist");
  assert(typeof m.ReadFile === "function", "ReadFile must exist");

  const bad = new Uint8Array([0x00, 0x01, 0x02]);

  const iges = m.ReadIgesFile(bad, {});
  assert(iges && iges.success === false, "ReadIgesFile should fail with success=false on invalid data");
  assert(typeof iges.error === "string" && iges.error.length > 0, "ReadIgesFile should report error text");

  const brep = m.ReadBrepFile(bad, {});
  assert(brep && brep.success === false, "ReadBrepFile should fail with success=false on invalid data");
  assert(typeof brep.error === "string" && brep.error.length > 0, "ReadBrepFile should report error text");

  const stepViaReadFile = m.ReadFile("step", bad, {});
  assert(stepViaReadFile && stepViaReadFile.success === false, "ReadFile(step) should dispatch and fail on invalid data");

  const unsupported = m.ReadFile("obj", bad, {});
  assert(unsupported && unsupported.success === false, "ReadFile(unknown) should return success=false");

  const igesFixture = new Uint8Array(readFileSync(resolve(__dirname, "cube_10x10.igs")));
  const igesOk = m.ReadIgesFile(igesFixture, {});
  assert(igesOk && igesOk.success === true, "ReadIgesFile should import a valid IGES file");
  assert(igesOk.stats && igesOk.stats.triangleCount > 0, "IGES import should produce triangles");
  validateTopology(igesOk, "IGES");

  const igesViaReadFile = m.ReadFile("iges", igesFixture, {});
  assert(igesViaReadFile && igesViaReadFile.success === true, "ReadFile(iges) should import a valid IGES file");
  assert(igesViaReadFile.stats && igesViaReadFile.stats.triangleCount > 0, "ReadFile(iges) should produce triangles");
  validateTopology(igesViaReadFile, "IGES via ReadFile");

  const brepFixture = new Uint8Array(readFileSync(resolve(__dirname, "as1_pe_203.brep")));
  const brepOk = m.ReadFile("brep", brepFixture, {});
  assert(brepOk && brepOk.success === true, "ReadFile(brep) should import a valid BREP file");
  assert(brepOk.stats && brepOk.stats.triangleCount > 0, "ReadFile(brep) should produce triangles");
  validateTopology(brepOk, "BREP");

  console.log("PASS test_multi_format_exports");
}

main().catch((err) => {
  console.error("FAIL:", err.message ?? err);
  process.exit(1);
});
