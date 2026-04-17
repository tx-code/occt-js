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

test("authoritative root release command surface stays runtime-first", () => {
  const packageJson = readRepoJson("package.json");
  const releaseCommand = packageJson.scripts?.["test:release:root"];

  assert.equal(
    releaseCommand,
    "npm run build:wasm:win && node --test test/wasm_build_contract.test.mjs test/package_tarball_contract.test.mjs test/release_governance_contract.test.mjs test/exact_pairwise_measurement_contract.test.mjs test/exact_placement_contract.test.mjs test/exact_relation_contract.test.mjs && npm --prefix packages/occt-core test && npm test",
  );
});

test("authoritative root release command surface excludes planning audit coverage", () => {
  const packageJson = readRepoJson("package.json");
  const releaseCommand = packageJson.scripts?.["test:release:root"] ?? "";

  assert.equal(releaseCommand.includes("planning_archive_contract"), false);
  assert.equal(releaseCommand.includes("test:planning:audit"), false);
});

test("authoritative root release command surface includes exact measurement SDK coverage", () => {
  const packageJson = readRepoJson("package.json");
  const releaseCommand = packageJson.scripts?.["test:release:root"] ?? "";
  const testCommand = packageJson.scripts?.test ?? "";

  assert.match(releaseCommand, /test\/exact_pairwise_measurement_contract\.test\.mjs/);
  assert.match(releaseCommand, /test\/exact_placement_contract\.test\.mjs/);
  assert.match(releaseCommand, /test\/exact_relation_contract\.test\.mjs/);
  assert.match(testCommand, /test\/exact_pairwise_measurement_contract\.test\.mjs/);
  assert.match(testCommand, /test\/exact_placement_contract\.test\.mjs/);
  assert.match(testCommand, /test\/exact_relation_contract\.test\.mjs/);
});

test("authoritative root test surface includes import appearance contract coverage", () => {
  const packageJson = readRepoJson("package.json");
  const testCommand = packageJson.scripts?.test ?? "";

  assert.match(testCommand, /test\/import_appearance_contract\.test\.mjs/);
});

test("release governance keeps packaged appearance contract coverage on the authoritative root gate", () => {
  const packageJson = readRepoJson("package.json");
  const releaseCommand = packageJson.scripts?.["test:release:root"] ?? "";
  const tarballContract = readRepoText("test/package_tarball_contract.test.mjs");

  assert.match(releaseCommand, /test\/package_tarball_contract\.test\.mjs/);
  assert.match(tarballContract, /packed root package ships appearance typings needed by downstream consumers/);
  assert.match(tarballContract, /appearancePreset/);
  assert.match(tarballContract, /defaultOpacity/);
  assert.match(tarballContract, /cad-ghosted/);
  assert.match(tarballContract, /package contract keeps import appearance package-first and independent of viewer surfaces/);
});

test("authoritative root release command surface excludes unconditional secondary-surface gates", () => {
  const packageJson = readRepoJson("package.json");
  const releaseCommand = packageJson.scripts?.["test:release:root"] ?? "";

  assert.equal(releaseCommand.includes("demo"), false);
  assert.equal(releaseCommand.includes("playwright"), false);
  assert.equal(releaseCommand.includes("tauri"), false);
  assert.equal(releaseCommand.includes("occt-babylon"), false);
});

