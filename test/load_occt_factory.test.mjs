import test from "node:test";
import assert from "node:assert/strict";
import { createOcctRequireError, resolveFactoryPath } from "./load_occt_factory.mjs";

test("resolveFactoryPath returns the requested dist path", () => {
  assert.equal(
    resolveFactoryPath("E:/repo/dist/occt-js.js"),
    "E:/repo/dist/occt-js.js"
  );
});

test("createOcctRequireError explains how to build missing dist artifacts", () => {
  const error = createOcctRequireError("E:/repo/dist/occt-js.js");
  assert.match(error.message, /dist\/occt-js\.js/);
  assert.match(error.message, /npm run build:wasm:win/);
  assert.match(error.message, /bash tools\/build_wasm\.sh/);
});
