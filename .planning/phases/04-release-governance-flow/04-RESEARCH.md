# Phase 4: Release & Governance Flow - Research

**Researched:** 2026-04-14 [VERIFIED: shell command]  
**Domain:** Release governance, runtime-first verification, and planning traceability for the root Wasm carrier. [VERIFIED: user prompt][VERIFIED: .planning/ROADMAP.md]  
**Confidence:** HIGH. [VERIFIED: codebase file][VERIFIED: shell command]

<user_constraints>
## User Constraints

No phase-specific `04-CONTEXT.md` exists. [VERIFIED: gsd init]

Use the explicit prompt constraints below for planning. [VERIFIED: user prompt]

- Converge repo docs, verification expectations, and planning traceability around the root Wasm carrier rather than secondary viewer/demo surfaces. [VERIFIED: user prompt]
- Must address `CONS-03`, `DIST-01`, and `DIST-02`. [VERIFIED: user prompt][VERIFIED: .planning/REQUIREMENTS.md]
- Clarify the correct release verification command set for root runtime and downstream consumption changes. [VERIFIED: user prompt]
- Identify which existing docs or skills still drift from the runtime-first contract or overstate demo/Babylon/release scope. [VERIFIED: user prompt]
- Identify which planning and traceability files should be updated so active requirements stay mapped cleanly and future workflows route correctly. [VERIFIED: user prompt]
- Keep the plan split minimal enough to execute in 2-3 plans. [VERIFIED: user prompt]
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| CONS-03 | Root package changes do not require downstream consumers to adopt repo-local Babylon/demo layers in order to keep working. [VERIFIED: .planning/REQUIREMENTS.md] | Runtime-first release matrix, conditional secondary-surface checks, and release-skill cleanup all reinforce this boundary. [VERIFIED: AGENTS.md][VERIFIED: .codex/skills/releasing-occt-js/SKILL.md][VERIFIED: package.json] |
| DIST-01 | Maintainer can identify and run the correct verification commands for the root runtime and its consumption contract before release work lands. [VERIFIED: .planning/REQUIREMENTS.md] | Current command inventory, passing static/runtime/package tests, and the gap between existing tests and exposed scripts define the required Phase 4 command surface. [VERIFIED: package.json][VERIFIED: test/wasm_build_contract.test.mjs][VERIFIED: test/package_tarball_contract.test.mjs][VERIFIED: packages/occt-core/package.json][VERIFIED: shell command] |
| DIST-02 | Public docs and planning artifacts identify the root Wasm carrier as the authoritative product surface, with secondary surfaces clearly marked as non-core. [VERIFIED: .planning/REQUIREMENTS.md] | README and `occt-core` README are mostly aligned already, while `AGENTS.md`, `STATE.md`, and the release skill still contain runtime-first drift that Phase 4 should reconcile. [VERIFIED: README.md][VERIFIED: packages/occt-core/README.md][VERIFIED: AGENTS.md][VERIFIED: .planning/STATE.md][VERIFIED: .codex/skills/releasing-occt-js/SKILL.md] |
</phase_requirements>

## Project Constraints (from CLAUDE.md)

- Read `AGENTS.md` first and treat it as the authoritative repository guidance. [VERIFIED: CLAUDE.md]

## Summary

Phase 4 is governance consolidation work, not new runtime feature work. The repo already states the correct strategic boundary in `README.md`, `.planning/PROJECT.md`, `.planning/ROADMAP.md`, and `.planning/REQUIREMENTS.md`: the authoritative product surface is the root Wasm carrier `@tx-code/occt-js`, optionally wrapped by `@tx-code/occt-core`, while Babylon/demo/Tauri remain secondary. [HIGH][VERIFIED: README.md][VERIFIED: .planning/PROJECT.md][VERIFIED: .planning/ROADMAP.md][VERIFIED: .planning/REQUIREMENTS.md]

The main drift is in execution and state, not in the core downstream story. `npm test` is green and `npm run test:wasm:preflight` is green, but the repo also has passing `test/wasm_build_contract.test.mjs`, passing `test/package_tarball_contract.test.mjs`, and a passing `packages/occt-core` suite that are not exposed through the documented root release command surface. [HIGH][VERIFIED: package.json][VERIFIED: test/wasm_build_contract.test.mjs][VERIFIED: test/package_tarball_contract.test.mjs][VERIFIED: packages/occt-core/package.json][VERIFIED: shell command]

The strongest governance drift is the release skill. It still treats `demo` build and `npx playwright test` as unconditional release gates, hard-codes secondary-surface files into release staging, and assumes a demo CDN bump is part of normal root release scope, even though repo requirements and `AGENTS.md` explicitly say demo/Tauri must not become mandatory root release gates. [HIGH][VERIFIED: .codex/skills/releasing-occt-js/SKILL.md][VERIFIED: AGENTS.md][VERIFIED: .planning/REQUIREMENTS.md]

