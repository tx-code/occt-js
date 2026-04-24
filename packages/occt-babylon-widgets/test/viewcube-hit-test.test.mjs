import test from "node:test";
import assert from "node:assert/strict";
import { VIEWCUBE_CANVAS_SIZE, VIEWCUBE_CUBE_HALF } from "../src/viewcube-style.js";
import { VIEWS, projectCube } from "../src/viewcube-geometry.js";
import { hitTest } from "../src/viewcube-hit-test.js";

function normalize(vector) {
  const length = Math.hypot(vector[0], vector[1], vector[2]);
  if (length < 1e-8) {
    return [0, 0, 0];
  }
  return vector.map((value) => value / length);
}

function cross(a, b) {
  return [
    a[1] * b[2] - a[2] * b[1],
    a[2] * b[0] - a[0] * b[2],
    a[0] * b[1] - a[1] * b[0],
  ];
}

function subtract(a, b) {
  return [
    a[0] - b[0],
    a[1] - b[1],
    a[2] - b[2],
  ];
}

function createZUpViewMatrix(viewName, radius = 10) {
  const view = VIEWS[viewName];
  const eye = [
    radius * Math.cos(view.alpha) * Math.sin(view.beta),
    -radius * Math.sin(view.alpha) * Math.sin(view.beta),
    radius * Math.cos(view.beta),
  ];
  const target = [0, 0, 0];
  const forward = normalize(subtract(target, eye));
  const right = normalize(cross([0, 0, 1], forward));
  const up = cross(forward, right);
  return [
    right[0], up[0], forward[0], 0,
    right[1], up[1], forward[1], 0,
    right[2], up[2], forward[2], 0,
    0, 0, 0, 1,
  ];
}

function createProjection(viewName) {
  return projectCube(
    createZUpViewMatrix(viewName),
    VIEWCUBE_CANVAS_SIZE / 2,
    VIEWCUBE_CANVAS_SIZE / 2,
    VIEWCUBE_CUBE_HALF,
  );
}

function findRegion(projection, regionName) {
  const center = VIEWCUBE_CANVAS_SIZE / 2;
  for (let y = 0; y < VIEWCUBE_CANVAS_SIZE; y += 2) {
    for (let x = 0; x < VIEWCUBE_CANVAS_SIZE; x += 2) {
      const result = hitTest(x, y, projection, center, center, VIEWCUBE_CUBE_HALF);
      if (result?.name === regionName) {
        return result;
      }
    }
  }
  return null;
}

test("viewcube hit test exposes the top face in the Z-up top view", () => {
  const projection = createProjection("top");
  assert.deepEqual(findRegion(projection, "top"), { type: "face", name: "top" });
});

test("viewcube hit test exposes the front face in the Z-up front view", () => {
  const projection = createProjection("front");
  assert.deepEqual(findRegion(projection, "front"), { type: "face", name: "front" });
});

test("viewcube hit test keeps front-top-right corner naming in the front-top-right view", () => {
  const projection = createProjection("front-top-right");
  assert.deepEqual(findRegion(projection, "front-top-right"), { type: "corner", name: "front-top-right" });
});
