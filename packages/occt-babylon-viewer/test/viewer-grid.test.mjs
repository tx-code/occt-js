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
  const expectedCenterY = (bounds.min.y + bounds.max.y) * 0.5;

  const helpers = createGridHelpers(scene, bounds);
  const xAxisCenter = helpers.xAxis.getBoundingInfo().boundingBox.center;
  const yAxisCenter = helpers.yAxis.getBoundingInfo().boundingBox.center;

  assert.equal(helpers.ground.position.x, expectedCenterX);
  assert.equal(helpers.ground.position.y, expectedCenterY);
  assert.equal(helpers.ground.position.z, bounds.min.z - 0.01);
  assert.equal(xAxisCenter.x, expectedCenterX);
  assert.equal(xAxisCenter.y, expectedCenterY);
  assert.equal(yAxisCenter.x, expectedCenterX);
  assert.equal(yAxisCenter.y, expectedCenterY);
});
