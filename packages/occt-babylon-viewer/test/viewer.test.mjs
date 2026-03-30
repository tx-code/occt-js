import test from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { Scene } from "@babylonjs/core/scene.js";
import { NullEngine } from "@babylonjs/core/Engines/nullEngine.js";
import { createOcctBabylonViewer } from "../src/index.js";

const packageDir = resolve(dirname(fileURLToPath(import.meta.url)), "..");

test("createOcctBabylonViewer attaches to a supplied scene", () => {
  const engine = new NullEngine();
  const scene = new Scene(engine);

  const viewer = createOcctBabylonViewer(scene);

  assert.equal(viewer.getScene(), scene);
  assert.equal(typeof viewer.dispose, "function");
  assert.equal(typeof viewer.loadOcctModel, "function");
});

test("package exports resolve to the shipped entry file", () => {
  const packageJsonPath = resolve(packageDir, "package.json");
  const packageJson = JSON.parse(readFileSync(packageJsonPath, "utf8"));
  const exportEntry = packageJson?.exports?.["."];

  assert.equal(packageJson.main, "./src/index.js");
  assert.equal(exportEntry, "./src/index.js");
  assert.equal(existsSync(resolve(packageDir, exportEntry)), true);
});