**Primary recommendation:** Make Phase 4 converge on one runtime-first release matrix rooted in existing root/package tests, make demo/Babylon/Tauri checks conditional on touched secondary surfaces, and update planning metadata so completed Phase 1-3 requirements no longer read as pending. [HIGH][VERIFIED: package.json][VERIFIED: test/wasm_build_contract.test.mjs][VERIFIED: test/package_tarball_contract.test.mjs][VERIFIED: packages/occt-core/package.json][VERIFIED: .planning/REQUIREMENTS.md][VERIFIED: .planning/STATE.md]

**Minimal plan split:** 3 plans is the cleanest split because the remaining work clusters into three independent surfaces. [HIGH][VERIFIED: .planning/ROADMAP.md][VERIFIED: package.json][VERIFIED: .codex/skills/releasing-occt-js/SKILL.md][VERIFIED: .planning/PROJECT.md][VERIFIED: .planning/STATE.md]

1. Release command matrix and script/test wiring. Update the root command surface so the real release gate covers build-contract, tarball-contract, root runtime, and `occt-core` adapter checks. [VERIFIED: package.json][VERIFIED: test/wasm_build_contract.test.mjs][VERIFIED: test/package_tarball_contract.test.mjs][VERIFIED: packages/occt-core/package.json]
2. Runtime-first docs and skill reconciliation. Keep `README.md` and `packages/occt-core/README.md` mostly stable, but fix `AGENTS.md` wording and rewrite the release skill so secondary surfaces are conditional, not unconditional. [VERIFIED: README.md][VERIFIED: packages/occt-core/README.md][VERIFIED: AGENTS.md][VERIFIED: .codex/skills/releasing-occt-js/SKILL.md]
3. Planning traceability reconciliation. Update `.planning/PROJECT.md`, `.planning/REQUIREMENTS.md`, `.planning/ROADMAP.md`, and `.planning/STATE.md` together so completed requirement status, core value wording, and next-step routing all match the runtime-first contract. [VERIFIED: .planning/PROJECT.md][VERIFIED: .planning/REQUIREMENTS.md][VERIFIED: .planning/ROADMAP.md][VERIFIED: .planning/STATE.md]

## Standard Stack

### Core
| Library / Tool | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `npm` scripts | Local `npm` is `11.11.0`. [VERIFIED: shell command] | Public maintainer command surface for build, preflight, runtime tests, pack inspection, and publish orchestration. [VERIFIED: package.json][VERIFIED: .codex/skills/releasing-occt-js/SKILL.md] | Repo docs, tests, and the release skill already route through `npm` commands, so Phase 4 should tighten that surface rather than invent a parallel release interface. [VERIFIED: package.json][VERIFIED: AGENTS.md][VERIFIED: README.md][VERIFIED: .codex/skills/releasing-occt-js/SKILL.md] |
| Node built-in test runner | Local `node` is `v24.14.1`. [VERIFIED: shell command] | Static governance tests and package contract tests under `test/` and `packages/occt-core/test/`. [VERIFIED: package.json][VERIFIED: packages/occt-core/package.json] | The repo already uses `node --test` for build-contract, tarball-contract, and package contract coverage, so Phase 4 governance tests should stay on the same runner. [VERIFIED: package.json][VERIFIED: test/wasm_build_contract.test.mjs][VERIFIED: test/package_tarball_contract.test.mjs][VERIFIED: packages/occt-core/package.json] |
| Existing planning corpus | Repo-local markdown files. [VERIFIED: .planning/PROJECT.md][VERIFIED: .planning/REQUIREMENTS.md][VERIFIED: .planning/ROADMAP.md][VERIFIED: .planning/STATE.md] | Canonical phase/requirement/constraint/continuity state for future GSD routing. [VERIFIED: .planning/PROJECT.md][VERIFIED: .planning/REQUIREMENTS.md][VERIFIED: .planning/ROADMAP.md][VERIFIED: .planning/STATE.md] | Phase 4 success criteria already point at planning traceability, so update the existing planning files instead of creating a separate release-notes governance layer. [VERIFIED: .planning/ROADMAP.md][VERIFIED: .planning/REQUIREMENTS.md] |

