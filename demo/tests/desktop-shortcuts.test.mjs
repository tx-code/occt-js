import test from "node:test";
import assert from "node:assert/strict";
import { getDesktopShortcutAction } from "../src/lib/desktop-shortcuts.js";

test("desktop shortcuts map Ctrl+O and Ctrl+W to file actions", () => {
  assert.equal(getDesktopShortcutAction({ key: "o", ctrlKey: true }), "open-file");
  assert.equal(getDesktopShortcutAction({ key: "w", ctrlKey: true }), "close-model");
});

test("desktop shortcuts map view keys without modifiers", () => {
  assert.equal(getDesktopShortcutAction({ key: "f" }), "fit-all");
  assert.equal(getDesktopShortcutAction({ key: "p" }), "projection-perspective");
  assert.equal(getDesktopShortcutAction({ key: "o" }), "projection-orthographic");
});

test("desktop shortcuts ignore editable targets and unrelated chords", () => {
  assert.equal(getDesktopShortcutAction({ key: "o", ctrlKey: true, isEditableTarget: true }), null);
  assert.equal(getDesktopShortcutAction({ key: "o", altKey: true }), null);
  assert.equal(getDesktopShortcutAction({ key: "k", ctrlKey: true }), null);
});
