import test from "node:test";
import assert from "node:assert/strict";
import { createViewCubeWidget } from "../src/index.js";

test("ViewCube widget exposes attach/detach/dispose lifecycle", () => {
  const widget = createViewCubeWidget();
  assert.equal(typeof widget.attach, "function");
  assert.equal(typeof widget.detach, "function");
  assert.equal(typeof widget.dispose, "function");
});