### Supporting
| Library / Tool | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `@playwright/test` | Local CLI `1.58.2`; current npm registry version `1.59.1` published by `2026-04-14`. [VERIFIED: shell command][VERIFIED: npm registry] | Browser/demo regression coverage through `playwright.config.mjs` and `demo/tests/`. [VERIFIED: playwright.config.mjs][VERIFIED: demo/tests][VERIFIED: package.json] | Use only when viewer or demo behavior changes; `AGENTS.md` makes viewer verification conditional, not a blanket root release gate. [VERIFIED: AGENTS.md] |
| `vite` demo build | Declared in `demo/package.json` with `npm run build`. [VERIFIED: demo/package.json] | Production bundle proof for the browser demo. [VERIFIED: demo/package.json] | Use when `demo/`, Babylon packages, or CDN-driven demo behavior changes; do not make it mandatory for root-only runtime governance changes. [VERIFIED: AGENTS.md][VERIFIED: .planning/REQUIREMENTS.md][VERIFIED: .codex/skills/releasing-occt-js/SKILL.md] |
| Cargo / Tauri toolchain | Local `cargo` is `1.94.1`. [VERIFIED: shell command] | Desktop packaging and `tauri:*` flows only. [VERIFIED: demo/package.json][VERIFIED: AGENTS.md] | Use for desktop work only; root npm publishing must remain independent of it. [VERIFIED: AGENTS.md][VERIFIED: .planning/REQUIREMENTS.md] |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| One runtime-first root release matrix built from existing root/package tests. [VERIFIED: package.json][VERIFIED: test/wasm_build_contract.test.mjs][VERIFIED: test/package_tarball_contract.test.mjs][VERIFIED: packages/occt-core/package.json] | Unconditional `demo` build plus `npx playwright test` on every root release. [VERIFIED: .codex/skills/releasing-occt-js/SKILL.md] | This over-gates secondary surfaces and conflicts with the repo’s explicit release boundary. [VERIFIED: AGENTS.md][VERIFIED: .planning/REQUIREMENTS.md] |
| Root `npm` scripts as the single source of truth. [VERIFIED: package.json] | Prose-only checklists spread across docs and skills. [VERIFIED: README.md][VERIFIED: AGENTS.md][VERIFIED: .codex/skills/releasing-occt-js/SKILL.md] | The current drift exists exactly because passing tests and documented commands are no longer the same set. [VERIFIED: package.json][VERIFIED: shell command] |
| Updating `.planning/PROJECT.md`, `.planning/REQUIREMENTS.md`, `.planning/ROADMAP.md`, and `.planning/STATE.md` together. [VERIFIED: .planning/PROJECT.md][VERIFIED: .planning/REQUIREMENTS.md][VERIFIED: .planning/ROADMAP.md][VERIFIED: .planning/STATE.md] | Waiting until milestone closeout to reconcile traceability. [VERIFIED: .planning/PROJECT.md] | Requirement status and product framing are already drifting now, so deferring the updates makes future planning less reliable. [VERIFIED: .planning/REQUIREMENTS.md][VERIFIED: .planning/STATE.md] |

**Installation:**
```bash
# No new Phase 4 dependencies are required.
```

**Version verification:** `@playwright/test` is the only supporting npm package that Phase 4 may need to mention; the repo currently depends on `^1.58.2`, the local CLI reports `1.58.2`, and the npm registry currently reports `1.59.1`. [VERIFIED: package.json][VERIFIED: shell command][VERIFIED: npm registry]

## Architecture Patterns

### Recommended Project Structure
```text
test/
├── wasm_build_contract.test.mjs      # root build-script contract
├── wasm_build_prereqs.test.mjs       # fast prerequisites
├── dist_contract_consumers.test.mjs  # dist/docs downstream guardrails
├── package_tarball_contract.test.mjs # packed root package contract
└── release_governance_contract.test.mjs  # Phase 4 target: docs/skill/planning governance

packages/
└── occt-core/
    └── test/core.test.mjs            # engine-agnostic adapter contract

.planning/
├── PROJECT.md
├── REQUIREMENTS.md
├── ROADMAP.md
└── STATE.md
```
This structure extends existing patterns instead of creating a second release-validation system. [VERIFIED: test][VERIFIED: packages/occt-core/test][VERIFIED: .planning]

### Pattern 1: Single-Source Release Command Surface
**What:** Keep the authoritative release gate in `package.json` scripts and point docs plus the release skill at those scripts. [VERIFIED: package.json][VERIFIED: README.md][VERIFIED: AGENTS.md][VERIFIED: .codex/skills/releasing-occt-js/SKILL.md]

**When to use:** Any time Phase 4 changes release guidance, publish scope, or verification expectations. [VERIFIED: .planning/ROADMAP.md][VERIFIED: .planning/REQUIREMENTS.md]

**Example:**
```json
// Source: package.json
{
  "scripts": {
    "test:wasm:preflight": "node --test test/wasm_build_prereqs.test.mjs test/load_occt_factory.test.mjs test/dist_contract_consumers.test.mjs",
    "test": "npm run test:wasm:preflight && node test/test_multi_format_exports.mjs && node test/test_iges_degenerated_edges.mjs && node test/test_step_iges_root_mode.mjs && node test/test_brep_root_mode.mjs && node test/test_optimal_orientation_api.mjs && node test/test_optimal_orientation_reference.mjs && node test/test_mvp_acceptance.mjs"
  }
}
```
Phase 4 should extend this existing script surface rather than duplicate it in prose-only release steps. [VERIFIED: package.json][VERIFIED: .codex/skills/releasing-occt-js/SKILL.md]

### Pattern 2: Static Governance Contract Tests
**What:** Treat docs, package metadata, and planning traceability as testable contract surfaces. [VERIFIED: test/dist_contract_consumers.test.mjs][VERIFIED: test/package_tarball_contract.test.mjs]

**When to use:** When release guidance, package surface, or runtime-first wording changes without changing OCCT runtime behavior itself. [VERIFIED: .planning/ROADMAP.md][VERIFIED: .planning/REQUIREMENTS.md]

