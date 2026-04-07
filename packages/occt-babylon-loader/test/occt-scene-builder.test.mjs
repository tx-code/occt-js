import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { NullEngine } from "@babylonjs/core/Engines/nullEngine.js";
import { Scene } from "@babylonjs/core/scene.js";
import { PBRMaterial } from "@babylonjs/core/Materials/PBR/pbrMaterial.js";
import { buildOcctScene } from "../src/occt-scene-builder.js";

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
    assert.ok(resources.meshes[0].material instanceof PBRMaterial);
    assert.equal(resources.meshes[0].material.albedoColor.r, 0.9);
    assert.equal(resources.meshes[0].material.albedoColor.g, 0.91);
    assert.equal(resources.meshes[0].material.albedoColor.b, 0.93);

    scene.dispose();
    engine.dispose();
  });
});
