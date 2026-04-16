import test from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
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
    "npm run build:wasm:win && node --test test/wasm_build_contract.test.mjs test/package_tarball_contract.test.mjs test/release_governance_contract.test.mjs test/exact_pairwise_measurement_contract.test.mjs && npm --prefix packages/occt-core test && npm test",
  );
});

test("authoritative root release command surface includes exact pairwise measurement coverage", () => {
  const packageJson = readRepoJson("package.json");
  const releaseCommand = packageJson.scripts?.["test:release:root"] ?? "";
  const testCommand = packageJson.scripts?.test ?? "";

  assert.match(releaseCommand, /test\/exact_pairwise_measurement_contract\.test\.mjs/);
  assert.match(testCommand, /test\/exact_pairwise_measurement_contract\.test\.mjs/);
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

test("milestone archives preserve prior shipped requirements while active v1.4 requirements exist", () => {
  const milestones = readRepoText(".planning/MILESTONES.md");
  const activeRequirements = readRepoText(".planning/REQUIREMENTS.md");
  const archivedV13Requirements = readRepoText(".planning/milestones/v1.3-REQUIREMENTS.md");
  const archivedV12Requirements = readRepoText(".planning/milestones/v1.2-REQUIREMENTS.md");

  assert.equal(existsSync(resolve(repoRoot, ".planning/REQUIREMENTS.md")), true);
  assert.match(activeRequirements, /# Requirements: occt-js/);
  assert.match(activeRequirements, /## v1\.4 Requirements/);
  assert.match(activeRequirements, /\| PLCT-01 \| Phase 15 \| Completed \|/);
  assert.match(activeRequirements, /\| REL-01 \| Phase 16 \| Completed \|/);
  assert.match(activeRequirements, /\| DOCS-01 \| Phase 17 \| Pending \|/);
  assert.match(archivedV13Requirements, /# Requirements Archive: v1\.3 Appearance Expansion/);
  assert.match(archivedV13Requirements, /\| APPR-06 \| Phase 12 \| Completed \|/);
  assert.match(archivedV13Requirements, /\| APPR-07 \| Phase 13 \| Completed \|/);
  assert.match(archivedV13Requirements, /\| APPR-08 \| Phase 13 \| Completed \|/);
  assert.match(archivedV13Requirements, /\| ADAPT-05 \| Phase 13 \| Completed \|/);
  assert.match(archivedV13Requirements, /\| ADAPT-06 \| Phase 14 \| Completed \|/);
  assert.match(milestones, /## v1\.3 Appearance Expansion/);
  assert.match(milestones, /## v1\.2 Import Appearance Contract/);
  assert.match(archivedV12Requirements, /# Requirements Archive: v1\.2 Import Appearance Contract/);
  assert.match(archivedV12Requirements, /\| ADAPT-04 \| Phase 11 \| Completed \|/);
});

test("milestone archives capture the shipped v1.3 planning corpus and preserve older milestones", () => {
  const milestones = readRepoText(".planning/MILESTONES.md");
  const archivedRoadmap = readRepoText(".planning/milestones/v1.3-ROADMAP.md");
  const archivedRequirements = readRepoText(".planning/milestones/v1.3-REQUIREMENTS.md");
  const olderRoadmap = readRepoText(".planning/milestones/v1.2-ROADMAP.md");
  const olderRequirements = readRepoText(".planning/milestones/v1.2-REQUIREMENTS.md");
  const oldestRoadmap = readRepoText(".planning/milestones/v1.1-ROADMAP.md");

  assert.match(milestones, /## v1\.3 Appearance Expansion/);
  assert.match(milestones, /## v1\.2 Import Appearance Contract/);
  assert.match(milestones, /## v1\.1 Exact BRep Measurement Foundation/);
  assert.match(archivedRoadmap, /### Phase 14: Appearance Expansion Governance/);
  assert.match(archivedRequirements, /# Requirements Archive: v1\.3 Appearance Expansion/);
  assert.match(olderRoadmap, /### Phase 11: Appearance Governance & Downstream Contract/);
  assert.match(olderRequirements, /# Requirements Archive: v1\.2 Import Appearance Contract/);
  assert.match(oldestRoadmap, /### Phase 8: Pairwise Measurement Contract Hardening/);
  assert.equal(existsSync(resolve(repoRoot, ".planning/milestones/v1.3-phases/12-root-alpha-opacity-fallback")), true);
  assert.equal(existsSync(resolve(repoRoot, ".planning/milestones/v1.3-phases/13-appearance-preset-adapter-parity")), true);
  assert.equal(existsSync(resolve(repoRoot, ".planning/milestones/v1.3-phases/14-appearance-expansion-governance")), true);
});

test("project state stays aligned to the root Wasm carrier after starting v1.4", () => {
  const project = readRepoText(".planning/PROJECT.md");
  const requirements = readRepoText(".planning/REQUIREMENTS.md");
  const roadmap = readRepoText(".planning/ROADMAP.md");
  const state = readRepoText(".planning/STATE.md");
  const coreValue = "Downstream applications can reliably consume the OCCT Wasm runtime and its root API contract without build drift or packaging surprises.";

  assert.match(project, new RegExp(coreValue.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
  assert.match(state, new RegExp(coreValue.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
  assert.match(roadmap, /🚧 \*\*v1\.4 Exact Measurement Placement & Relation SDK\*\* - Phases 15-17 \(active\)/);
  assert.match(project, /## Current State/);
  assert.match(project, /v1\.3 Appearance Expansion/i);
  assert.match(project, /v1\.4 Exact Measurement Placement & Relation SDK/i);
  assert.match(project, /PrsDim/i);
  assert.match(project, /@tx-code\/occt-core/);
  assert.match(project, /## Current Milestone: v1\.4 Exact Measurement Placement & Relation SDK/);
  assert.match(requirements, /PLCT-01/);
  assert.match(requirements, /REL-02/);
  assert.match(requirements, /GOV-01/);
  assert.match(project, /## Evolution/);
});

test("planning state reflects active v1.4 milestone", () => {
  const roadmap = readRepoText(".planning/ROADMAP.md");
  const requirements = readRepoText(".planning/REQUIREMENTS.md");
  const state = readRepoText(".planning/STATE.md");

  assert.match(roadmap, /🚧 \*\*v1\.4 Exact Measurement Placement & Relation SDK\*\* - Phases 15-17 \(active\)/);
  assert.match(roadmap, /✅ \[v1\.3 Appearance Expansion\]\(\.\/milestones\/v1\.3-ROADMAP\.md\) — Phases 12-14, shipped 2026-04-15/);
  assert.match(roadmap, /✅ \[v1\.2 Import Appearance Contract\]\(\.\/milestones\/v1\.2-ROADMAP\.md\) — Phases 9-11, shipped 2026-04-15/);
  assert.equal(existsSync(resolve(repoRoot, ".planning/REQUIREMENTS.md")), true);
  assert.match(requirements, /## v1\.4 Requirements/);
  assert.equal(existsSync(resolve(repoRoot, ".planning/phases/12-root-alpha-opacity-fallback")), false);
  assert.equal(existsSync(resolve(repoRoot, ".planning/phases/13-appearance-preset-adapter-parity")), false);
  assert.equal(existsSync(resolve(repoRoot, ".planning/phases/14-appearance-expansion-governance")), false);
  assert.equal(existsSync(resolve(repoRoot, ".planning/phases/15-placement-contract-hardening")), true);
  assert.equal(existsSync(resolve(repoRoot, ".planning/phases/15-placement-contract-hardening/15-01-SUMMARY.md")), true);
  assert.equal(existsSync(resolve(repoRoot, ".planning/phases/15-placement-contract-hardening/15-02-SUMMARY.md")), true);
  assert.equal(existsSync(resolve(repoRoot, ".planning/phases/16-exact-relation-classifier-contract")), true);
  assert.equal(existsSync(resolve(repoRoot, ".planning/phases/16-exact-relation-classifier-contract/16-CONTEXT.md")), true);
  assert.equal(existsSync(resolve(repoRoot, ".planning/phases/16-exact-relation-classifier-contract/16-RESEARCH.md")), true);
  assert.equal(existsSync(resolve(repoRoot, ".planning/phases/16-exact-relation-classifier-contract/16-VALIDATION.md")), true);
  assert.equal(existsSync(resolve(repoRoot, ".planning/phases/16-exact-relation-classifier-contract/16-01-PLAN.md")), true);
  assert.equal(existsSync(resolve(repoRoot, ".planning/phases/16-exact-relation-classifier-contract/16-02-PLAN.md")), true);
  assert.equal(existsSync(resolve(repoRoot, ".planning/phases/16-exact-relation-classifier-contract/16-01-SUMMARY.md")), true);
  assert.equal(existsSync(resolve(repoRoot, ".planning/phases/16-exact-relation-classifier-contract/16-02-SUMMARY.md")), true);
  assert.equal(existsSync(resolve(repoRoot, ".planning/phases/17-sdk-docs-governance")), true);
  assert.equal(existsSync(resolve(repoRoot, ".planning/phases/17-sdk-docs-governance/17-CONTEXT.md")), true);
  assert.equal(existsSync(resolve(repoRoot, ".planning/phases/17-sdk-docs-governance/17-RESEARCH.md")), true);
  assert.equal(existsSync(resolve(repoRoot, ".planning/phases/17-sdk-docs-governance/17-VALIDATION.md")), true);
  assert.equal(existsSync(resolve(repoRoot, ".planning/phases/17-sdk-docs-governance/17-01-PLAN.md")), true);
  assert.equal(existsSync(resolve(repoRoot, ".planning/phases/17-sdk-docs-governance/17-02-PLAN.md")), true);

  assert.match(state, /milestone:\s*v1\.4/i);
  assert.match(state, /milestone_name:\s*Exact Measurement Placement & Relation SDK/i);
  assert.match(state, /status:\s*executing/i);
  assert.match(roadmap, /\[x\] \*\*Phase 15: Placement Contract Hardening\*\*/i);
  assert.match(roadmap, /\| 15\. Placement Contract Hardening \| 2\/2 \| Complete \| 2026-04-16 \|/);
  assert.match(roadmap, /\[x\] \*\*Phase 16: Exact Relation Classifier Contract\*\*/i);
  assert.match(roadmap, /\| 16\. Exact Relation Classifier Contract \| 2\/2 \| Complete \| 2026-04-16 \|/);
  assert.match(roadmap, /\[ \] \*\*Phase 17: SDK Docs & Governance\*\*/i);
  assert.match(roadmap, /\| 17\. SDK Docs & Governance \| 0\/2 \| Planned \| — \|/);
  assert.match(state, /Current focus:\s*Phase 17 execution for v1\.4 Exact Measurement Placement & Relation SDK/i);
  assert.match(state, /Milestone:\s*v1\.4 Exact Measurement Placement & Relation SDK/i);
  assert.match(state, /Phase:\s*17 \(sdk-docs-governance\) — PLANNED/i);
  assert.match(state, /Status:\s*Phase 17 ready for execution/i);
  assert.match(state, /Next step is `\/gsd-execute-phase 17`/i);
  assert.match(state, /Progress:\s*\[#######---\]\s*67%/);
});