**Example:**
```js
// Source: test/package_tarball_contract.test.mjs
function getDryRunPackManifest() {
  return JSON.parse(
    process.platform === "win32"
      ? execFileSync("cmd.exe", ["/d", "/s", "/c", "npm pack --dry-run --json"], { cwd: repoRoot, encoding: "utf8" })
      : execFileSync("npm", ["pack", "--dry-run", "--json"], { cwd: repoRoot, encoding: "utf8" }),
  )[0];
}
```
This is already the right pattern for Phase 4 because release governance here is mostly metadata and documentation integrity. [VERIFIED: test/package_tarball_contract.test.mjs]

### Pattern 3: Change-Triggered Secondary Surface Checks
**What:** Keep viewer/demo/Tauri verification conditional on touched files, not on root publish intent alone. [VERIFIED: AGENTS.md][VERIFIED: .planning/REQUIREMENTS.md]

**When to use:** When edits touch `demo/`, `demo/tests/`, `demo/src-tauri/`, or Babylon packages. [VERIFIED: demo/package.json][VERIFIED: AGENTS.md]

**Example:**
```text
// Source: AGENTS.md
- if the root Wasm contract changes, verify root tests first
- if viewer behavior changes, verify `demo` build and relevant viewer tests
```
This is already the repo-level rule; Phase 4 should move the release skill back into alignment with it. [VERIFIED: AGENTS.md][VERIFIED: .codex/skills/releasing-occt-js/SKILL.md]

### Anti-Patterns to Avoid
- **Unconditional demo/browser release gates:** The release skill currently requires `demo` build and Playwright for every release, which conflicts with the stated root release boundary. [VERIFIED: .codex/skills/releasing-occt-js/SKILL.md][VERIFIED: AGENTS.md][VERIFIED: .planning/REQUIREMENTS.md]
- **Hard-coded staging of secondary-surface files:** The release skill’s fixed `git add` list assumes demo component files belong in release work, which is unsafe for root-only release changes. [VERIFIED: .codex/skills/releasing-occt-js/SKILL.md]
- **Planning drift after completed phases:** `CORE-01` through `CONS-02` remain `Pending` in `.planning/REQUIREMENTS.md` even though Phases 1-3 are marked complete in `.planning/ROADMAP.md`. [VERIFIED: .planning/REQUIREMENTS.md][VERIFIED: .planning/ROADMAP.md]

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Proving the packed publish surface | Manual tarball inspection or trial publish. [VERIFIED: test/package_tarball_contract.test.mjs] | `npm pack --dry-run --json` through `test/package_tarball_contract.test.mjs`. [VERIFIED: test/package_tarball_contract.test.mjs][VERIFIED: shell command] | The repo already has a passing, cross-platform pack-manifest contract test. [VERIFIED: test/package_tarball_contract.test.mjs][VERIFIED: shell command] |
| Verifying downstream adapter stability | Demo/Babylon smoke tests as a proxy for `occt-core`. [VERIFIED: demo/package.json][VERIFIED: packages/occt-core/package.json] | `npm --prefix packages/occt-core test`. [VERIFIED: packages/occt-core/package.json][VERIFIED: shell command] | `occt-core` is the engine-agnostic downstream adapter; its own suite is the direct contract proof. [VERIFIED: packages/occt-core/README.md][VERIFIED: packages/occt-core/package.json] |
| Release bookkeeping | A separate handwritten checklist detached from scripts and tests. [VERIFIED: .codex/skills/releasing-occt-js/SKILL.md] | Root `npm` scripts plus one governance contract test plus an aligned release skill. [VERIFIED: package.json][VERIFIED: test/dist_contract_consumers.test.mjs][VERIFIED: test/package_tarball_contract.test.mjs] | The existing drift is between prose and the actual tested surfaces; Phase 4 should reduce sources of truth, not add another one. [VERIFIED: package.json][VERIFIED: shell command] |

**Key insight:** Phase 4 should mostly route existing proof surfaces correctly; the repo already has the right tests and product boundary, but they are not exposed through one consistent release/governance interface yet. [VERIFIED: package.json][VERIFIED: test/wasm_build_contract.test.mjs][VERIFIED: test/package_tarball_contract.test.mjs][VERIFIED: README.md][VERIFIED: .planning/ROADMAP.md]

## Common Pitfalls

### Pitfall 1: Hidden Contract Tests Outside the Documented Gate
**What goes wrong:** Maintainers can run the documented root gate and still miss the build-contract and tarball-contract tests because neither is wired into `npm run test:wasm:preflight` or `npm test`. [HIGH][VERIFIED: package.json][VERIFIED: test/wasm_build_contract.test.mjs][VERIFIED: test/package_tarball_contract.test.mjs][VERIFIED: shell command]

**Why it happens:** Phase 01 and Phase 03 added those tests as standalone contract files, but the public script surface never absorbed them. [VERIFIED: .planning/phases/01-wasm-build-dist-baseline/01-01-SUMMARY.md][VERIFIED: .planning/phases/03-downstream-consumption-contract/03-01-SUMMARY.md][VERIFIED: package.json]

