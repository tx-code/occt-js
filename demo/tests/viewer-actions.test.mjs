import test from "node:test";
import assert from "node:assert/strict";
import {
  createDesktopActionMap,
  isEditableTarget,
} from "../src/lib/viewer-actions.js";

test("createDesktopActionMap exposes stable desktop action ids", () => {
  const noop = () => {};
  const actions = createDesktopActionMap({
    openFile: noop,
    closeModel: noop,
    fitAll: noop,
    setPerspective: noop,
    setOrthographic: noop,
  });

  assert.deepEqual(
    Object.keys(actions),
    [
      "open-file",
      "close-model",
      "fit-all",
      "projection-perspective",
      "projection-orthographic",
    ]
  );
});

test("isEditableTarget recognizes form controls and contenteditable nodes", () => {
  assert.equal(isEditableTarget({ tagName: "INPUT" }), true);
  assert.equal(isEditableTarget({ tagName: "TEXTAREA" }), true);
  assert.equal(isEditableTarget({ tagName: "SELECT" }), true);
  assert.equal(isEditableTarget({ isContentEditable: true, tagName: "DIV" }), true);
  assert.equal(isEditableTarget({ tagName: "BUTTON" }), false);
  assert.equal(isEditableTarget(null), false);
});
