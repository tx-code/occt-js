import test from "node:test";
import assert from "node:assert/strict";
import { Scene } from "@babylonjs/core/scene.js";
import { NullEngine } from "@babylonjs/core/Engines/nullEngine.js";
import { createOcctBabylonViewer } from "../src/index.js";

test("viewer exposes projection and standard view controls", () => {
  const scene = new Scene(new NullEngine());
  const viewer = createOcctBabylonViewer(scene);

  viewer.setProjection("orthographic");
  viewer.setView("top");

  assert.equal(typeof viewer.getCamera, "function");
  const camera = viewer.getCamera();
  assert.ok(camera);
  camera.computeWorldMatrix(true);
  assert.equal(camera.upVector.x, 0);
  assert.equal(camera.upVector.y, 0);
  assert.equal(camera.upVector.z, 1);
  assert(Math.abs(camera.position.x) < 0.1);
  assert(Math.abs(camera.position.y) < 0.1);
  assert(camera.position.z > 0);
});

test("viewer front view uses the Z-up CAD convention", () => {
  const scene = new Scene(new NullEngine());
  const viewer = createOcctBabylonViewer(scene);

  viewer.setView("front");

  const camera = viewer.getCamera();
  camera.computeWorldMatrix(true);
  assert.ok(camera.position.y < 0);
  assert(Math.abs(camera.position.x) < 1e-3);
  assert(Math.abs(camera.position.z) < 1e-3);
});

test("viewer rejects unknown projection modes", () => {
  const scene = new Scene(new NullEngine());
  const viewer = createOcctBabylonViewer(scene);

  assert.throws(() => viewer.setProjection("diagonal"), /Unknown projection mode/);
});
