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
  const state = readRepoText(".planning/STATE.md");
  const frontmatter = parseFrontmatter(state);
  const coreValue =
    "Downstream applications can reliably consume the OCCT Wasm runtime and its root API contract without build drift or packaging surprises.";
  const requirementsExists = existsSync(resolve(repoRoot, ".planning", "REQUIREMENTS.md"));

  assert.equal(typeof frontmatter.milestone, "string");
  assert.equal(typeof frontmatter.milestone_name, "string");
  assert.ok(frontmatter.milestone.length > 0);
  assert.ok(frontmatter.milestone_name.length > 0);
  assert.match(project, new RegExp(escapeRegExp(coreValue)));
  assert.match(state, new RegExp(escapeRegExp(coreValue)));

  if (requirementsExists) {
    const requirements = readRepoText(".planning/REQUIREMENTS.md");
    assert.match(
      roadmap,
      new RegExp(`🚧 \\*\\*${escapeRegExp(frontmatter.milestone)} ${escapeRegExp(frontmatter.milestone_name)}\\*\\*`),
    );
    assert.match(
      project,
      new RegExp(`## Current Milestone: ${escapeRegExp(frontmatter.milestone)} ${escapeRegExp(frontmatter.milestone_name)}`),
    );
    assert.match(requirements, /## v1 Requirements/);
    assert.match(state, /Current focus:\s*.+/i);
    return;
  }

  assert.doesNotMatch(roadmap, /🚧 \*\*/);
  assert.match(roadmap, /\[v1\.8 Wasm\+JS Revolved Shape Generation\]/);
  assert.match(project, /## No Active Milestone/);
  assert.match(project, /\$gsd-new-milestone/);
  assert.match(state, /Current focus:\s*Planning next milestone/i);
});

test("completed active-milestone phases keep their planning artifacts", () => {
  const requirementsExists = existsSync(resolve(repoRoot, ".planning", "REQUIREMENTS.md"));

  if (!requirementsExists) {
    const state = readRepoText(".planning/STATE.md");
    const frontmatter = parseFrontmatter(state);
    const archivedPhasesRoot = resolve(repoRoot, ".planning", "milestones", `${frontmatter.milestone}-phases`);

    assert.equal(existsSync(archivedPhasesRoot), true);

    const phaseDirs = readdirSync(archivedPhasesRoot, { withFileTypes: true }).filter((entry) => entry.isDirectory());
    assert.equal(phaseDirs.length > 0, true);

    for (const phaseDir of phaseDirs) {
      const phaseFiles = readdirSync(resolve(archivedPhasesRoot, phaseDir.name));
      const planFiles = phaseFiles.filter((name) => name.endsWith("-PLAN.md"));
      const summaryFiles = phaseFiles.filter((name) => name.endsWith("-SUMMARY.md"));

      assert.equal(planFiles.length > 0, true, `expected plan artifacts for archived phase ${phaseDir.name}`);
      assert.equal(
        summaryFiles.length,
        planFiles.length,
        `expected summary count parity for archived phase ${phaseDir.name}`,
      );
    }
    return;
  }

  const roadmap = readRepoText(".planning/ROADMAP.md");
  const completedPhaseNumbers = [...roadmap.matchAll(/- \[x\] \*\*Phase (\d+):/g)].map((match) => match[1]);

  if (completedPhaseNumbers.length === 0) {
    const phasesRoot = resolve(repoRoot, ".planning", "phases");
    const phaseDirs = existsSync(phasesRoot)
      ? readdirSync(phasesRoot, { withFileTypes: true }).filter((entry) => entry.isDirectory())
      : [];

    assert.equal(
      phaseDirs.length,
      0,
      "newly initialized milestones should not need active phase directories before the first phase is discussed/planned",
    );
    return;
  }

  for (const phaseNumber of completedPhaseNumbers) {
    const phaseDir = findPhaseDir(phaseNumber);
    assert.ok(phaseDir, `expected a phase directory for completed Phase ${phaseNumber}`);

    const phaseFiles = readdirSync(phaseDir);
    const planFiles = phaseFiles.filter((name) => name.endsWith("-PLAN.md"));
    const summaryFiles = phaseFiles.filter((name) => name.endsWith("-SUMMARY.md"));

    assert.equal(planFiles.length > 0, true, `expected plan artifacts for completed Phase ${phaseNumber}`);
    assert.equal(
      summaryFiles.length,
      planFiles.length,
      `expected summary count parity for completed Phase ${phaseNumber}`,
    );
  }
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
