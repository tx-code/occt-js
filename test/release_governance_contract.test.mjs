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

  assert.match(requirements, /\| REF-03 \| Phase 7 \| Completed \|/);
  assert.match(requirements, /\| MEAS-03 \| Phase 7 \| Completed \|/);
  assert.match(requirements, /\| MEAS-04 \| Phase 8 \| Completed \|/);
  assert.match(requirements, /\| MEAS-05 \| Phase 8 \| Completed \|/);
  assert.match(requirements, /\| ADAPT-01 \| Phase 8 \| Completed \|/);
  assert.match(requirements, /\| ADAPT-02 \| Phase 8 \| Completed \|/);
});

test("planning traceability marks Phase 7 requirements complete before Phase 8 execution", () => {
  const requirements = readRepoText(".planning/REQUIREMENTS.md");

  assert.match(requirements, /\| REF-03 \| Phase 7 \| Completed \|/);
  assert.match(requirements, /\| MEAS-03 \| Phase 7 \| Completed \|/);
});

test("planning state stays aligned to the root Wasm carrier", () => {
  const project = readRepoText(".planning/PROJECT.md");
  const roadmap = readRepoText(".planning/ROADMAP.md");
  const state = readRepoText(".planning/STATE.md");
  const coreValue = "Downstream applications can reliably consume the OCCT Wasm runtime and its root API contract without build drift or packaging surprises.";

  assert.match(project, new RegExp(coreValue.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
  assert.match(state, new RegExp(coreValue.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
  assert.match(roadmap, /test\/release_governance_contract\.test\.mjs/);
  assert.match(roadmap, /npm run test:release:root/);
});

test("planning state marks phase 8 pairwise work complete", () => {
  const roadmap = readRepoText(".planning/ROADMAP.md");
  const state = readRepoText(".planning/STATE.md");

  assert.match(roadmap, /- \[x\] \*\*Phase 8: Pairwise Measurement Contract Hardening\*\*/);
  assert.match(roadmap, /- \[x\] 08-01-PLAN\.md/);
  assert.match(roadmap, /- \[x\] 08-02-PLAN\.md/);
  assert.match(roadmap, /- \[x\] 08-03-PLAN\.md/);
  assert.match(roadmap, /\| 8\. Pairwise Measurement Contract Hardening \| 3\/3 \| Complete \| 2026-04-15 \|/);

  assert.match(state, /status:\s*complete/i);
  assert.match(state, /completed_phases:\s*4/);
  assert.match(state, /completed_plans:\s*9/);
  assert.match(state, /percent:\s*100/);
  assert.match(state, /Phase:\s*08 .*COMPLETE/i);
  assert.match(state, /Status:\s*Phase 08 complete/i);
  assert.match(state, /Progress:\s*\[██████████\]\s*100%/);
});
