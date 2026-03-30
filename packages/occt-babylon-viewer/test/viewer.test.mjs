import test from "node:test";
import assert from "node:assert/strict";
import { Scene } from "@babylonjs/core/scene.js";
import { NullEngine } from "@babylonjs/core/Engines/nullEngine.js";
import { createOcctBabylonViewer } from "../src/index.js";

test("createOcctBabylonViewer attaches to a supplied scene", () => {
  const engine = new NullEngine();
  const scene = new Scene(engine);

  const viewer = createOcctBabylonViewer(scene);

  assert.equal(viewer.getScene(), scene);
  assert.equal(typeof viewer.dispose, "function");
  assert.equal(typeof viewer.loadOcctModel, "function");
});
