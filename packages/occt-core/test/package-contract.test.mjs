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

test("occt-core package docs describe the shared profile and extruded shape SDK package-first", () => {
  const readme = readPackageText("README.md");

  assert.match(readme, /validateProfile2DSpec/);
  assert.match(readme, /validateExtrudedShapeSpec/);
  assert.match(readme, /buildExtrudedShape/);
  assert.match(readme, /openExactExtrudedShape/);
  assert.match(readme, /validateHelicalSweepSpec/);
  assert.match(readme, /buildHelicalSweep/);
  assert.match(readme, /openExactHelicalSweep/);
  assert.match(readme, /validateCompositeShapeSpec/);
  assert.match(readme, /buildCompositeShape/);
  assert.match(readme, /openExactCompositeShape/);
  assert.match(readme, /Profile2D/i);
  assert.match(readme, /upstream apps/i);
  assert.match(readme, /tool-library schemas/i);
});

test("occt-core package docs describe narrow helper support boundaries and downstream limits", () => {
  const readme = readPackageText("README.md");

  assert.match(readme, /supported cylindrical hole/i);
  assert.match(readme, /supported planar chamfer face/i);
  assert.match(readme, /midplane-style symmetry helper/i);
  assert.match(readme, /feature discovery/i);
  assert.match(readme, /viewer policy/i);
});

test("occt-core package docs keep demo-owned action routing and current-result session semantics downstream", () => {
  const readme = readPackageText("README.md");

  assert.match(readme, /supported exact action routing/i);
  assert.match(readme, /current-result session behavior/i);
  assert.doesNotMatch(readme, /selection-to-measure mapping/i);
  assert.doesNotMatch(readme, /transient run history/i);
  assert.doesNotMatch(readme, /runDemoMeasurementAction/);
  assert.doesNotMatch(readme, /deriveDemoMeasurementActions/);
});

test("occt-core package docs do not expose candidate-analysis product surface", () => {
  const readme = readPackageText("README.md");

  assert.doesNotMatch(readme, /analyzeExactMeasurementCandidates/);
  assert.doesNotMatch(readme, /candidate discovery/i);
  assert.doesNotMatch(readme, /whole models/i);
  assert.doesNotMatch(readme, /mesh ids/i);
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
});

test("occt-core published typings do not publish candidate-analysis descriptors", () => {
  const typesSource = readPackageText("src/index.d.ts");

  assert.doesNotMatch(typesSource, /OcctExactMeasurementCandidate/);
  assert.doesNotMatch(typesSource, /analyzeExactMeasurementCandidates/);
  assert.doesNotMatch(typesSource, /InvokeMethodName/);
  assert.doesNotMatch(typesSource, /PlacementMethodName/);
  assert.doesNotMatch(typesSource, /runDemoMeasurementAction/);
  assert.doesNotMatch(typesSource, /deriveDemoMeasurementActions/);
  assert.doesNotMatch(typesSource, /currentMeasurement/);
  assert.doesNotMatch(typesSource, /measurementRuns/);
});

test("occt-core JS barrel stays aligned with the retained package surface and excludes demo-local helpers", () => {
  const barrelSource = readPackageText("src/index.js");

  assert.match(barrelSource, /createOcctCore/);
  assert.match(barrelSource, /OcctCoreClient/);
  assert.match(barrelSource, /normalizeExactOpenResult/);
  assert.match(barrelSource, /resolveExactElementRef/);
  assert.match(barrelSource, /normalizeOcctResult/);
  assert.doesNotMatch(barrelSource, /runDemoMeasurementAction/);
  assert.doesNotMatch(barrelSource, /deriveDemoMeasurementActions/);
  assert.doesNotMatch(barrelSource, /currentMeasurement/);
});

test("occt-core published typings expose the profile-solid SDK surface", () => {
  const typesSource = readPackageText("src/index.d.ts");

  assert.match(typesSource, /OcctGeneratedExtrudedShapeSourceFormat/);
  assert.match(typesSource, /OcctGeneratedHelicalSweepSourceFormat/);
  assert.match(typesSource, /OcctGeneratedCompositeShapeSourceFormat/);
  assert.match(typesSource, /OcctNormalizedExtrudedShapeMetadata/);
  assert.match(typesSource, /OcctNormalizedHelicalSweepMetadata/);
  assert.match(typesSource, /OcctNormalizedCompositeShapeMetadata/);
  assert.match(typesSource, /extrudedShape\?: OcctNormalizedExtrudedShapeMetadata;/);
  assert.match(typesSource, /helicalSweep\?: OcctNormalizedHelicalSweepMetadata;/);
  assert.match(typesSource, /compositeShape\?: OcctNormalizedCompositeShapeMetadata;/);
  assert.match(typesSource, /validateProfile2DSpec/);
  assert.match(typesSource, /validateExtrudedShapeSpec/);
  assert.match(typesSource, /buildExtrudedShape/);
  assert.match(typesSource, /openExactExtrudedShape/);
  assert.match(typesSource, /validateHelicalSweepSpec/);
  assert.match(typesSource, /buildHelicalSweep/);
  assert.match(typesSource, /openExactHelicalSweep/);
  assert.match(typesSource, /validateCompositeShapeSpec/);
  assert.match(typesSource, /buildCompositeShape/);
  assert.match(typesSource, /openExactCompositeShape/);
  assert.match(typesSource, /OcctJSProfile2DSpec/);
  assert.match(typesSource, /OcctJSExtrudedShapeSpec/);
  assert.match(typesSource, /OcctJSHelicalSweepSpec/);
  assert.match(typesSource, /OcctJSCompositeShapeSpec/);
  assert.match(typesSource, /OcctJSExactExtrudedShapeOpenResult/);
  assert.match(typesSource, /OcctJSExactHelicalSweepOpenResult/);
  assert.match(typesSource, /OcctJSExactCompositeShapeOpenResult/);
});
