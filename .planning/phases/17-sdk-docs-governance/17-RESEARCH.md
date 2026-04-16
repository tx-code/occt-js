# Phase 17: SDK Docs & Governance - Research

**Researched:** 2026-04-16  
**Domain:** Package-first SDK docs, release-gate coverage, tarball checks, and milestone-governance closeout for the finalized placement/relation surface.  
**Confidence:** HIGH

<user_constraints>
## User Constraints

Use the active milestone and shipped Phase 15/16 outputs:

- Keep `occt-js` centered on the runtime-first Wasm carrier and `@tx-code/occt-core`. [VERIFIED: .planning/PROJECT.md] [VERIFIED: AGENTS.md]
- Keep docs package-first and root-runtime authoritative; do not turn this phase into viewer or demo work. [VERIFIED: .planning/ROADMAP.md] [VERIFIED: AGENTS.md]
- Preserve the shipped placement and relation surface instead of reopening geometry behavior. [VERIFIED: .planning/phases/15-placement-contract-hardening/15-02-SUMMARY.md] [VERIFIED: .planning/phases/16-exact-relation-classifier-contract/16-02-SUMMARY.md]
- Maintain `npm run test:release:root` as the authoritative release gate while extending it to lock the measurement SDK contract. [VERIFIED: AGENTS.md] [VERIFIED: package.json]
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| DOCS-01 | Package-first SDK docs show placement and relation workflows through `@tx-code/occt-core`, with root Wasm documented as the lower-level reference surface. | Root/package READMEs currently under-document placement and relation helpers; a dedicated SDK doc can hold the package-first walkthrough without bloating the root README. |
| GOV-01 | Root typings, tarball checks, and release verification lock the exact placement and relation SDK contract on the authoritative runtime-first release gate. | Current root test/release scripts and tarball checks still pin only the older pairwise measurement surface and need to include placement/relation contract files. |
</phase_requirements>

## Project Constraints

- Root runtime artifacts and root release verification remain authoritative. [VERIFIED: AGENTS.md]
- Secondary surfaces stay conditional and must not become unconditional release gates. [VERIFIED: AGENTS.md] [VERIFIED: test/release_governance_contract.test.mjs]
- Phase 17 should harden docs and release governance, not widen the SDK scope. [VERIFIED: .planning/ROADMAP.md]

## Summary

Phase 17 is a pure docs/governance closeout. The runtime and package behavior for placement and relations already shipped in Phases 15 and 16; the remaining gap is that the authoritative docs and release gate still describe only the older pairwise measurement baseline. [VERIFIED: .planning/phases/15-placement-contract-hardening/15-02-SUMMARY.md] [VERIFIED: .planning/phases/16-exact-relation-classifier-contract/16-02-SUMMARY.md]

The root README currently mentions retained-model and pairwise measurement entrypoints, but it does not mention the Phase 15 placement helpers or the Phase 16 relation classifier. [VERIFIED: README.md]

`packages/occt-core/README.md` still explains exact pairwise measurement package-first, but it does not yet describe `suggestExact*Placement(...)` or `classifyExactRelation(refA, refB)` as the primary downstream SDK workflow. [VERIFIED: packages/occt-core/README.md]

The release surface also lags. `package.json` still limits `npm test` and `npm run test:release:root` to the older exact pairwise contract file; neither script includes `test/exact_placement_contract.test.mjs` or `test/exact_relation_contract.test.mjs`. [VERIFIED: package.json]

`test/package_tarball_contract.test.mjs` still locks only the import appearance package surface. It does not yet assert that packaged docs and typings expose placement/relation SDK guidance. [VERIFIED: test/package_tarball_contract.test.mjs]

**Primary recommendation:** split Phase 17 into two steps. First, add failing governance checks and update package-first SDK docs, including a dedicated measurement SDK doc. Second, extend package tarball and root release-gate coverage so placement and relation contract files become authoritative release requirements. [ASSUMED]

## Current Code Facts

- `dist/occt-js.d.ts` already exports placement and relation typings, including `SuggestExact*Placement` and `ClassifyExactRelation(...)`. [VERIFIED: dist/occt-js.d.ts]
- `packages/occt-core/src/occt-core.js` already exports package-first placement and relation wrappers. [VERIFIED: packages/occt-core/src/occt-core.js]
- `test/exact_placement_contract.test.mjs` and `test/exact_relation_contract.test.mjs` now lock the shipped root SDK surface. [VERIFIED: test/exact_placement_contract.test.mjs] [VERIFIED: test/exact_relation_contract.test.mjs]
- `package.json` still omits those two contract tests from `npm test` and `npm run test:release:root`. [VERIFIED: package.json]
- `test/release_governance_contract.test.mjs` now tracks milestone state through Phase 16 completion, but it does not yet require Phase 17 docs/governance artifacts. [VERIFIED: test/release_governance_contract.test.mjs]

## Recommended 2-Plan Split

### 17-01 — Finalize package-first SDK docs for placement and relations

- Add failing governance assertions for package-first docs and Phase 17 planning state.
- Update `README.md`, `packages/occt-core/README.md`, and add `docs/sdk/measurement.md`.
- Keep root Wasm documented as lower-level reference, and keep overlay rendering / measurement UX downstream.

### 17-02 — Extend release gate and packaged-contract coverage for the measurement SDK

- Add failing tarball/governance checks for placement/relation docs and typings.
- Update `package.json` so `npm test` and `npm run test:release:root` include placement and relation contract files.
- Re-run `npm run test:release:root` as the final milestone gate.

## Common Pitfalls

### Pitfall 1: documenting SDK entrypoints only at the root layer

That would weaken the package-first boundary and push downstream consumers toward the lower-level Wasm API.

**Avoidance:** make `@tx-code/occt-core` the primary walkthrough surface and keep root Wasm examples explicitly lower-level.

### Pitfall 2: leaving new contract tests outside the authoritative release gate

If placement/relation contract files remain outside `npm test` and `npm run test:release:root`, the docs can drift from the real release boundary.

**Avoidance:** extend both scripts and package/governance tests together.

### Pitfall 3: letting SDK docs imply viewer-owned UX is part of the package surface

That would blur the runtime/package boundary the milestone was designed to protect.

**Avoidance:** explicitly keep overlay rendering, interaction, and feature semantics downstream in all SDK docs.
