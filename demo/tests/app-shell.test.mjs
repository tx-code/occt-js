import test from "node:test";
import assert from "node:assert/strict";
import { getAppShellLayout } from "../src/lib/app-shell.js";

test("getAppShellLayout keeps web layout unchanged", () => {
  const layout = getAppShellLayout(false);

  assert.equal(layout.rootClassName, "relative h-screen w-screen");
  assert.equal(layout.viewportClassName, "relative h-full");
});

test("getAppShellLayout reserves chrome space without scroll-prone double top offset", () => {
  const layout = getAppShellLayout(true);

  assert.match(layout.rootClassName, /\boverflow-hidden\b/);
  assert.match(layout.viewportClassName, /pt-\[42px\]/);
  assert.match(layout.viewportClassName, /\bbox-border\b/);
  assert.doesNotMatch(layout.viewportClassName, /mt-\[42px\]/);
  assert.doesNotMatch(layout.viewportClassName, /calc\(100vh-42px\)/);
});
