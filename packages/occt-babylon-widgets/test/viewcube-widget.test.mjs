import test from "node:test";
import assert from "node:assert/strict";
import { createViewCubeWidget } from "../src/index.js";

test("ViewCube widget exposes attach/detach/dispose lifecycle", () => {
  const widget = createViewCubeWidget();
  const viewer = { id: "viewer-1" };

  assert.equal(typeof widget.attach, "function");
  assert.equal(typeof widget.detach, "function");
  assert.equal(typeof widget.dispose, "function");
  assert.equal(typeof widget.getViewer, "function");
  assert.equal(widget.getViewer(), null);

  widget.attach(viewer);
  assert.equal(widget.getViewer(), viewer);

  widget.detach();
  assert.equal(widget.getViewer(), null);

  widget.attach(viewer);
  widget.dispose();
  assert.equal(widget.getViewer(), null);
});

test("dispose does not rely on method-call this binding", () => {
  const widget = createViewCubeWidget();
  const dispose = widget.dispose;

  assert.doesNotThrow(() => dispose());
});
