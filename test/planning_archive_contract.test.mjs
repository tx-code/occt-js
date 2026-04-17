import test from "node:test";
import assert from "node:assert/strict";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(__dirname, "..");

function readRepoText(relativePath) {
  return readFileSync(resolve(repoRoot, relativePath), "utf8");
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function parseFrontmatter(markdown) {
  const match = markdown.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  if (!match) {
    return {};
  }

  const frontmatter = {};
  for (const line of match[1].split(/\r?\n/)) {
    const kvMatch = line.match(/^([A-Za-z0-9_]+):\s*(.+)$/);
    if (!kvMatch) {
      continue;
    }
    frontmatter[kvMatch[1]] = kvMatch[2].replace(/^"(.*)"$/, "$1");
  }
  return frontmatter;
}

function findPhaseDir(phaseNumber) {
  const phasesRoot = resolve(repoRoot, ".planning", "phases");
  if (!existsSync(phasesRoot)) {
    return null;
  }

  const prefix = `${phaseNumber}-`;
  const entry = readdirSync(phasesRoot, { withFileTypes: true }).find(
    (dirent) => dirent.isDirectory() && dirent.name.startsWith(prefix),
  );
  return entry ? resolve(phasesRoot, entry.name) : null;
}

test("active milestone planning corpus stays internally consistent", () => {
  const project = readRepoText(".planning/PROJECT.md");
  const roadmap = readRepoText(".planning/ROADMAP.md");
  const requirements = readRepoText(".planning/REQUIREMENTS.md");
  const state = readRepoText(".planning/STATE.md");
  const frontmatter = parseFrontmatter(state);
  const coreValue =
    "Downstream applications can reliably consume the OCCT Wasm runtime and its root API contract without build drift or packaging surprises.";

  assert.equal(frontmatter.milestone, "v1.5");
  assert.equal(frontmatter.milestone_name, "Root Release Hardening");
  assert.match(project, new RegExp(escapeRegExp(coreValue)));
  assert.match(state, new RegExp(escapeRegExp(coreValue)));
  assert.match(roadmap, /🚧 \*\*v1\.5 Root Release Hardening\*\* - Phases 18-20 \(active\)/);
  assert.match(project, /## Current Milestone: v1\.5 Root Release Hardening/);
  assert.match(requirements, /## v1\.5 Requirements/);
  assert.match(state, /Current focus:\s*Phase 19 Root Release Governance Decoupling/i);
});

test("completed active-milestone phases keep their planning artifacts", () => {
  const phaseDir = findPhaseDir("18");

  assert.ok(phaseDir, "expected a phase directory for completed Phase 18");

  const phaseFiles = readdirSync(phaseDir);
  const planFiles = phaseFiles.filter((name) => name.endsWith("-PLAN.md"));
  const summaryFiles = phaseFiles.filter((name) => name.endsWith("-SUMMARY.md"));
  const verificationFiles = phaseFiles.filter((name) => name.endsWith("-VERIFICATION.md"));

  assert.equal(planFiles.length > 0, true);
  assert.equal(summaryFiles.length, planFiles.length);
  assert.equal(verificationFiles.length, 1);
});

test("archived milestone links in roadmap resolve to archived planning files", () => {
  const roadmap = readRepoText(".planning/ROADMAP.md");
  const milestones = readRepoText(".planning/MILESTONES.md");
  const archiveMatches = [...roadmap.matchAll(/\.\/milestones\/(v[0-9.]+)-ROADMAP\.md/g)];

  assert.equal(archiveMatches.length > 0, true);

  for (const [, version] of archiveMatches) {
    assert.equal(existsSync(resolve(repoRoot, ".planning", "milestones", `${version}-ROADMAP.md`)), true);
    assert.equal(existsSync(resolve(repoRoot, ".planning", "milestones", `${version}-REQUIREMENTS.md`)), true);
    assert.equal(existsSync(resolve(repoRoot, ".planning", "milestones", `${version}-phases`)), true);
    assert.match(milestones, new RegExp(`## ${escapeRegExp(version)}\\b`));
  }
});