**How to avoid:** Add or document one explicit root release-contract command that runs build-contract, tarball-contract, `occt-core`, and root runtime suites together. [VERIFIED: package.json][VERIFIED: packages/occt-core/package.json][VERIFIED: shell command]

**Warning signs:** The release skill claims verification is complete even though `node --test test/wasm_build_contract.test.mjs` and `node --test test/package_tarball_contract.test.mjs` are not part of the same command path. [VERIFIED: .codex/skills/releasing-occt-js/SKILL.md][VERIFIED: package.json]

### Pitfall 2: Secondary-Surface Gate Creep
**What goes wrong:** Root-only release work becomes blocked by demo build or browser-test failures unrelated to the root Wasm carrier. [HIGH][VERIFIED: .codex/skills/releasing-occt-js/SKILL.md][VERIFIED: AGENTS.md][VERIFIED: .planning/REQUIREMENTS.md]

**Why it happens:** The release skill currently treats `demo/src/hooks/useOcct.js`, `demo` build, and `npx playwright test` as mandatory parts of every release. [VERIFIED: .codex/skills/releasing-occt-js/SKILL.md]

**How to avoid:** Keep secondary-surface checks file-triggered and separate from the unconditional root release matrix. [VERIFIED: AGENTS.md][VERIFIED: .planning/REQUIREMENTS.md]

**Warning signs:** A root package version bump with no `demo/` or Babylon changes still requires `cd demo; npm run build` and `npx playwright test`. [VERIFIED: .codex/skills/releasing-occt-js/SKILL.md]

### Pitfall 3: Planning State Drift After Successful Phases
**What goes wrong:** Future planners and agents see mixed signals about what is complete, what remains active, and what the core value actually is. [HIGH][VERIFIED: .planning/PROJECT.md][VERIFIED: .planning/REQUIREMENTS.md][VERIFIED: .planning/ROADMAP.md][VERIFIED: .planning/STATE.md]

**Why it happens:** `.planning/ROADMAP.md` marks Phases 1-3 complete, but `.planning/REQUIREMENTS.md` still shows the completed Phase 1-3 requirements as `Pending`, and `.planning/STATE.md` still says the core value is to reuse the same "viewer/runtime stack". [VERIFIED: .planning/ROADMAP.md][VERIFIED: .planning/REQUIREMENTS.md][VERIFIED: .planning/STATE.md]

**How to avoid:** Update `PROJECT.md`, `REQUIREMENTS.md`, `ROADMAP.md`, and `STATE.md` in the same Phase 4 wave. [VERIFIED: .planning/PROJECT.md][VERIFIED: .planning/REQUIREMENTS.md][VERIFIED: .planning/ROADMAP.md][VERIFIED: .planning/STATE.md]

**Warning signs:** The runtime-first contract is correct in README and roadmap text, but state and requirement status still imply a broader viewer-first mission or incomplete earlier phases. [VERIFIED: README.md][VERIFIED: .planning/ROADMAP.md][VERIFIED: .planning/STATE.md][VERIFIED: .planning/REQUIREMENTS.md]

## Code Examples

Verified patterns from repo sources:

### Packed Surface Contract Check
```js
// Source: test/package_tarball_contract.test.mjs
test("root package publishes only the canonical packaged runtime surface", () => {
  const manifest = getDryRunPackManifest();
  const packedPaths = manifest.files.map((entry) => entry.path).sort();

  assert.deepEqual(packedPaths, [
    "LICENSE",
    "README.md",
    "dist/occt-js.d.ts",
    "dist/occt-js.js",
    "dist/occt-js.wasm",
    "package.json",
  ]);
});
```
This is the right release-governance pattern because it proves the publish surface without requiring a real publish. [VERIFIED: test/package_tarball_contract.test.mjs][VERIFIED: shell command]

