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

  assert.match(readme, /colorMode/);
  assert.match(readme, /defaultColor/);
  assert.match(readme, /0\.9,\s*0\.91,\s*0\.93/);
  assert.match(occtCoreReadme, /colorMode/);
  assert.match(occtCoreReadme, /defaultColor/);
  assert.match(occtCoreReadme, /settings persistence/i);
  assert.match(occtCoreReadme, /viewer overrides/i);
  assert.match(agents, /appearance options/i);
  assert.match(agents, /settings persistence/i);
  assert.match(agents, /viewer overrides/i);
});

test("published typings document the finalized import appearance option shape", () => {
  const typesSource = readRepoText("dist/occt-js.d.ts");

  assert.match(typesSource, /export type OcctJSImportColorMode = "source" \| "default";/);
  assert.match(typesSource, /readColors\?: boolean;/);
  assert.match(typesSource, /colorMode\?: OcctJSImportColorMode;/);
  assert.match(typesSource, /defaultColor\?: OcctJSColor;/);
  assert.match(typesSource, /built-in CAD base color \[0\.9, 0\.91, 0\.93\]/);
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

test("planning artifacts keep requirement traceability current", () => {
  const requirements = readRepoText(".planning/REQUIREMENTS.md");

  assert.match(requirements, /\| APPR-01 \| Phase 9 \| Completed \|/);
  assert.match(requirements, /\| APPR-03 \| Phase 10 \| Completed \|/);
  assert.match(requirements, /\| APPR-04 \| Phase 10 \| Completed \|/);
  assert.match(requirements, /\| ADAPT-03 \| Phase 10 \| Completed \|/);
  assert.match(requirements, /\| ADAPT-04 \| Phase 11 \| Completed \|/);
});

test("milestone archives capture the shipped v1.1 planning corpus", () => {
  const milestones = readRepoText(".planning/MILESTONES.md");
  const archivedRoadmap = readRepoText(".planning/milestones/v1.1-ROADMAP.md");
  const archivedRequirements = readRepoText(".planning/milestones/v1.1-REQUIREMENTS.md");

  assert.match(milestones, /## v1\.1 Exact BRep Measurement Foundation/);
  assert.match(archivedRoadmap, /# Roadmap: occt-js/);
  assert.match(archivedRoadmap, /### Phase 8: Pairwise Measurement Contract Hardening/);
  assert.match(archivedRequirements, /# Requirements Archive: v1\.1 Exact BRep Measurement Foundation/);
});

test("planning state stays aligned to the root Wasm carrier", () => {
  const project = readRepoText(".planning/PROJECT.md");
  const roadmap = readRepoText(".planning/ROADMAP.md");
  const state = readRepoText(".planning/STATE.md");
  const coreValue = "Downstream applications can reliably consume the OCCT Wasm runtime and its root API contract without build drift or packaging surprises.";

  assert.match(project, new RegExp(coreValue.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
  assert.match(state, new RegExp(coreValue.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
  assert.match(roadmap, /Import Appearance Contract/);
  assert.match(project, /## Current State/);
  assert.match(project, /## Current Milestone: v1\.2 Import Appearance Contract/);
  assert.match(project, /## Evolution/);
});

test("planning state marks v1.2 phase-complete and ready for milestone closeout", () => {
  const roadmap = readRepoText(".planning/ROADMAP.md");
  const state = readRepoText(".planning/STATE.md");

  assert.match(roadmap, /🚧 \*\*v1\.2 Import Appearance Contract\*\* - Phases 9-11 \(active\)/);
  assert.match(roadmap, /- \[x\] \*\*Phase 9: Root Import Appearance Mode\*\*/);
  assert.match(roadmap, /- \[x\] \*\*Phase 10: Custom Default Color & Adapter Parity\*\*/);
  assert.match(roadmap, /- \[x\] \*\*Phase 11: Appearance Governance & Downstream Contract\*\*/);
  assert.match(roadmap, /- \[x\] 09-01-PLAN\.md/);
  assert.match(roadmap, /- \[x\] 09-02-PLAN\.md/);
  assert.match(roadmap, /- \[x\] 10-01-PLAN\.md/);
  assert.match(roadmap, /- \[x\] 10-02-PLAN\.md/);
  assert.match(roadmap, /- \[x\] 11-01-PLAN\.md/);
  assert.match(roadmap, /- \[x\] 11-02-PLAN\.md/);
  assert.match(roadmap, /\| 9\. Root Import Appearance Mode \| 2\/2 \| Complete \| 2026-04-15 \|/);
  assert.match(roadmap, /\| 10\. Custom Default Color & Adapter Parity \| 2\/2 \| Complete \| 2026-04-15 \|/);
  assert.match(roadmap, /\| 11\. Appearance Governance & Downstream Contract \| 2\/2 \| Complete \| 2026-04-15 \|/);

  assert.match(state, /status:\s*active/i);
  assert.match(state, /milestone:\s*v1\.2/i);
  assert.match(state, /milestone_name:\s*Import Appearance Contract/i);
  assert.match(state, /completed_phases:\s*3/);
  assert.match(state, /completed_plans:\s*6/);
  assert.match(state, /percent:\s*100/);
  assert.match(state, /Current focus:\s*v1\.2 ready for milestone closeout after Phase 11 completion/i);
  assert.match(state, /Status:\s*Milestone ready for closeout/i);
  assert.match(state, /Next step is `\/gsd-complete-milestone`/i);
  assert.match(state, /Progress:\s*\[##########\]\s*100%/);
});