test("demo fallback CDN derives its semver from the root package instead of a hardcoded version", () => {
  const demoHook = readRepoText("demo/src/hooks/useOcct.js");

  assert.match(demoHook, /import packageJson from "\.\.\/\.\.\/\.\.\/package\.json";/);
  assert.match(demoHook, /https:\/\/unpkg\.com\/@tx-code\/occt-js@\$\{packageJson\.version\}\/dist\//);
  assert.doesNotMatch(demoHook, /https:\/\/unpkg\.com\/@tx-code\/occt-js@0\.\d+\.\d+\/dist\//);
});

test("release docs keep the root Wasm carrier authoritative", () => {
  const readme = readRepoText("README.md");
  const occtCoreReadme = readRepoText("packages/occt-core/README.md");
  const agents = readRepoText("AGENTS.md");

  assert.match(readme, /npm run test:release:root/);
  assert.match(occtCoreReadme, /npm run test:release:root/);
  assert.match(agents, /npm run test:release:root/);
  assert.match(readme, /root Wasm carrier/i);
  assert.match(agents, /conditional secondary-surface verification/i);
});

test("release docs surface the separate planning audit outside the root gate", () => {
  const readme = readRepoText("README.md");
  const occtCoreReadme = readRepoText("packages/occt-core/README.md");
  const agents = readRepoText("AGENTS.md");
  const skill = readRepoText(".codex/skills/releasing-occt-js/SKILL.md");

  assert.match(readme, /npm run test:planning:audit/);
  assert.match(readme, /separate from the authoritative root npm release gate/i);
  assert.match(occtCoreReadme, /npm run test:planning:audit/);
  assert.match(occtCoreReadme, /not part of the authoritative root release gate/i);
  assert.match(agents, /npm run test:planning:audit/);
  assert.match(agents, /separate from the authoritative root release gate/i);
  assert.match(skill, /npm run test:planning:audit/);
  assert.match(skill, /separate from the authoritative root release gate/i);
});

test("agent guidance distinguishes milestone tags from npm semver and downstream vendor refresh", () => {
  const agents = readRepoText("AGENTS.md");

  assert.match(agents, /GSD milestone versions such as `v1\.4` are planning and delivery markers/i);
  assert.match(agents, /npm package versions are controlled separately through `package\.json`/i);
  assert.match(agents, /does not, by itself, mean `@tx-code\/occt-js` has been version-bumped, published to npm, or vendored/i);
  assert.match(agents, /downstream vendored snapshots/i);
  assert.match(agents, /run `npm run test:release:root`/i);
});

test("release docs describe the import appearance contract and downstream settings boundary", () => {
  const readme = readRepoText("README.md");
  const occtCoreReadme = readRepoText("packages/occt-core/README.md");
  const agents = readRepoText("AGENTS.md");

  assert.match(readme, /appearancePreset/);
  assert.match(readme, /colorMode/);
  assert.match(readme, /defaultColor/);
  assert.match(readme, /defaultOpacity/);
  assert.match(readme, /cad-solid/);
  assert.match(readme, /cad-ghosted/);
  assert.match(readme, /0\.9,\s*0\.91,\s*0\.93/);
  assert.match(occtCoreReadme, /appearancePreset/);
  assert.match(occtCoreReadme, /colorMode/);
  assert.match(occtCoreReadme, /defaultColor/);
  assert.match(occtCoreReadme, /defaultOpacity/);
  assert.match(occtCoreReadme, /cad-solid/);
  assert.match(occtCoreReadme, /cad-ghosted/);
  assert.match(occtCoreReadme, /alpha/i);
  assert.match(occtCoreReadme, /settings persistence/i);
  assert.match(occtCoreReadme, /viewer overrides/i);
  assert.match(agents, /appearance options/i);
  assert.match(agents, /appearancePreset/);
  assert.match(agents, /defaultOpacity/);
  assert.match(agents, /settings persistence/i);
  assert.match(agents, /viewer overrides/i);
});

test("release docs describe the exact measurement SDK package-first and keep viewer concerns downstream", () => {
  const readme = readRepoText("README.md");
  const occtCoreReadme = readRepoText("packages/occt-core/README.md");
  const sdkGuide = readRepoText("docs/sdk/measurement.md");

  assert.match(readme, /## Exact Measurement SDK/);
  assert.match(readme, /@tx-code\/occt-core/);
  assert.match(readme, /SuggestExactDistancePlacement/);
  assert.match(readme, /ClassifyExactRelation/);
  assert.match(readme, /docs\/sdk\/measurement\.md/);
  assert.match(readme, /Overlay rendering, selection UX, label layout, and semantic feature recognition remain downstream concerns/i);
  assert.match(occtCoreReadme, /## Exact Measurement SDK/);
  assert.match(occtCoreReadme, /suggestExactDistancePlacement/);
  assert.match(occtCoreReadme, /suggestExactRadiusPlacement/);
  assert.match(occtCoreReadme, /classifyExactRelation/);
  assert.match(occtCoreReadme, /MeasureExactDistance/);
  assert.match(occtCoreReadme, /Overlay rendering, selection UX, label layout, and semantic feature recognition remain downstream concerns/i);
  assert.match(sdkGuide, /# Exact Measurement SDK/);
  assert.match(sdkGuide, /Package-First Workflow/);
  assert.match(sdkGuide, /suggestExactDistancePlacement/);
  assert.match(sdkGuide, /suggestExactRadiusPlacement/);
  assert.match(sdkGuide, /classifyExactRelation/);
  assert.match(sdkGuide, /Lower-Level Root Reference/);
  assert.match(sdkGuide, /overlay rendering/i);
});

test("published typings document the finalized import appearance option shape", () => {
  const typesSource = readRepoText("dist/occt-js.d.ts");

  assert.match(typesSource, /export type OcctJSImportAppearancePreset = "cad-solid" \| "cad-ghosted";/);
  assert.match(typesSource, /export type OcctJSImportColorMode = "source" \| "default";/);
  assert.match(typesSource, /opacity\?: number;/);
  assert.match(typesSource, /readColors\?: boolean;/);
  assert.match(typesSource, /appearancePreset\?: OcctJSImportAppearancePreset;/);
  assert.match(typesSource, /colorMode\?: OcctJSImportColorMode;/);
  assert.match(typesSource, /defaultColor\?: OcctJSColor;/);
  assert.match(typesSource, /defaultOpacity\?: number;/);
  assert.match(typesSource, /built-in CAD base color \[0\.9, 0\.91, 0\.93\]/);
  assert.match(typesSource, /cad-solid/);
  assert.match(typesSource, /cad-ghosted/);
  assert.match(typesSource, /Presets resolve before explicit/i);
  assert.match(typesSource, /legacy-only when colorMode is omitted/i);
  assert.match(typesSource, /only applies when colorMode is set to "default"/i);
});

test("published typings document the finalized placement and relation SDK surface", () => {
  const typesSource = readRepoText("dist/occt-js.d.ts");

  assert.match(typesSource, /export type OcctJSExactPlacementKind = "distance" \| "angle" \| "radius" \| "diameter" \| "thickness";/);
  assert.match(typesSource, /export type OcctJSExactRelationKind =/);
  assert.match(typesSource, /parallel/);
  assert.match(typesSource, /perpendicular/);
  assert.match(typesSource, /concentric/);
  assert.match(typesSource, /tangent/);
  assert.match(typesSource, /none/);
  assert.match(typesSource, /export interface OcctJSExactPlacementFrame/);
  assert.match(typesSource, /export interface OcctJSExactPlacementAnchor/);
  assert.match(typesSource, /SuggestExactDistancePlacement/);
  assert.match(typesSource, /SuggestExactRadiusPlacement/);
  assert.match(typesSource, /ClassifyExactRelation/);
});

test("release skill stays a thin AGENTS shim and keeps secondary surfaces conditional", () => {
  const skill = readRepoText(".codex/skills/releasing-occt-js/SKILL.md");

  assert.match(skill, /AGENTS\.md/);
  assert.match(skill, /npm run test:release:root/);
  assert.match(skill, /conditional/i);
  assert.equal(skill.includes("cd demo; npm run build"), false);
  assert.equal(skill.includes("npx playwright test"), false);
  assert.equal(skill.includes("demo/src/hooks/useOcct.js"), false);
  assert.equal(skill.includes("tauri:build"), false);
  assert.equal(skill.includes("@tx-code/occt-babylon-loader"), false);
});