### Root Runtime Gate Chaining
```json
// Source: package.json
{
  "scripts": {
    "test:wasm:preflight": "node --test test/wasm_build_prereqs.test.mjs test/load_occt_factory.test.mjs test/dist_contract_consumers.test.mjs",
    "test": "npm run test:wasm:preflight && node test/test_multi_format_exports.mjs && node test/test_iges_degenerated_edges.mjs && node test/test_step_iges_root_mode.mjs && node test/test_brep_root_mode.mjs && node test/test_optimal_orientation_api.mjs && node test/test_optimal_orientation_reference.mjs && node test/test_mvp_acceptance.mjs"
  }
}
```
Phase 4 should preserve this chaining style and extend it only where the current release gate is incomplete. [VERIFIED: package.json]

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Root release skill treats `npm test`, `demo` build, and Playwright as a blanket release gate. [VERIFIED: .codex/skills/releasing-occt-js/SKILL.md] | The repo’s authoritative product boundary is the root Wasm carrier and `occt-core`, while Babylon/demo/Tauri are secondary and conditional. [VERIFIED: README.md][VERIFIED: AGENTS.md][VERIFIED: .planning/PROJECT.md][VERIFIED: .planning/ROADMAP.md][VERIFIED: .planning/REQUIREMENTS.md] | This runtime-first boundary was codified across Phases 1-3 on `2026-04-14`. [VERIFIED: .planning/ROADMAP.md][VERIFIED: .planning/STATE.md][VERIFIED: .planning/phases/03-downstream-consumption-contract/03-03-SUMMARY.md] | Phase 4 should align release instructions and planning metadata to the already-decided boundary instead of redefining scope. [VERIFIED: .planning/ROADMAP.md][VERIFIED: .planning/REQUIREMENTS.md] |
| Root scripts expose only the preflight suite and the full root runtime suite. [VERIFIED: package.json] | The repo also has separate, passing build-contract and tarball-contract tests plus a passing `occt-core` package suite. [VERIFIED: test/wasm_build_contract.test.mjs][VERIFIED: test/package_tarball_contract.test.mjs][VERIFIED: packages/occt-core/package.json][VERIFIED: shell command] | `test/wasm_build_contract.test.mjs` arrived in Phase 01 and `test/package_tarball_contract.test.mjs` arrived in Phase 03 on `2026-04-14`. [VERIFIED: .planning/phases/01-wasm-build-dist-baseline/01-01-SUMMARY.md][VERIFIED: .planning/phases/03-downstream-consumption-contract/03-01-SUMMARY.md] | Phase 4 can unify existing proof surfaces instead of inventing new release domains. [VERIFIED: shell command][VERIFIED: package.json] |

**Deprecated/outdated:**
- Treating demo or Tauri success as unconditional prerequisites for root npm publishing is outdated in this repo. [VERIFIED: AGENTS.md][VERIFIED: .planning/REQUIREMENTS.md][VERIFIED: .codex/skills/releasing-occt-js/SKILL.md]
- Treating Babylon-facing wording as the primary framing in authoritative governance text is outdated for `AGENTS.md` and `.planning/STATE.md`. [VERIFIED: AGENTS.md][VERIFIED: .planning/STATE.md][VERIFIED: .planning/PROJECT.md]

## Assumptions Log

All material claims in this research were verified from the current codebase, current shell commands, npm registry results, or the explicit user prompt in this session. [VERIFIED: codebase file][VERIFIED: shell command][VERIFIED: npm registry][VERIFIED: user prompt]

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| — | None. [VERIFIED: codebase file][VERIFIED: shell command] | — | — |

## Open Questions

1. **Should Phase 4 add a new root script such as `test:release:root`, or only document a manual command matrix?**
   - What we know: the current script surface omits `test/wasm_build_contract.test.mjs`, `test/package_tarball_contract.test.mjs`, and `npm --prefix packages/occt-core test`, even though all three pass. [VERIFIED: package.json][VERIFIED: shell command]
   - What's unclear: whether maintainers want zero new script names in `package.json`. [VERIFIED: package.json]
   - Recommendation: prefer one new root script so README, AGENTS, the release skill, and future planners can all point to the same command string. [VERIFIED: package.json][VERIFIED: README.md][VERIFIED: AGENTS.md][VERIFIED: .codex/skills/releasing-occt-js/SKILL.md]

2. **Should the production demo CDN bump in `demo/src/hooks/useOcct.js` remain part of every root release?**
   - What we know: the demo uses a pinned unpkg version string in production, and the release skill currently treats updating that string as mandatory release scope. [VERIFIED: demo/src/hooks/useOcct.js][VERIFIED: .codex/skills/releasing-occt-js/SKILL.md]
   - What's unclear: whether every root package release is also expected to ship a synchronized demo production update. [VERIFIED: .codex/skills/releasing-occt-js/SKILL.md]
   - Recommendation: make this an explicit Phase 4 decision and, if kept, treat it as conditional secondary-surface work with its own verification rather than part of the unconditional root gate. [VERIFIED: AGENTS.md][VERIFIED: .planning/REQUIREMENTS.md]

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Node.js | Root `node --test` suites and runtime scripts. [VERIFIED: package.json][VERIFIED: packages/occt-core/package.json] | ✓ [VERIFIED: shell command] | `v24.14.1`. [VERIFIED: shell command] | — |
| npm | Build, pack dry-run, publish, and public script entrypoints. [VERIFIED: package.json][VERIFIED: test/package_tarball_contract.test.mjs][VERIFIED: .codex/skills/releasing-occt-js/SKILL.md] | ✓ [VERIFIED: shell command] | `11.11.0`. [VERIFIED: shell command] | — |
| Git | Worktree inspection, submodule setup, and release push workflow. [VERIFIED: AGENTS.md][VERIFIED: .codex/skills/releasing-occt-js/SKILL.md] | ✓ [VERIFIED: shell command] | `2.53.0.windows.2`. [VERIFIED: shell command] | — |
| Playwright CLI | Optional viewer/demo regression verification only. [VERIFIED: package.json][VERIFIED: playwright.config.mjs][VERIFIED: AGENTS.md] | ✓ [VERIFIED: shell command] | Local `1.58.2`; current registry `1.59.1`. [VERIFIED: shell command][VERIFIED: npm registry] | Skip when the phase only changes root/runtime governance. [VERIFIED: AGENTS.md][VERIFIED: .planning/REQUIREMENTS.md] |
| Cargo | Optional Tauri flows only. [VERIFIED: demo/package.json][VERIFIED: AGENTS.md] | ✓ [VERIFIED: shell command] | `1.94.1`. [VERIFIED: shell command] | Not required for root release work. [VERIFIED: AGENTS.md] |

