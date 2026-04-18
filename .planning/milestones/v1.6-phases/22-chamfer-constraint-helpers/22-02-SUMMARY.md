---
phase: 22-chamfer-constraint-helpers
plan: "02"
subsystem: occt-core-constraint-helpers
tags: [occt-core, midpoint-helper, equal-distance, symmetry-helper, package-only]
requires:
  - phase: 22-chamfer-constraint-helpers
    provides: Phase 22 context, patterns, plan artifacts, and stabilized chamfer helper surface
  - commit: 4166d6f
    provides: package-first `describeExactChamfer(ref)` and supporting retained-model test baseline
provides:
  - Package-only midpoint, equal-distance, and symmetry-style helpers in `@tx-code/occt-core`
  - Mocked contract coverage for the helper-family DTOs and tolerance behavior
  - Live retained-model proof that the helper family composes over the built placement and relation surface
affects: [phase-22, packages/occt-core, tests]
tech-stack:
  added: []
  patterns: [package-only-helper-composition, midpoint-from-distance-placement, midplane-symmetry-over-parallel-pairs]
key-files:
  created:
    - .planning/phases/22-chamfer-constraint-helpers/22-02-SUMMARY.md
  modified:
    - packages/occt-core/src/occt-core.js
    - packages/occt-core/test/core.test.mjs
    - packages/occt-core/test/live-root-integration.test.mjs
key-decisions:
  - "The package-only helper names are `suggestExactMidpointPlacement`, `describeExactEqualDistance`, and `suggestExactSymmetryPlacement`."
  - "Symmetry support stays intentionally narrow in Phase 22: it derives a midplane-style placement from supported parallel pairs instead of trying to recognize generic mirror symmetry."
  - "Equal-distance uses an explicit caller override when provided and otherwise falls back to a small model-unit-relative tolerance."
patterns-established:
  - "Package-owned exact helpers should compose the shipped placement and relation wrappers first before considering new root carrier APIs."
  - "Midpoint and symmetry helpers can stay occurrence-safe by deriving their geometry entirely from occurrence-space placement anchors."
requirements-completed: [FEAT-05]
duration: n/a
completed: 2026-04-18
---

# Phase 22 Plan 02 Summary

**`@tx-code/occt-core` now exposes midpoint, equal-distance, and narrow symmetry-style helper semantics on top of the shipped exact placement and relation foundation, with no new root carrier APIs.**

## Performance

- **Duration:** n/a
- **Tasks:** 1
- **Files modified:** 3

## Accomplishments

- Added package-only helper APIs to `packages/occt-core/src/occt-core.js`:
  - `suggestExactMidpointPlacement(refA, refB)`
  - `describeExactEqualDistance(refA, refB, refC, refD, options?)`
  - `suggestExactSymmetryPlacement(refA, refB)`
- Implemented midpoint as a thin composition over `suggestExactDistancePlacement(refA, refB)`, reusing occurrence-space distance anchors and appending a `center` anchor at the midpoint.
- Implemented equal-distance as a thin composition over two `measureExactDistance(...)` calls, returning stable comparison data (`distanceA`, `distanceB`, `delta`, `tolerance`, and `equal`) instead of viewer-owned policy.
- Implemented symmetry as a narrow midplane-style helper over supported parallel pairs by composing `classifyExactRelation(...)` plus `suggestExactDistancePlacement(...)` and deriving a symmetry-plane frame from the occurrence-space separation axis.
- Extended `packages/occt-core/test/core.test.mjs` with mocked helper-family tests covering midpoint, equal-distance tolerance behavior, and symmetry-style frame construction.
- Extended `packages/occt-core/test/live-root-integration.test.mjs` with a retained-model smoke test proving the helper family composes over the built carrier's placement and relation surface.
- Verified the implementation with:
  - `node --test packages/occt-core/test/core.test.mjs`
  - `node --test packages/occt-core/test/live-root-integration.test.mjs`
  - `npm --prefix packages/occt-core test`
  - `npm run test:release:root`

## Files Created/Modified

- `packages/occt-core/src/occt-core.js` - Added the package-only midpoint, equal-distance, and symmetry-style helper implementations plus supporting vector/frame utilities.
- `packages/occt-core/test/core.test.mjs` - Added mocked helper-family tests for midpoint, equal-distance, and symmetry DTO behavior.
- `packages/occt-core/test/live-root-integration.test.mjs` - Added live retained-model proof that the helper family composes correctly over built placement and relation outputs.

## Decisions Made

- Kept the helper family entirely in `@tx-code/occt-core` because the shipped root placement and relation surfaces already expose the geometry-support DTOs these helpers need.
- Treated midpoint and symmetry as placement-style helpers so they can reuse the established `frame` and `anchors` vocabulary without creating a second presentation geometry language.
- Kept symmetry intentionally narrow as a midplane helper over supported parallel pairs, which is enough to satisfy the Phase 22 helper goal without inventing a generic CAD constraint solver.

## Deviations from Plan

- No substantive deviations. The plan called for package-only helper composition over shipped placement/relation surfaces, and the implementation stayed entirely within that boundary.

## Issues Encountered

- None at blocker level. The main implementation choice was how to build a stable symmetry frame in package space; reusing the distance-placement frame plus a projected in-plane axis kept the helper deterministic without carrier changes.

## User Setup Required

None.

## Next Phase Readiness

- Phase 22 is now fully implemented. Phase 23 can document the final helper-family SDK surface and lock it into governance, typings, and release-boundary checks.
- `FEAT-04` and `FEAT-05` are both satisfied, so the remaining `v1.6` work is docs/governance closeout only.

---
*Phase: 22-chamfer-constraint-helpers*
*Completed: 2026-04-18*
