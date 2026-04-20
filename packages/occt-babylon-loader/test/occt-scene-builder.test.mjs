import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { NullEngine } from "@babylonjs/core/Engines/nullEngine.js";
import { Scene } from "@babylonjs/core/scene.js";
import { buildOcctScene } from "../src/occt-scene-builder.js";

function assertColorApprox(actual, expected, epsilon = 1e-5) {
  assert.equal(actual.length, expected.length);
  for (let index = 0; index < actual.length; index += 1) {
    assert.ok(Math.abs(actual[index] - expected[index]) <= epsilon);
  }
}

describe("buildOcctScene", () => {
  it("creates CAD part materials with the shared viewer preset", () => {
    const engine = new NullEngine();
    const scene = new Scene(engine);

    const resources = buildOcctScene(
      {
        geometries: [
          {
            id: "geo_0",
            indices: [0, 1, 2],
            positions: [0, 0, 0, 10, 0, 0, 0, 5, 0],
          },
        ],
        materials: [
          {
            baseColor: [0.9, 0.91, 0.93, 1],
            id: "mat_0",
          },
        ],
        rootNodes: [
          {
            children: [],
            geometryIds: ["geo_0"],
            id: "node_0",
            kind: "part",
            materialIds: ["mat_0"],
          },
        ],
      },
      scene,
    );

    assert.equal(resources.meshes.length, 1);
    assert.equal(resources.meshes[0].material?.getClassName?.(), "PBRMaterial");
    assert.equal(resources.meshes[0].material.albedoColor.r, 0.9);
    assert.equal(resources.meshes[0].material.albedoColor.g, 0.91);
    assert.equal(resources.meshes[0].material.albedoColor.b, 0.93);

    scene.dispose();
    engine.dispose();
  });

  it("promotes face colors into vertex-colored render buffers for semantic CAD surfaces", () => {
    const engine = new NullEngine();
    const scene = new Scene(engine);

    const resources = buildOcctScene(
      {
        geometries: [
          {
            id: "geo_0",
            positions: [0, 0, 0, 1, 0, 0, 1, 1, 0, 0, 1, 0],
            indices: [0, 1, 2, 0, 2, 3],
            faces: [
              {
                id: 1,
                firstIndex: 0,
                indexCount: 3,
                edgeIndices: [],
                color: [0.9, 0.7, 0.2, 1],
              },
              {
                id: 2,
                firstIndex: 3,
                indexCount: 3,
                edgeIndices: [],
                color: [0.2, 0.7, 0.9, 1],
              },
            ],
            color: [0.8, 0.82, 0.86, 1],
          },
        ],
        materials: [
          {
            baseColor: [0.8, 0.82, 0.86, 1],
            id: "mat_0",
          },
        ],
        rootNodes: [
          {
            children: [],
            geometryIds: ["geo_0"],
            id: "node_0",
            kind: "part",
            materialIds: ["mat_0"],
          },
        ],
      },
      scene,
    );

    const mesh = resources.meshes[0];
    const colorBuffer = mesh.getVerticesData("color");

    assert.equal(mesh.useVertexColors, true);
    assert.equal(colorBuffer.length, 24);
    assert.deepEqual(Array.from(mesh.getIndices()), [0, 1, 2, 3, 4, 5]);
    assertColorApprox(Array.from(colorBuffer.slice(0, 4)), [0.9, 0.7, 0.2, 1]);
    assertColorApprox(Array.from(colorBuffer.slice(12, 16)), [0.2, 0.7, 0.9, 1]);

    scene.dispose();
    engine.dispose();
  });
});