**Missing dependencies with no fallback:**
- None for planning or for the runtime-first release matrix recommended here. [VERIFIED: shell command]

**Missing dependencies with fallback:**
- Demo/browser/Tauri verification can remain outside the unconditional root release gate and run only when those secondary surfaces are touched. [VERIFIED: AGENTS.md][VERIFIED: .planning/REQUIREMENTS.md]

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Node built-in test runner plus repo `node` integration scripts; optional Playwright for secondary demo coverage. [VERIFIED: package.json][VERIFIED: packages/occt-core/package.json][VERIFIED: playwright.config.mjs] |
| Config file | None for the Node runner; optional demo browser config at `playwright.config.mjs`. [VERIFIED: package.json][VERIFIED: playwright.config.mjs] |
| Quick run command | `node --test test/wasm_build_contract.test.mjs test/package_tarball_contract.test.mjs && npm run test:wasm:preflight && npm --prefix packages/occt-core test`. [VERIFIED: package.json][VERIFIED: packages/occt-core/package.json][VERIFIED: shell command] |
| Full suite command | `npm run build:wasm:win && node --test test/wasm_build_contract.test.mjs test/package_tarball_contract.test.mjs && npm --prefix packages/occt-core test && npm test`. [VERIFIED: package.json][VERIFIED: packages/occt-core/package.json][VERIFIED: test/wasm_build_contract.test.mjs][VERIFIED: test/package_tarball_contract.test.mjs] |

### Phase Requirements → Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| CONS-03 | Root release/governance docs and skills keep Babylon/demo layers optional instead of mandatory. [VERIFIED: .planning/REQUIREMENTS.md] | static | `node --test test/release_governance_contract.test.mjs` | ❌ Wave 0 |
| DIST-01 | One authoritative root release command surface covers build contract, tarball contract, `occt-core`, and full root runtime verification. [VERIFIED: .planning/REQUIREMENTS.md] | cli + static | `npm pkg get scripts.test scripts.test:wasm:preflight scripts.test:release:root && node --test test/release_governance_contract.test.mjs` | ❌ Wave 0 |
| DIST-02 | Public docs and planning artifacts consistently frame the root Wasm carrier as authoritative and keep completed requirement status current. [VERIFIED: .planning/REQUIREMENTS.md] | static | `node --test test/release_governance_contract.test.mjs` | ❌ Wave 0 |

### Sampling Rate
- **Per task commit:** `node --test test/release_governance_contract.test.mjs` once the new governance test exists. [VERIFIED: package.json]
- **Per wave merge:** `node --test test/wasm_build_contract.test.mjs test/package_tarball_contract.test.mjs && npm run test:wasm:preflight && npm --prefix packages/occt-core test`. [VERIFIED: package.json][VERIFIED: packages/occt-core/package.json][VERIFIED: shell command]
- **Phase gate:** `npm run build:wasm:win && node --test test/wasm_build_contract.test.mjs test/package_tarball_contract.test.mjs && npm --prefix packages/occt-core test && npm test` must be green before `/gsd-verify-work`. [VERIFIED: package.json][VERIFIED: packages/occt-core/package.json]

### Wave 0 Gaps
- [ ] `test/release_governance_contract.test.mjs` — cover `CONS-03`, `DIST-01`, and `DIST-02` across `AGENTS.md`, `.codex/skills/releasing-occt-js/SKILL.md`, `.planning/PROJECT.md`, `.planning/REQUIREMENTS.md`, `.planning/ROADMAP.md`, and `.planning/STATE.md`. [VERIFIED: AGENTS.md][VERIFIED: .codex/skills/releasing-occt-js/SKILL.md][VERIFIED: .planning/PROJECT.md][VERIFIED: .planning/REQUIREMENTS.md][VERIFIED: .planning/ROADMAP.md][VERIFIED: .planning/STATE.md]
- [ ] Root script alias such as `test:release:root` or `test:governance` — currently absent from `package.json`, which leaves the release skill and future planners without one canonical root release command. [VERIFIED: package.json]

