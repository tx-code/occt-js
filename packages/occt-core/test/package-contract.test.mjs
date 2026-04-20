import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const packageRoot = resolve(__dirname, "..");

function readPackageText(relativePath) {
  return readFileSync(resolve(packageRoot, relativePath), "utf8");
}

function readPackageJson(relativePath) {
  return JSON.parse(readPackageText(relativePath));
}

test("occt-core package docs describe the shipped helper family package-first", () => {
  const readme = readPackageText("README.md");

  assert.match(readme, /describeExactHole/);
  assert.match(readme, /describeExactChamfer/);
  assert.match(readme, /suggestExactMidpointPlacement/);
  assert.match(readme, /describeExactEqualDistance/);
  assert.match(readme, /suggestExactSymmetryPlacement/);
  assert.match(readme, /package-first/i);
});

test("occt-core package docs describe narrow helper support boundaries and downstream limits", () => {
  const readme = readPackageText("README.md");

  assert.match(readme, /supported cylindrical hole/i);
  assert.match(readme, /supported planar chamfer face/i);
  assert.match(readme, /midplane-style symmetry helper/i);
  assert.match(readme, /feature discovery/i);
  assert.match(readme, /viewer policy/i);
});

test("occt-core package metadata exports a published typing surface aligned with the JS barrel", () => {
  const packageJson = readPackageJson("package.json");

  assert.equal(packageJson.types, "./src/index.d.ts");
  assert.deepEqual(packageJson.exports, {
    ".": {
      types: "./src/index.d.ts",
      default: "./src/index.js",
    },
  });
});

test("occt-core published typings expose the helper SDK surface", () => {
  const typesSource = readPackageText("src/index.d.ts");

  assert.match(typesSource, /export interface OcctExactRef/);
  assert.match(typesSource, /export interface OcctImportModelOptions/);
  assert.match(typesSource, /export interface OcctCoreClientOptions/);
  assert.match(typesSource, /export declare class OcctCoreClient/);
  assert.match(typesSource, /createOcctCore/);
  assert.match(typesSource, /describeExactHole/);
  assert.match(typesSource, /describeExactChamfer/);
  assert.match(typesSource, /suggestExactMidpointPlacement/);
  assert.match(typesSource, /describeExactEqualDistance/);
  assert.match(typesSource, /suggestExactSymmetryPlacement/);
  assert.match(typesSource, /resolveExactElementRef/);
  assert.match(typesSource, /normalizeExactOpenResult/);
  assert.match(typesSource, /buildCamToolRevolvedSpec/);
  assert.match(typesSource, /OcctCamToolDefinition/);
});
