---
phase: 15-placement-contract-hardening
plan: "02"
subsystem: runtime-core
tags: [wasm, occt-core, placement, radius, diameter, occurrence-space]
requires:
  - phase: 15-placement-contract-hardening
    provides: additive root placement DTOs and pairwise placement bindings
provides:
  - Root circular placement helpers for radius and diameter
  - `occt-core` package-first placement wrappers for pairwise and circular flows
  - Occurrence-space placement parity proven by unit and live integration tests
affects: [phase-15, runtime, occt-core]
tech-stack:
  added: []
  patterns: [circular-placement-support, occurrence-space-placement-adapter]
key-files:
  created:
    - .planning/phases/15-placement-contract-hardening/15-02-SUMMARY.md
  modified:
    - dist/occt-js.d.ts
    - packages/occt-core/src/occt-core.js
    - packages/occt-core/test/core.test.mjs
    - packages/occt-core/test/live-root-integration.test.mjs
    - src/exact-query.cpp
    - src/exact-query.hpp
    - src/importer.hpp
    - src/js-interface.cpp
    - test/exact_placement_contract.test.mjs
key-decisions:
  - "Circular placement remains geometry-support only: center, anchors, axisDirection, and frame, with no viewer presentation policy."
  - "`occt-core` transforms placement frames, anchors, and circular axes into occurrence space while keeping root semantics visible."
  - "Diameter placement stays presentation-oriented but still derives strictly from exact circular geometry."
patterns-established:
  - "Placement wrappers mirror the earlier exact-measurement adapter boundary: wasm owns math, `occt-core` owns occurrence normalization."
  - "Live placement integration tests prove reused geometry can be queried once and safely presented in multiple occurrences."
requirements-completed: [PLCT-03, ADAPT-07]
duration: n/a
completed: 2026-04-16
---

# Phase 15 Plan 02 Summary

**The exact placement surface now covers circular geometry and package-first wrappers, so downstream JS can consume pairwise and circular placement data directly through `@tx-code/occt-core` in occurrence space.**

## Performance

- **Duration:** n/a
- **Tasks:** 2
- **Files modified:** 9

## Accomplishments

- Extended `test/exact_placement_contract.test.mjs` to lock exact radius and diameter placement success plus explicit unsupported-geometry failures for circular placement.
- Extended `packages/occt-core/test/core.test.mjs` and `packages/occt-core/test/live-root-integration.test.mjs` to lock package-first placement wrapper shape and occurrence-space normalization.
- Implemented `SuggestExactRadiusPlacement` and `SuggestExactDiameterPlacement` in the root carrier using the retained exact circular-geometry seam already established by the exact radius query path.
- Added `suggestExactDistancePlacement`, `suggestExactAnglePlacement`, `suggestExactThicknessPlacement`, `suggestExactRadiusPlacement`, and `suggestExactDiameterPlacement` to `packages/occt-core/src/occt-core.js`.
- Normalized placement frames, anchors, and `axisDirection` into occurrence space for circular placement results while preserving root result semantics for downstream apps.

## Task Commits

Each task was committed atomically:

1. **Task 1: Add failing contract tests for circular placement and package wrapper parity** - `8ef34b3` (`test`)
2. **Task 2: Implement circular placement helpers and package-first placement wrappers** - `618ce2d` (`feat`)

## Files Created/Modified

- `test/exact_placement_contract.test.mjs` - Added circular placement coverage on top of the root pairwise placement contract.
- `packages/occt-core/test/core.test.mjs` - Added wrapper-shape tests for all pairwise and circular placement helpers.
- `packages/occt-core/test/live-root-integration.test.mjs` - Added live occurrence-space placement checks against the built root carrier.
- `packages/occt-core/src/occt-core.js` - Added package-first placement wrappers and occurrence-space normalization helpers.
- `src/exact-query.hpp` / `src/exact-query.cpp` - Added circular placement declarations and implementations.
- `src/js-interface.cpp` / `dist/occt-js.d.ts` - Added the circular placement public binding and typing surface.

## Decisions Made

- Reused `MeasureExactRadius` as the analytic seam for circular placement rather than duplicating circle/cylinder identity logic.
- Kept pairwise wrappers transform-transparent and attached `refA` / `refB` on success instead of inventing viewer-owned placement ids.
- Kept circular placement additive and geometry-support only by returning center and anchor roles, `axisDirection`, and full frame data without label-placement policy.

## Deviations from Plan

- The initial RED test commit covered both root circular cases and package parity in one pass because the placement DTO family is shared across the whole phase, but the shipped surface still matches the Phase 15-02 scope.

## Issues Encountered

- None beyond the expected TDD RED phase where the new circular placement helpers and package wrappers did not yet exist.

## User Setup Required

None.

## Next Phase Readiness

- Phase 16 can build directly on the shipped frame, anchor, and occurrence-space patterns to add relation classifiers without reopening the placement surface.
- The package boundary for overlay-support geometry is now established; the remaining milestone work is relation semantics and SDK/governance hardening.

---
*Phase: 15-placement-contract-hardening*
*Completed: 2026-04-16*
