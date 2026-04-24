import test from "node:test";
import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { readFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(__dirname, "..");

function readRepoJson(relativePath) {
  return JSON.parse(readFileSync(resolve(repoRoot, relativePath), "utf8"));
}

test("root package export map routes browser import to the ESM runtime entry", () => {
  const packageJson = readRepoJson("package.json");
  const rootExports = packageJson.exports?.["."] ?? {};

  assert.equal(rootExports.import, "./dist/occt-js.mjs");
  assert.equal(rootExports.default, "./dist/occt-js.mjs");
  assert.equal(rootExports.require, "./dist/occt-js.js");
  assert.equal(rootExports.node, "./dist/occt-js.js");
});

test("published typings keep default export aligned with the runtime factory contract", () => {
  const typesSource = readFileSync(resolve(repoRoot, "dist", "occt-js.d.ts"), "utf8");

  assert.match(typesSource, /declare function OcctJS\(/);
  assert.match(typesSource, /export default OcctJS;/);
  assert.match(typesSource, /locateFile\?: \(filename: string, scriptDirectory\?: string\) => string;/);
  assert.match(typesSource, /wasmBinary\?: ArrayBuffer \| Uint8Array;/);
});

test("dynamic import contract exposes a callable default factory without consumer fallbacks", async () => {
  const runtime = await import("@tx-code/occt-js");

  assert.equal(typeof runtime.default, "function");
  assert.notEqual(typeof runtime.default, "object");
});

test("CommonJS require contract remains callable for existing Node consumers", () => {
  const require = createRequire(import.meta.url);
  const runtimeFactory = require("@tx-code/occt-js");

  assert.equal(typeof runtimeFactory, "function");
});
