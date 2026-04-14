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
