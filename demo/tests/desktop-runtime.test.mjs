import test from "node:test";
import assert from "node:assert/strict";
import {
  detectDesktopPlatform,
  shouldUseWindowsCustomChrome,
} from "../src/lib/desktop-runtime.js";

test("detectDesktopPlatform returns web when not in tauri", () => {
  assert.equal(
    detectDesktopPlatform({ isTauri: false, userAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64)" }),
    "web"
  );
});

test("detectDesktopPlatform recognizes tauri windows", () => {
  assert.equal(
    detectDesktopPlatform({ isTauri: true, userAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64)" }),
    "windows"
  );
});

test("detectDesktopPlatform treats tauri mac as macos", () => {
  assert.equal(
    detectDesktopPlatform({ isTauri: true, userAgent: "Mozilla/5.0 (Macintosh; Intel Mac OS X 14_0)" }),
    "macos"
  );
});

test("shouldUseWindowsCustomChrome is only true for tauri windows", () => {
  assert.equal(
    shouldUseWindowsCustomChrome({ isTauri: true, userAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64)" }),
    true
  );
  assert.equal(
    shouldUseWindowsCustomChrome({ isTauri: true, userAgent: "Mozilla/5.0 (Macintosh; Intel Mac OS X 14_0)" }),
    false
  );
  assert.equal(
    shouldUseWindowsCustomChrome({ isTauri: false, userAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64)" }),
    false
  );
});
