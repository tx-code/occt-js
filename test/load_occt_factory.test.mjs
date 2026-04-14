import test from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, mkdirSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { createOcctRequireError, loadOcctFactory, resolveFactoryPath } from "./load_occt_factory.mjs";

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

test("loadOcctFactory fails when dist/occt-js.wasm is missing", () => {
  const repoRoot = mkdtempSync(path.join(tmpdir(), "occt-js-dist-"));
  const distDir = path.join(repoRoot, "dist");
  const factoryPath = path.join(distDir, "occt-js.js");
  const wasmPath = path.join(distDir, "occt-js.wasm");

  mkdirSync(distDir, { recursive: true });
  writeFileSync(factoryPath, "module.exports = { loaded: true };");

  assert.throws(() => loadOcctFactory(factoryPath, wasmPath), (error) => {
    assert.match(error.message, /dist\/occt-js\.wasm/);
    assert.match(error.message, /npm run build:wasm:win/);
    return true;
  });
});
