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
  assert.equal(packageJson.module, "dist/occt-js.mjs");
  assert.equal(packageJson.types, "dist/occt-js.d.ts");
  assert.ok(packageJson.files.includes("dist/occt-js.js"));
  assert.ok(packageJson.files.includes("dist/occt-js.mjs"));
  assert.ok(packageJson.files.includes("dist/occt-js.wasm"));
  assert.ok(packageJson.files.includes("dist/occt-js.d.ts"));
  assert.equal(packageJson.main.includes("build/wasm"), false);
  assert.equal(packageJson.module.includes("build/wasm"), false);
  assert.equal(packageJson.types.includes("build/wasm"), false);
  assert.equal(packageJson.files.some((entry) => entry.includes("build/wasm")), false);
});

test("root export map keeps browser import on ESM while Node require stays on CJS", () => {
  const packageJson = readRepoJson("package.json");
  const rootExports = packageJson.exports?.["."] ?? {};

  assert.equal(rootExports.import, "./dist/occt-js.mjs");
  assert.equal(rootExports.default, "./dist/occt-js.mjs");
  assert.equal(rootExports.require, "./dist/occt-js.js");
  assert.equal(rootExports.node, "./dist/occt-js.js");
});

test("demo useOcct hook keeps Tauri on dist resources and web on bundled ESM import", () => {
  const hookSource = readRepoText("demo/src/hooks/useOcct.js");

  assert.ok(hookSource.includes('resolveResource("dist/occt-js.js")'));
  assert.ok(hookSource.includes('resolveResource("dist/occt-js.wasm")'));
  assert.ok(hookSource.includes('import OcctJS from "@tx-code/occt-js";'));
  assert.ok(hookSource.includes('import occtWasmUrl from "../../../dist/occt-js.wasm?url";'));
  assert.doesNotMatch(hookSource, /new URL\(\s*\/\*\s*@vite-ignore\s*\*\/\s*"\.\.\/\.\.\/\.\.\/dist\/",\s*import\.meta\.url\s*\)/);
  assert.doesNotMatch(hookSource, /new URL\(\s*"\.\.\/\.\.\/\.\.\/dist\/",\s*import\.meta\.url\s*\)/);
  assert.equal(hookSource.includes("build/wasm"), false);
  assert.equal(hookSource.includes("unpkg.com"), false);
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

test("root README documents the packaged wasm carrier and supported wasm resolution hooks", () => {
  const readme = readRepoText("README.md");

  assert.ok(readme.includes("@tx-code/occt-js"));
  assert.ok(readme.includes("locateFile"));
  assert.ok(readme.includes("wasmBinary"));
  assert.ok(readme.includes("occt-js.wasm"));
});

test("occt-core README documents the package-first adapter path without requiring Babylon layers", () => {
  const readme = readRepoText("packages/occt-core/README.md");

  assert.ok(readme.includes("@tx-code/occt-core"));
  assert.ok(readme.includes("createOcctCore"));
  assert.ok(readme.includes("@tx-code/occt-js"));
  assert.equal(readme.includes("@tx-code/occt-babylon-loader"), false);
});

test("consumer-facing docs describe the helper SDK without widening secondary-surface requirements", () => {
  const rootReadme = readRepoText("README.md");
  const coreReadme = readRepoText("packages/occt-core/README.md");

  assert.ok(rootReadme.includes("MeasureExactDistance"));
  assert.ok(rootReadme.includes("MeasureExactAngle"));
  assert.ok(rootReadme.includes("MeasureExactThickness"));
  assert.ok(rootReadme.includes("describeExactHole"));
  assert.ok(rootReadme.includes("describeExactChamfer"));
  assert.ok(rootReadme.includes("suggestExactMidpointPlacement"));
  assert.ok(rootReadme.includes("describeExactEqualDistance"));
  assert.ok(rootReadme.includes("suggestExactSymmetryPlacement"));
  assert.match(rootReadme, /Richer feature discovery.*viewer policy remain downstream concerns/i);
  assert.ok(coreReadme.includes("createOcctCore"));
  assert.ok(coreReadme.includes("measureExactDistance"));
  assert.ok(coreReadme.includes("measureExactAngle"));
  assert.ok(coreReadme.includes("measureExactThickness"));
  assert.ok(coreReadme.includes("describeExactHole"));
  assert.ok(coreReadme.includes("describeExactChamfer"));
  assert.ok(coreReadme.includes("suggestExactMidpointPlacement"));
  assert.ok(coreReadme.includes("describeExactEqualDistance"));
  assert.ok(coreReadme.includes("suggestExactSymmetryPlacement"));
  assert.match(coreReadme, /feature discovery/i);
  assert.match(coreReadme, /viewer policy/i);
  assert.match(rootReadme, /Optional secondary surfaces/i);
  assert.equal(coreReadme.includes("@tx-code/occt-babylon-loader"), false);
});

test("published typings expose the raw STEP product inspection contract", () => {
  const typesSource = readRepoText("dist/occt-js.d.ts");

  assert.ok(typesSource.includes("InspectStepProduct"));
  assert.ok(typesSource.includes("OcctJSStepProductInspectionResult"));
  assert.ok(typesSource.includes("OcctJSStepProductInspectionNode"));
  assert.ok(typesSource.includes("OcctJSStepSelectableOccurrence"));
  assert.ok(typesSource.includes("selectableOccurrences"));
  assert.ok(typesSource.includes("occurrenceTransform"));
  assert.ok(typesSource.includes("displayPath"));
  assert.ok(typesSource.includes("uniquePartCount"));
  assert.ok(typesSource.includes("partOccurrenceCount"));
});

test("published typings expose the raw strict STEP part import contract", () => {
  const typesSource = readRepoText("dist/occt-js.d.ts");

  assert.ok(typesSource.includes("ReadStepPartFile"));
  assert.ok(typesSource.includes("OcctJSStepPartImportResult"));
  assert.ok(typesSource.includes("OcctJSStepPartImportRejection"));
  assert.ok(typesSource.includes("OcctJSStepPartImportSelection"));
  assert.ok(typesSource.includes("OcctJSStepSelectedOccurrence"));
  assert.ok(typesSource.includes("selectedOccurrence"));
  assert.ok(typesSource.includes("selection_not_found"));
  assert.ok(typesSource.includes("selection_not_leaf_occurrence"));
  assert.ok(typesSource.includes("selection_missing_shape"));
  assert.ok(typesSource.includes("selection_ambiguous"));
  assert.ok(typesSource.includes("selection_import_failed"));
  assert.ok(typesSource.includes("assembly_not_allowed"));
  assert.ok(typesSource.includes("multi_part_not_allowed"));
});

test("package metadata marks the selected occurrence runtime version", () => {
  const packageJson = readRepoJson("package.json");
  const packageLock = readRepoJson("package-lock.json");

  assert.equal(packageLock.version, packageJson.version);
  assert.equal(packageLock.packages[""].version, packageJson.version);
});

test("npm test includes the selected occurrence contract suite", () => {
  const packageJson = readRepoJson("package.json");

  assert.ok(packageJson.scripts.test.includes("test/step_selected_occurrence_contract.test.mjs"));
});
