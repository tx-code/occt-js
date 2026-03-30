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
  assert.ok(viewer.getCamera());
});

test("viewer rejects unknown projection modes", () => {
  const scene = new Scene(new NullEngine());
  const viewer = createOcctBabylonViewer(scene);

  assert.throws(() => viewer.setProjection("diagonal"), /Unknown projection mode/);
});