## Security Domain

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | no. [VERIFIED: user prompt][VERIFIED: .planning/ROADMAP.md] | N/A — Phase 4 is governance and release flow, not runtime user authentication. [VERIFIED: user prompt] |
| V3 Session Management | no. [VERIFIED: user prompt][VERIFIED: .planning/ROADMAP.md] | N/A — no session layer is in scope. [VERIFIED: user prompt] |
| V4 Access Control | no. [VERIFIED: user prompt][VERIFIED: .planning/ROADMAP.md] | N/A — no access-control surface is being added. [VERIFIED: user prompt] |
| V5 Input Validation | yes. [VERIFIED: package.json][VERIFIED: test/package_tarball_contract.test.mjs] | Keep release/package governance checks in deterministic static tests instead of free-form manual interpretation. [VERIFIED: test/package_tarball_contract.test.mjs][VERIFIED: test/dist_contract_consumers.test.mjs] |
| V6 Cryptography | yes. [VERIFIED: .codex/skills/releasing-occt-js/SKILL.md] | Use npm’s token handling with a temporary `.npmrc`; never commit or persist publish tokens in-repo. [VERIFIED: .codex/skills/releasing-occt-js/SKILL.md] |

### Known Threat Patterns for Release Governance in This Repo

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| npm token committed to the repository or skill output. [VERIFIED: .codex/skills/releasing-occt-js/SKILL.md] | Information Disclosure | Use a temporary `.npmrc`, publish, then remove it immediately. [VERIFIED: .codex/skills/releasing-occt-js/SKILL.md] |
| Publishing after only partial verification. [VERIFIED: .codex/skills/releasing-occt-js/SKILL.md][VERIFIED: package.json] | Tampering / Repudiation | Require the full runtime-first root release matrix before publish, then confirm the published version from npm. [VERIFIED: package.json][VERIFIED: shell command][VERIFIED: npm registry] |
| Secondary-surface gate creep hiding the real release boundary. [VERIFIED: AGENTS.md][VERIFIED: .planning/REQUIREMENTS.md][VERIFIED: .codex/skills/releasing-occt-js/SKILL.md] | Denial of Service | Keep demo/browser/Tauri verification conditional and document it separately from the unconditional root release gate. [VERIFIED: AGENTS.md][VERIFIED: .planning/REQUIREMENTS.md] |

## Sources

### Primary (HIGH confidence)
- `package.json` - root published surface and current script inventory. [VERIFIED: package.json]
- `test/wasm_build_contract.test.mjs` - root build-script contract assertions. [VERIFIED: test/wasm_build_contract.test.mjs]
- `test/package_tarball_contract.test.mjs` - root tarball/publish-surface assertions. [VERIFIED: test/package_tarball_contract.test.mjs]
- `test/dist_contract_consumers.test.mjs` - current downstream-facing dist/docs contract checks. [VERIFIED: test/dist_contract_consumers.test.mjs]
- `packages/occt-core/package.json` and `packages/occt-core/test/core.test.mjs` - canonical downstream adapter test surface. [VERIFIED: packages/occt-core/package.json][VERIFIED: packages/occt-core/test/core.test.mjs]
- `README.md`, `packages/occt-core/README.md`, `AGENTS.md`, `.planning/PROJECT.md`, `.planning/REQUIREMENTS.md`, `.planning/ROADMAP.md`, `.planning/STATE.md` - current runtime-first docs and planning state. [VERIFIED: README.md][VERIFIED: packages/occt-core/README.md][VERIFIED: AGENTS.md][VERIFIED: .planning/PROJECT.md][VERIFIED: .planning/REQUIREMENTS.md][VERIFIED: .planning/ROADMAP.md][VERIFIED: .planning/STATE.md]
- `.codex/skills/releasing-occt-js/SKILL.md` - current release workflow and its drift points. [VERIFIED: .codex/skills/releasing-occt-js/SKILL.md]
- Shell commands run during this research: `node --test test/wasm_build_contract.test.mjs`, `node --test test/package_tarball_contract.test.mjs`, `npm --prefix packages/occt-core test`, `npm test`, `node --version`, `npm --version`, `git --version`, `npx playwright --version`, `cargo --version`. [VERIFIED: shell command]
- npm registry queries: `npm view @tx-code/occt-js version time --json`, `npm view @tx-code/occt-core version`, `npm view @tx-code/occt-babylon-loader version`, `npm view @playwright/test version time --json`. [VERIFIED: npm registry]

### Secondary (MEDIUM confidence)
- None. [VERIFIED: research scope]

### Tertiary (LOW confidence)
- None. [VERIFIED: research scope]

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - almost entirely repo-local and verified from current scripts, tests, and installed tooling. [VERIFIED: package.json][VERIFIED: packages/occt-core/package.json][VERIFIED: shell command]
- Architecture: HIGH - recommendations are extensions of existing passing contract-test and script patterns already present in the repo. [VERIFIED: package.json][VERIFIED: test/wasm_build_contract.test.mjs][VERIFIED: test/package_tarball_contract.test.mjs][VERIFIED: shell command]
- Pitfalls: HIGH - each pitfall is directly observable in the current repo state or current release skill. [VERIFIED: .codex/skills/releasing-occt-js/SKILL.md][VERIFIED: .planning/REQUIREMENTS.md][VERIFIED: .planning/STATE.md][VERIFIED: package.json]

**Research date:** 2026-04-14. [VERIFIED: shell command]
**Valid until:** 2026-04-28 for planning purposes, or sooner if `package.json`, root tests, or the release skill change. [ASSUMED]
