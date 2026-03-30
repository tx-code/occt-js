import test from "node:test";
import assert from "node:assert/strict";
import { Scene } from "@babylonjs/core/scene.js";
import { NullEngine } from "@babylonjs/core/Engines/nullEngine.js";
import { TransformNode } from "@babylonjs/core/Meshes/transformNode.js";
import { createOcctEdgeOverlayBuilder } from "../src/index.js";

function createSimpleGeometry() {
  return {
    positions: [0, 0, 0, 20, 0, 0, 0, 10, 0],
    edges: [
      { points: [0, 0, 0, 20, 0, 0] },
      { points: [0, 0, 0, 0, 10, 0] },
    ],
  };
}

test("edge overlay builder returns tube meshes for small geometry", () => {
  const scene = new Scene(new NullEngine());
  const parent = new TransformNode("parent", scene);
  const builder = createOcctEdgeOverlayBuilder(scene, {
    tubeMaxSegments: 9999,
    tubeMaxLines: 9999,
  });

  const edgeMeshes = builder.build(createSimpleGeometry(), parent);

  assert.ok(edgeMeshes.length >= 1);
  assert.equal(edgeMeshes[0].parent, parent);
  assert.equal(edgeMeshes[0].isPickable, false);

  for (const mesh of edgeMeshes) {
    mesh.dispose(false, true);
  }
  builder.dispose();
});

test("edge overlay builder falls back to line system when thresholds are disabled", () => {
  const scene = new Scene(new NullEngine());
  const parent = new TransformNode("parent", scene);
  const builder = createOcctEdgeOverlayBuilder(scene, {
    tubeMaxSegments: 0,
    tubeMaxLines: 0,
    greasedMaxSegments: 0,
    greasedMaxLines: 0,
  });

  const edgeMeshes = builder.build(createSimpleGeometry(), parent);

  assert.equal(edgeMeshes.length, 1);
  assert.equal(edgeMeshes[0].getClassName(), "LinesMesh");
  assert.equal(edgeMeshes[0].parent, parent);

  edgeMeshes[0].dispose(false, true);
  builder.dispose();
});
