import test from "node:test";
import assert from "node:assert/strict";
import { getCameraAttachOptions } from "../src/lib/camera-input.js";

test("web runtime keeps browser-default pointer behavior", () => {
  assert.deepEqual(
    getCameraAttachOptions({ desktopPlatform: "web" }),
    { noPreventDefault: true }
  );
});

test("desktop runtime forces Babylon to prevent default pointer behavior", () => {
  assert.deepEqual(
    getCameraAttachOptions({ desktopPlatform: "windows" }),
    { noPreventDefault: false }
  );
  assert.deepEqual(
    getCameraAttachOptions({ desktopPlatform: "desktop" }),
    { noPreventDefault: false }
  );
});
