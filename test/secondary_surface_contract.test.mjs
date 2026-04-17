import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(__dirname, "..");

function readRepoText(relativePath) {
  return readFileSync(resolve(repoRoot, relativePath), "utf8");
}

function readRepoJson(relativePath) {
  return JSON.parse(readRepoText(relativePath));
}

test("secondary-surface contract audit stays outside the authoritative root release gate", () => {
  const packageJson = readRepoJson("package.json");
  const releaseCommand = packageJson.scripts?.["test:release:root"] ?? "";
  const contractCommand = packageJson.scripts?.["test:secondary:contracts"];

  assert.equal(contractCommand, "node --test test/secondary_surface_contract.test.mjs");
  assert.equal(releaseCommand.includes("secondary_surface_contract"), false);
  assert.equal(releaseCommand.includes("test:secondary:contracts"), false);
});

test("demo manifest exposes explicit non-Tauri node and browser verification commands", () => {
  const demoPackage = readRepoJson("demo/package.json");

  assert.equal(demoPackage.scripts?.test, "node --test tests/*.test.mjs");
  assert.match(demoPackage.scripts?.["test:e2e"] ?? "", /playwright test/);
  assert.match(demoPackage.scripts?.["test:e2e"] ?? "", /demo\/tests\/app-home\.spec\.mjs/);
  assert.equal((demoPackage.scripts?.test ?? "").includes("tauri"), false);
  assert.equal((demoPackage.scripts?.["test:e2e"] ?? "").includes("tauri"), false);
});

test("loader manifest owns its direct Babylon and viewer imports while leaving occt-core caller-supplied", () => {
  const loaderPackage = readRepoJson("packages/occt-babylon-loader/package.json");

  assert.equal(loaderPackage.dependencies?.["@babylonjs/core"], "^9.0.0");
  assert.equal(loaderPackage.dependencies?.["@tx-code/occt-babylon-viewer"], "file:../occt-babylon-viewer");
  assert.equal(loaderPackage.peerDependencies?.["@tx-code/occt-core"], "^0.1.7");
  assert.equal(loaderPackage.devDependencies?.["@tx-code/occt-core"], "file:../occt-core");
  assert.equal("@babylonjs/core" in (loaderPackage.peerDependencies ?? {}), false);
  assert.equal("@tx-code/occt-babylon-viewer" in (loaderPackage.peerDependencies ?? {}), false);
});

test("secondary-surface docs publish the touched-path verification matrix", () => {
  const readme = readRepoText("README.md");
  const agents = readRepoText("AGENTS.md");

  assert.match(readme, /npm run test:secondary:contracts/);
  assert.match(readme, /outside the root release gate/i);
  assert.match(readme, /npm --prefix demo test/);
  assert.match(readme, /npm --prefix demo run test:e2e/);
  assert.match(readme, /npm --prefix demo run tauri:build/);
  assert.match(readme, /npm --prefix packages\/occt-babylon-loader test/);
  assert.match(readme, /npm --prefix packages\/occt-babylon-viewer test/);
  assert.match(readme, /npm --prefix packages\/occt-babylon-widgets test/);

  assert.match(agents, /npm run test:secondary:contracts/);
  assert.match(agents, /conditional secondary-surface verification/i);
  assert.match(agents, /npm --prefix demo test/);
  assert.match(agents, /npm --prefix demo run test:e2e/);
  assert.match(agents, /npm --prefix demo run tauri:build/);
  assert.match(agents, /npm --prefix packages\/occt-babylon-loader test/);
  assert.match(agents, /npm --prefix packages\/occt-babylon-viewer test/);
  assert.match(agents, /npm --prefix packages\/occt-babylon-widgets test/);
});

test("Babylon package READMEs surface their package-local verification commands", () => {
  const loaderReadme = readRepoText("packages/occt-babylon-loader/README.md");
  const viewerReadme = readRepoText("packages/occt-babylon-viewer/README.md");
  const widgetsReadme = readRepoText("packages/occt-babylon-widgets/README.md");

  assert.match(loaderReadme, /npm --prefix packages\/occt-babylon-loader test/);
  assert.match(loaderReadme, /direct imports of `@babylonjs\/core` and `@tx-code\/occt-babylon-viewer`/);
  assert.match(viewerReadme, /npm --prefix packages\/occt-babylon-viewer test/);
  assert.match(widgetsReadme, /npm --prefix packages\/occt-babylon-widgets test/);
});
