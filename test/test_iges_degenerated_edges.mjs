import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { loadOcctFactory } from "./load_occt_factory.mjs";

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

async function main() {
  const factory = loadOcctFactory();
  const m = await factory();

  const igesFixture = new Uint8Array(readFileSync(resolve("test", "bearing.igs")));
  const result = m.ReadIgesFile(igesFixture, {});
  assert(result.success, "ReadIgesFile should import bearing.igs");
  assert(result.geometries.length > 0, "bearing.igs should produce at least one geometry");

  const geometry = result.geometries[0];
  let sawDegeneratedFaceEdge = false;

  for (const face of geometry.faces) {
    for (const edgeIndex of face.edgeIndices) {
      const edge = geometry.edges[edgeIndex];
      if (edge.points.length === 0) {
        sawDegeneratedFaceEdge = true;
      }
      assert(
        edge.ownerFaceIds.includes(face.id),
        `bearing.igs: face ${face.id} lists edge ${edgeIndex} but edge ${edge.id} ownerFaceIds are ${JSON.stringify(edge.ownerFaceIds)}`
      );
    }
  }

  assert(sawDegeneratedFaceEdge, "bearing.igs should exercise at least one degenerated face edge");

  console.log("PASS test_iges_degenerated_edges");
}

main().catch((error) => {
  console.error("FAIL:", error.message ?? error);
  process.exit(1);
});
