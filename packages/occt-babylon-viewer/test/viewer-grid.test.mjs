import test from "node:test";
import assert from "node:assert/strict";
import { Scene } from "@babylonjs/core/scene.js";
import { NullEngine } from "@babylonjs/core/Engines/nullEngine.js";
import { createOcctBabylonViewer } from "../src/index.js";

test("viewer toggles grid and axes helper visibility", () => {
  const scene = new Scene(new NullEngine());
  const viewer = createOcctBabylonViewer(scene);

  viewer.setGridVisible(false);
  viewer.setAxesVisible(false);

  const state = viewer.getSceneState();
  assert.equal(state.gridVisible, false);
  assert.equal(state.axesVisible, false);
});
