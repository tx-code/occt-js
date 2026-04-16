---
phase: 16-exact-relation-classifier-contract
plan: "02"
subsystem: runtime-core
tags: [occt-core, relations, wrappers, occurrence-space, package-first]
requires:
  - phase: 16-exact-relation-classifier-contract
    provides: additive root `ClassifyExactRelation(...)` contract and relation DTO family
provides:
  - `occt-core` package-first relation wrapper parity
  - Occurrence-safe relation classification for repeated geometry
  - Unit and live package coverage for none/failure preservation
affects: [phase-16, runtime, occt-core]
tech-stack:
  added: []
  patterns: [thin-relation-wrapper, explicit-none-preservation, repeated-geometry-live-proof]
key-files:
  created:
    - .planning/phases/16-exact-relation-classifier-contract/16-02-SUMMARY.md
  modified:
    - packages/occt-core/src/occt-core.js
    - packages/occt-core/test/core.test.mjs
    - packages/occt-core/test/live-root-integration.test.mjs
key-decisions:
  - "`occt-core` keeps relation wrappers transform-transparent and package-first, without inventing viewer-owned ids or semantics."
  - "Successful `kind: \"none\"` results attach `refA` / `refB` just like other pairwise success payloads."
  - "Live repeated-geometry tests prove relation classification survives occurrence transforms through the built root carrier."
patterns-established:
  - "Relation wrappers mirror the earlier exact-measurement and placement adapter seam: wasm owns math, `occt-core` owns ergonomic ref validation."
  - "Package tests lock success, none, and failure parity without hiding root relation semantics."
requirements-completed: [ADAPT-08]
duration: n/a
completed: 2026-04-16
---

# Phase 16 Plan 02 Summary

**`@tx-code/occt-core` now exposes package-first exact relation classification with occurrence-safe wrapper behavior, explicit `none`, and live repeated-geometry proof against the built root carrier.**

## Performance

- **Duration:** n/a
- **Tasks:** 2
- **Files modified:** 3

## Accomplishments

- Extended `packages/occt-core/test/core.test.mjs` with wrapper-shape tests for relation success, `kind: "none"`, and explicit failure preservation.
- Extended `packages/occt-core/test/live-root-integration.test.mjs` with a repeated-geometry relation test that proves occurrence transforms remain valid through the built root carrier.
- Added `classifyExactRelation(refA, refB)` to `packages/occt-core/src/occt-core.js` using the existing pairwise ref validator and same-model transform forwarding seam.
- Kept wrapper semantics thin: successful relation results attach `refA` / `refB`, while failures pass through unchanged.

## Task Commits

The wrapper parity work landed as one atomic package commit after the package tests were driven RED locally and brought back to GREEN:

1. **Task 1 + Task 2: Add failing package tests and implement relation wrapper parity** - `8c1ad7e` (`feat`)

## Files Created/Modified

- `packages/occt-core/test/core.test.mjs` - Added unit coverage for wrapper shape, `none`, and explicit failure parity.
- `packages/occt-core/test/live-root-integration.test.mjs` - Added live repeated-geometry relation coverage against the built root carrier.
- `packages/occt-core/src/occt-core.js` - Added `classifyExactRelation(refA, refB)` alongside the existing pairwise exact wrappers.

## Decisions Made

- Preserved root occurrence-space relation geometry as-is instead of re-transforming or repackaging it in the wrapper.
- Attached `refA` and `refB` on all successful relation results, including `kind: "none"`, to match the earlier pairwise measurement and placement wrapper contract.
- Used repeated planar geometry from `assembly.step` as the live proof path because it deterministically exercises occurrence transforms without adding a new fixture.

## Deviations from Plan

- The planned unit and live RED cases were committed together with the wrapper implementation once the package seam stabilized. No contract-level deviations were introduced.

## Issues Encountered

- The RED package failures were limited to the missing `core.classifyExactRelation` wrapper. No root-contract regressions appeared once the wrapper was added.

## User Setup Required

None.

## Next Phase Readiness

- Phase 17 can now document the exact placement/relation SDK package-first because both the root carrier and `occt-core` parity are shipped.
- Governance work can focus on docs, typings, tarball expectations, and release-gate coverage rather than reopening runtime semantics.

---
*Phase: 16-exact-relation-classifier-contract*
*Completed: 2026-04-16*
