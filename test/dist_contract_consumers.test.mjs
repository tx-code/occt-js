import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

function readRepoText(relativePath) {
  return readFileSync(new URL(`../${relativePath}`, import.meta.url), "utf8");
}

function readRepoJson(relativePath) {
  return JSON.parse(readRepoText(relativePath));
}

test("package.json publishes the canonical dist runtime artifacts", () => {
  const packageJson = readRepoJson("package.json");

  assert.equal(packageJson.main, "dist/occt-js.js");
  assert.equal(packageJson.types, "dist/occt-js.d.ts");
  assert.ok(packageJson.files.includes("dist/occt-js.js"));
  assert.ok(packageJson.files.includes("dist/occt-js.wasm"));
  assert.ok(packageJson.files.includes("dist/occt-js.d.ts"));
  assert.equal(packageJson.main.includes("build/wasm"), false);
  assert.equal(packageJson.types.includes("build/wasm"), false);
  assert.equal(packageJson.files.some((entry) => entry.includes("build/wasm")), false);
});

test("demo useOcct hook stays on dist runtime paths instead of build intermediates", () => {
  const hookSource = readRepoText("demo/src/hooks/useOcct.js");

  assert.ok(hookSource.includes('resolveResource("dist/occt-js.js")'));
  assert.ok(hookSource.includes('resolveResource("dist/occt-js.wasm")'));
  assert.ok(hookSource.includes('new URL("../../../dist/", import.meta.url).href'));
  assert.equal(hookSource.includes("build/wasm"), false);
});

test("Tauri bundles only the canonical dist runtime artifacts", () => {
  const tauriConfig = readRepoJson("demo/src-tauri/tauri.conf.json");
  const resources = tauriConfig.bundle.resources;
  const resourceEntries = Object.entries(resources);

  assert.deepEqual(resources, {
    "../../dist/occt-js.js": "dist/occt-js.js",
    "../../dist/occt-js.wasm": "dist/occt-js.wasm"
  });
  assert.equal(resourceEntries.some(([from]) => from.includes("build/wasm")), false);
  assert.equal(resourceEntries.some(([, to]) => to.includes("build/wasm")), false);
});
