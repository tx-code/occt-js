# Phase 19: Root Release Governance Decoupling - Pattern Map

**Mapped:** 2026-04-17
**Files analyzed:** 7 scoped files
**Analogs found:** 7 / 7

Phase 19 centers on one existing root-governance test file, one root script manifest, and four release-facing docs. The work should preserve the repo's existing source-text governance style and top-level npm script discovery pattern while splitting `.planning` archive checks away from the authoritative root release gate.

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|-------------------|------|-----------|----------------|---------------|
| `test/release_governance_contract.test.mjs` | test | file-I/O | current file | exact |
| `test/planning_archive_contract.test.mjs` | test | file-I/O | `test/release_governance_contract.test.mjs` | partial |
| `package.json` | manifest | command-surface | current file | exact |
| `README.md` | docs | release guidance | current file | exact |
| `AGENTS.md` | docs | repo policy | current file | exact |
| `packages/occt-core/README.md` | docs | package guidance | current file | exact |
| `.codex/skills/releasing-occt-js/SKILL.md` | skill-doc | maintainer workflow | current file | exact |

## Pattern Assignments

### `test/release_governance_contract.test.mjs` (test, file-I/O)

**Scope:** Required. This is the current root-governance suite already wired into `test:release:root`.

**Analog:** current file

**Repo-read helper pattern** (`test/release_governance_contract.test.mjs` lines 1-16):
```javascript
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
```

**Root command-surface assertion style** (`test/release_governance_contract.test.mjs` lines 16-22):
```javascript
test("authoritative root release command surface stays runtime-first", () => {
  const packageJson = readRepoJson("package.json");
  const releaseCommand = packageJson.scripts?.["test:release:root"];

  assert.equal(releaseCommand, "...");
});
```

**Doc-governance assertion style** (`test/release_governance_contract.test.mjs` lines 79-98):
```javascript
test("release docs keep the root Wasm carrier authoritative", () => {
  const readme = readRepoText("README.md");
  const occtCoreReadme = readRepoText("packages/occt-core/README.md");
  const agents = readRepoText("AGENTS.md");

  assert.match(readme, /npm run test:release:root/);
  assert.match(agents, /conditional secondary-surface verification/i);
});
```

Planner note: keep this file focused on release-relevant source-text assertions and remove live `.planning` archive-state expectations from this root-gate suite.

---

### `test/planning_archive_contract.test.mjs` (test, file-I/O)

**Scope:** New file. This is the natural home for any retained `.planning` archive/process assertions once they leave the authoritative root release gate.

**Analog:** `test/release_governance_contract.test.mjs`

**Pattern to copy:** same repo-root helper functions, `node:test`, and explicit source-text / existence assertions. Keep it narrow and intentional: planning audit only, no runtime/package assertions.

Planner note: make this file validate the planning corpus generically for the current repo state instead of hardcoding "v1.4 archived with no active milestone" as a permanent root-release truth.

---

### `package.json` (manifest, command-surface)

**Scope:** Required. Root maintainer command surfaces live here.

**Analog:** current file

**Script naming pattern** (`package.json` lines 24-29):
```json
"scripts": {
  "build:wasm:win": "tools\\build_wasm_win_dist.bat",
  "test:release:root": "...",
  "test:wasm:preflight": "...",
  "test": "..."
}
```

Planner note: if a separate planning audit command is retained, surface it as another top-level `test:*` script here rather than relying on a prose-only manual command.

---

### `README.md` and `packages/occt-core/README.md` (docs)

**Scope:** Required. These are the public release-facing docs that already mention `npm run test:release:root`.

**Analog:** current files

**README release-gate section pattern** (`README.md` around "## Release Gate"):
```markdown
## Release Gate

Use `npm run test:release:root` as the authoritative root release verification command:
```

**Package README release note pattern** (`packages/occt-core/README.md` quick example notes):
```markdown
- Root release verification is driven by `npm run test:release:root` from the repository root; demo, Babylon, and Tauri checks remain conditional secondary-surface verification.
```

Planner note: keep the docs concise and explicit. Add the separate planning-audit path without diluting the authoritative root gate language.

---

### `AGENTS.md` and `.codex/skills/releasing-occt-js/SKILL.md` (repo policy / skill shim)

**Scope:** Required. `AGENTS.md` is the source of truth; the release skill intentionally stays thin and mirrors it.

**Analog:** current files

**Thin-skill shim pattern** (`.codex/skills/releasing-occt-js/SKILL.md` overview):
```markdown
Repository-wide policy lives in `AGENTS.md`. Use that file as the source of truth for release boundaries, root-vs-secondary surfaces, and conditional secondary-surface verification.
```

**Repo-policy pattern** (`AGENTS.md` release sections):
```markdown
- `npm run test:release:root`
  - canonical runtime-first release verification for the root Wasm carrier
...
- demo, Babylon, and Tauri checks are conditional secondary-surface verification, not unconditional root release gates
```

Planner note: update `AGENTS.md` first conceptually, then keep the skill wording as a thin mirror. Do not move repo policy into the skill file.

## Shared Patterns

### Source-text governance tests

**Source:** `test/release_governance_contract.test.mjs`

Use direct `readRepoText(...)` / `readRepoJson(...)` helpers and regex or exact-string assertions to lock docs and command surfaces. Do not introduce a heavier config parser just for this phase.

### Top-level npm script discoverability

**Source:** `package.json`, `README.md`

Root maintainer workflows are exposed from repo-root `package.json` and then documented from there. New governance commands should follow the same pattern.

### Thin release shim

**Source:** `.codex/skills/releasing-occt-js/SKILL.md`, `AGENTS.md`

Keep repo policy centralized in `AGENTS.md`; the release skill should only describe release-specific mechanics and point back to `AGENTS.md` for the boundary rules.

## No Analog Found

None. Every scoped Phase 19 file either already exists or has a direct in-repo analog for its role.

## Metadata

**Analog search scope:** `test/`, repo-root manifests/docs, package README surfaces, `.codex/skills/`, `.planning/`  
**Files scanned:** 10  
**Pattern extraction date:** 2026-04-17
