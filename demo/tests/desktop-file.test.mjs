import test from "node:test";
import assert from "node:assert/strict";
import {
  canUseNativeOpenDialog,
  extractFileNameFromPath,
  getModelFileDialogOptions,
  isModelFileName,
} from "../src/lib/desktop-file.js";

test("native open dialog is only enabled for Windows desktop runtime", () => {
  assert.equal(canUseNativeOpenDialog({ desktopPlatform: "windows" }), true);
  assert.equal(canUseNativeOpenDialog({ desktopPlatform: "macos" }), false);
  assert.equal(canUseNativeOpenDialog({ desktopPlatform: "desktop" }), false);
  assert.equal(canUseNativeOpenDialog({ desktopPlatform: "web" }), false);
});

test("model dialog options expose the supported CAD extensions", () => {
  assert.deepEqual(getModelFileDialogOptions(), {
    multiple: false,
    directory: false,
    filters: [
      {
        name: "CAD Models",
        extensions: ["step", "stp", "iges", "igs", "brep", "brp"],
      },
    ],
  });
});

test("extractFileNameFromPath handles Windows and POSIX paths", () => {
  assert.equal(extractFileNameFromPath("C:\\work\\gearbox.step"), "gearbox.step");
  assert.equal(extractFileNameFromPath("/tmp/cube_10x10.igs"), "cube_10x10.igs");
});

test("isModelFileName only accepts supported CAD extensions", () => {
  assert.equal(isModelFileName("part.step"), true);
  assert.equal(isModelFileName("part.STP"), true);
  assert.equal(isModelFileName("part.txt"), false);
  assert.equal(isModelFileName("part"), false);
});
