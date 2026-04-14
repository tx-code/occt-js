---
phase: 03-downstream-consumption-contract
plan: "03"
subsystem: docs
tags: [tests, docs, packages, downstream]
requires:
  - phase: 03-downstream-consumption-contract
    provides: explicit packed root-package contract and verified `occt-core` adapter behavior
provides:
  - Repo-level docs guardrails for the packaged downstream story
  - Root and package README guidance centered on `@tx-code/occt-js` and `@tx-code/occt-core`
  - Clear Wasm resolution documentation for `locateFile` and `wasmBinary`
affects: [phase-03, downstream-consumers, docs]
tech-stack:
  added: []
  patterns: [docs-contract-guardrail, package-first-readme]
key-files:
  created:
    - .planning/phases/03-downstream-consumption-contract/03-03-SUMMARY.md
  modified:
    - README.md
    - packages/occt-core/README.md
    - test/dist_contract_consumers.test.mjs
key-decisions:
  - "The README now treats `@tx-code/occt-js` and `@tx-code/occt-core` as the canonical downstream path, with Babylon/demo layers explicitly optional."
  - "Repo-level docs tests lock the scoped package names and supported Wasm resolution hooks so future doc drift fails in CI."
patterns-established:
  - "Downstream docs must mention `@tx-code/occt-js`, `@tx-code/occt-core`, and at least one verified Wasm resolution path (`locateFile` or `wasmBinary`)."
requirements-completed: [CONS-01, CONS-02]
duration: 4min
completed: 2026-04-14
---

# Phase 03: 03-03 Summary

**Repository docs now describe one clear downstream package contract, and that story is guarded by automated tests.**

## Performance

- **Duration:** 4 min
- **Started:** 2026-04-14T20:28:55+08:00
- **Completed:** 2026-04-14T20:32:55+08:00
- **Tasks:** 2
- **Files modified:** 4

## Accomplishments

- Expanded `test/dist_contract_consumers.test.mjs` so repo-level guardrails now fail when the READMEs stop naming `@tx-code/occt-js`, `@tx-code/occt-core`, or the supported Wasm resolution hooks.
- Reworked the root `README.md` around a package-first downstream story: the root package is the Wasm carrier, `occt-core` is the engine-agnostic adapter, and Babylon/demo surfaces are optional secondaries.
- Added explicit packaged-consumption examples for `locateFile`, `wasmBinary`, `dist/occt-js.wasm`, and `createOcctCore(...)`.
- Updated `packages/occt-core/README.md` to show `createOcctCore(...)` on top of `@tx-code/occt-js` instead of a repo-local global/demo-only setup.

## Task Commits

Each task was committed atomically:

1. **Task 1: Add docs contract checks for the packaged downstream story** - shipped in this plan's completion commit
2. **Task 2: Rewrite root and `occt-core` docs around the verified downstream package contract** - shipped in this plan's completion commit

## Files Created/Modified

- `test/dist_contract_consumers.test.mjs` - Added README contract assertions for scoped package names and Wasm-resolution guidance.
- `README.md` - Reframed the root package as the canonical Wasm carrier and documented package-first downstream usage.
- `packages/occt-core/README.md` - Added package-first adapter installation and usage guidance on top of `@tx-code/occt-js`.
- `.planning/phases/03-downstream-consumption-contract/03-03-SUMMARY.md` - Recorded the plan outcome and verification evidence.

## Decisions Made

- Chose README guidance that mirrors the verified package contract instead of the broader repository-development workflow.
- Kept Babylon references in documentation only as optional secondary surfaces, not as prerequisites for downstream use.

## Deviations from Plan

- None.

## Issues Encountered

- The new docs guardrail initially failed because both READMEs still reflected older local-path and global-factory examples. Updating the docs to package-first examples resolved the drift cleanly.

## User Setup Required

None.

## Next Phase Readiness

- Phase 03 now has matching package behavior, tests, and documentation for downstream consumption.
- The next step is full Phase 03 verification and roadmap/state closeout.

---
*Phase: 03-downstream-consumption-contract*
*Completed: 2026-04-14*
