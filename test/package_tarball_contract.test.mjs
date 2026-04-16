import test from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
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

function getDryRunPackManifest() {
  return JSON.parse(
    process.platform === "win32"
      ? execFileSync("cmd.exe", ["/d", "/s", "/c", "npm pack --dry-run --json"], {
          cwd: repoRoot,
          encoding: "utf8",
        })
      : execFileSync("npm", ["pack", "--dry-run", "--json"], {
          cwd: repoRoot,
          encoding: "utf8",
        }),
  )[0];
}

test("root package publishes only the canonical packaged runtime surface", () => {
  const manifest = getDryRunPackManifest();
  const packedPaths = manifest.files.map((entry) => entry.path).sort();

  assert.deepEqual(packedPaths, [
    "LICENSE",
    "README.md",
    "dist/occt-js.d.ts",
    "dist/occt-js.js",
    "dist/occt-js.wasm",
    "package.json",
  ]);
});

test("root package exports the canonical entrypoints needed by vendored consumers", () => {
  const packageJson = readRepoJson("package.json");

  assert.equal(packageJson.main, "dist/occt-js.js");
  assert.equal(packageJson.types, "dist/occt-js.d.ts");
  assert.deepEqual(packageJson.exports, {
    ".": {
      types: "./dist/occt-js.d.ts",
      require: "./dist/occt-js.js",
      default: "./dist/occt-js.js",
    },
    "./dist/occt-js.js": "./dist/occt-js.js",
    "./dist/occt-js.wasm": "./dist/occt-js.wasm",
    "./dist/occt-js.d.ts": "./dist/occt-js.d.ts",
    "./package.json": "./package.json",
  });
});

test("published typings and runtime agree on wasm initialization hooks", () => {
  const typesSource = readRepoText("dist/occt-js.d.ts");
  const runtimeSource = readRepoText("dist/occt-js.js");

  assert.match(typesSource, /locateFile\?: \(filename: string, scriptDirectory\?: string\) => string;/);
  assert.match(typesSource, /wasmBinary\?: ArrayBuffer \| Uint8Array;/);
  assert.match(runtimeSource, /function locateFile\(path\)\{if\(Module\["locateFile"\]\)\{return Module\["locateFile"\]\(path,scriptDirectory\)\}/);
  assert.match(runtimeSource, /var wasmBinary=Module\["wasmBinary"\];/);
});

test("packed root package ships appearance typings needed by downstream consumers", () => {
  const manifest = getDryRunPackManifest();
  const packedPaths = new Set(manifest.files.map((entry) => entry.path));
  const typesSource = readRepoText("dist/occt-js.d.ts");
  const readme = readRepoText("README.md");

  assert.equal(packedPaths.has("README.md"), true);
  assert.equal(packedPaths.has("dist/occt-js.d.ts"), true);
  assert.match(readme, /## Import Appearance Contract/);
  assert.match(readme, /appearancePreset/);
  assert.match(readme, /colorMode/);
  assert.match(readme, /defaultColor/);
  assert.match(readme, /defaultOpacity/);
  assert.match(readme, /cad-solid/);
  assert.match(readme, /cad-ghosted/);
  assert.match(typesSource, /export type OcctJSImportColorMode = "source" \| "default";/);
  assert.match(typesSource, /export type OcctJSImportAppearancePreset = "cad-solid" \| "cad-ghosted";/);
  assert.match(typesSource, /appearancePreset\?: OcctJSImportAppearancePreset;/);
  assert.match(typesSource, /colorMode\?: OcctJSImportColorMode;/);
  assert.match(typesSource, /defaultColor\?: OcctJSColor;/);
  assert.match(typesSource, /defaultOpacity\?: number;/);
  assert.match(typesSource, /legacy-only when colorMode is omitted/i);
  assert.match(typesSource, /built-in CAD base color \[0\.9, 0\.91, 0\.93\]/);
  assert.match(typesSource, /built-in ghost opacity 0\.35/i);
});

test("packed root package ships measurement SDK docs and typings needed by downstream consumers", () => {
  const manifest = getDryRunPackManifest();
  const packedPaths = new Set(manifest.files.map((entry) => entry.path));
  const typesSource = readRepoText("dist/occt-js.d.ts");
  const readme = readRepoText("README.md");

  assert.equal(packedPaths.has("README.md"), true);
  assert.equal(packedPaths.has("dist/occt-js.d.ts"), true);
  assert.match(readme, /## Exact Measurement SDK/);
  assert.match(readme, /@tx-code\/occt-core/);
  assert.match(readme, /SuggestExactDistancePlacement/);
  assert.match(readme, /ClassifyExactRelation/);
  assert.match(readme, /docs\/sdk\/measurement\.md/);
  assert.match(typesSource, /export type OcctJSExactPlacementResult = OcctJSExactPlacementSuccess \| OcctJSExactPairwiseFailure;/);
  assert.match(typesSource, /export type OcctJSExactRelationResult = OcctJSExactRelationSuccess \| OcctJSExactPairwiseFailure;/);
  assert.match(typesSource, /SuggestExactDistancePlacement/);
  assert.match(typesSource, /SuggestExactDiameterPlacement/);
  assert.match(typesSource, /ClassifyExactRelation/);
});

test("package contract keeps import appearance package-first and independent of viewer surfaces", () => {
  const manifest = getDryRunPackManifest();
  const packageJson = readRepoJson("package.json");
  const readme = readRepoText("README.md");
  const packedPaths = manifest.files.map((entry) => entry.path);
  const exportPaths = Object.keys(packageJson.exports ?? {});

  assert.match(readme, /Apps own settings persistence/i);
  assert.match(readme, /Viewer overrides remain downstream concerns/i);
  assert.equal(packedPaths.some((entry) => /demo|tauri|occt-babylon/i.test(entry)), false);
  assert.equal(packageJson.files.some((entry) => /demo|tauri|occt-babylon/i.test(entry)), false);
  assert.equal(exportPaths.some((entry) => /demo|tauri|occt-babylon/i.test(entry)), false);
});

test("package contract keeps measurement SDK package-first and independent of viewer surfaces", () => {
  const manifest = getDryRunPackManifest();
  const packageJson = readRepoJson("package.json");
  const readme = readRepoText("README.md");
  const packedPaths = manifest.files.map((entry) => entry.path);
  const exportPaths = Object.keys(packageJson.exports ?? {});

  assert.match(readme, /Most downstream JS consumers should start with the package-first adapter surface in `@tx-code\/occt-core`/);
  assert.match(readme, /lower-level root Wasm reference/i);
  assert.match(readme, /Overlay rendering, selection UX, label layout, and semantic feature recognition remain downstream concerns/i);
  assert.equal(packedPaths.some((entry) => /demo|tauri|occt-babylon/i.test(entry)), false);
  assert.equal(packageJson.files.some((entry) => /demo|tauri|occt-babylon/i.test(entry)), false);
  assert.equal(exportPaths.some((entry) => /demo|tauri|occt-babylon/i.test(entry)), false);
});

test("package metadata and tarball contract stay independent of build intermediates", () => {
  const packageJson = readRepoJson("package.json");
  const manifest = getDryRunPackManifest();
  const packageExports = packageJson.exports ?? {};

  assert.equal(packageJson.main.includes("build/wasm"), false);
  assert.equal(packageJson.types.includes("build/wasm"), false);
  assert.equal(packageJson.files.some((entry) => entry.includes("build/wasm")), false);
  assert.equal(Object.keys(packageExports).some((entry) => entry.includes("build/wasm")), false);
  assert.equal(manifest.files.some((entry) => entry.path.includes("build/wasm")), false);
});
