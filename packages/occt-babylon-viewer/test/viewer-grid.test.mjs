import test from "node:test";
import assert from "node:assert/strict";
import { Scene } from "@babylonjs/core/scene.js";
import { NullEngine } from "@babylonjs/core/Engines/nullEngine.js";
import { Vector3 } from "@babylonjs/core/Maths/math.vector.js";
import { createOcctBabylonViewer } from "../src/index.js";
import { createGridHelpers } from "../src/viewer-grid.js";

test("viewer toggles grid and axes helper visibility", () => {
  const scene = new Scene(new NullEngine());
  const viewer = createOcctBabylonViewer(scene);

  viewer.setGridVisible(false);
  viewer.setAxesVisible(false);

  const state = viewer.getSceneState();
  assert.equal(state.gridVisible, false);
  assert.equal(state.axesVisible, false);
});

test("grid helpers are centered around supplied bounds", () => {
  const scene = new Scene(new NullEngine());
  const bounds = {
    min: new Vector3(10, 2, 20),
    max: new Vector3(14, 6, 30),
  };
  const expectedCenterX = (bounds.min.x + bounds.max.x) * 0.5;
  const expectedCenterZ = (bounds.min.z + bounds.max.z) * 0.5;

  const helpers = createGridHelpers(scene, bounds);
  const xAxisCenter = helpers.xAxis.getBoundingInfo().boundingBox.center;
  const zAxisCenter = helpers.zAxis.getBoundingInfo().boundingBox.center;

  assert.equal(helpers.ground.position.x, expectedCenterX);
  assert.equal(helpers.ground.position.z, expectedCenterZ);
  assert.equal(xAxisCenter.x, expectedCenterX);
  assert.equal(xAxisCenter.z, expectedCenterZ);
  assert.equal(zAxisCenter.x, expectedCenterX);
  assert.equal(zAxisCenter.z, expectedCenterZ);
});
