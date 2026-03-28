import { readFileSync } from "fs";
import { dirname, resolve } from "path";
import { fileURLToPath } from "url";
import { loadOcctFactory } from "./load_occt_factory.mjs";

const factory = loadOcctFactory();
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

function flattenNodes(nodes) {
  const result = [];
  const stack = [...nodes];
  while (stack.length > 0) {
    const node = stack.pop();
    result.push(node);
    if (node.children?.length) {
      stack.push(...node.children);
    }
  }
  return result;
}

function hasValidColor(color) {
  return !!(color && typeof color.r === "number" && typeof color.g === "number" && typeof color.b === "number");
}

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

  const realisticBrepFixture = new Uint8Array(readFileSync(resolve(__dirname, "ANC101_isolated_components.brep")));
  const realisticBrepOk = m.ReadFile("brep", realisticBrepFixture, {});
  assert(realisticBrepOk && realisticBrepOk.success === true, "ReadFile(brep) should import ANC101_isolated_components.brep");
  assert(realisticBrepOk.stats && realisticBrepOk.stats.triangleCount > 0, "ANC101_isolated_components.brep should produce triangles");

  const realisticIgesFixture = new Uint8Array(readFileSync(resolve(__dirname, "bearing.igs")));
  const realisticIgesOk = m.ReadIgesFile(realisticIgesFixture, {});
  assert(realisticIgesOk && realisticIgesOk.success === true, "ReadIgesFile should import bearing.igs");
  assert(realisticIgesOk.stats && realisticIgesOk.stats.triangleCount > 0, "bearing.igs import should produce triangles");
  assert(realisticIgesOk.geometries.length > 0, "bearing.igs import should produce at least one geometry");
  assert(realisticIgesOk.geometries[0].faces.length > 0, "bearing.igs import should expose faces");
  assert(realisticIgesOk.geometries[0].edges.length > 0, "bearing.igs import should expose edges");

  const coloredStepFixture = new Uint8Array(readFileSync(resolve(__dirname, "ANC101_colored.stp")));
  const coloredStepOk = m.ReadFile("step", coloredStepFixture, {});
  assert(coloredStepOk && coloredStepOk.success === true, "ReadFile(step) should import ANC101_colored.stp");
  const coloredGeometry = coloredStepOk.geometries.some((geometry) =>
    hasValidColor(geometry.color) || geometry.faces.some((face) => hasValidColor(face.color)) || geometry.edges.some((edge) => hasValidColor(edge.color))
  );
  assert(coloredGeometry, "ANC101_colored.stp should produce at least one valid imported color");

  const namedStepFixture = new Uint8Array(readFileSync(resolve(__dirname, "gehause_rohteil_with-names.STEP")));
  const namedStepOk = m.ReadFile("step", namedStepFixture, {});
  assert(namedStepOk && namedStepOk.success === true, "ReadFile(step) should import gehause_rohteil_with-names.STEP");
  const namedNodes = flattenNodes(namedStepOk.rootNodes);
  assert(namedNodes.some((node) => typeof node.name === "string" && node.name.trim().length > 0), "gehause_rohteil_with-names.STEP should preserve at least one non-empty node name");

  console.log("PASS test_multi_format_exports");
}

main().catch((err) => {
  console.error("FAIL:", err.message ?? err);
  process.exit(1);
});
