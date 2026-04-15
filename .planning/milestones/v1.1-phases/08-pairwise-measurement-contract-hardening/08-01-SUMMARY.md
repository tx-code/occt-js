---
phase: 08-pairwise-measurement-contract-hardening
plan: "01"
subsystem: runtime-core
tags: [wasm, occt-core, pairwise-measurement, distance, angle]
requires:
  - phase: 07-primitive-exact-geometry-queries
    provides: exact classification plus single-entity primitives on retained exact refs
provides:
  - Root exact pairwise distance and angle bindings with transform-aware DTOs
  - `occt-core` pairwise wrappers that forward occurrence transforms unchanged
  - Root and live package contract coverage for repeated-geometry pairwise queries
affects: [phase-08, occt-core]
tech-stack:
  added: []
  patterns: [transform-aware-pairwise-query, root-to-core-pairwise-adapter]
key-files:
  created:
    - .planning/phases/08-pairwise-measurement-contract-hardening/08-01-SUMMARY.md
    - test/exact_pairwise_measurement_contract.test.mjs
  modified:
    - dist/occt-js.d.ts
    - packages/occt-core/src/occt-core.js
    - packages/occt-core/test/core.test.mjs
    - packages/occt-core/test/live-root-integration.test.mjs
    - src/importer.hpp
    - src/exact-query.hpp
    - src/exact-query.cpp
    - src/js-interface.cpp
key-decisions:
  - "Pairwise root queries stay same-model and accept two occurrence transforms instead of viewer-only ids."
  - "Exact distance returns transformed attach points plus a working-plane origin/normal derived from the separation vector."
  - "Exact angle is limited to line/line and plane/plane pairs; mixed-kind or non-analytic pairs fail explicitly."
patterns-established:
  - "Root wasm owns pairwise exact math while `occt-core` only validates refs, forwards transforms, and attaches `refA`/`refB`."
  - "Repeated-geometry pairwise behavior is locked in live-root integration tests against the built root carrier."
requirements-completed: [MEAS-01, MEAS-02]
duration: 84min
completed: 2026-04-15
---

# Phase 08 Plan 01 Summary

**The runtime now exposes exact pairwise distance and angle on retained refs, and `occt-core` can forward occurrence transforms so repeated geometry measures correctly in instance space.**

## Performance

- **Duration:** 84 min
- **Tasks:** 2
- **Files modified:** 9

## Accomplishments

- Added `test/exact_pairwise_measurement_contract.test.mjs` to lock the root contract for exact pairwise distance, exact pairwise angle, and explicit parallel/unsupported failures.
- Extended `packages/occt-core/test/core.test.mjs` and `packages/occt-core/test/live-root-integration.test.mjs` to lock wrapper forwarding and repeated-geometry occurrence behavior.
- Added pairwise exact DTOs and method signatures to `src/importer.hpp`, `src/exact-query.hpp`, `src/js-interface.cpp`, and `dist/occt-js.d.ts`.
- Implemented `MeasureExactDistance` for retained face/edge/vertex refs through OCCT exact shape-shape distance with attach points and working-plane data.
- Implemented `MeasureExactAngle` for line-line and plane-plane pairs with explicit `parallel-geometry`, `coincident-geometry`, and `unsupported-geometry` failures.
- Added `measureExactDistance(refA, refB)` and `measureExactAngle(refA, refB)` to `occt-core`, keeping occurrence adaptation in the package layer instead of leaking viewer ids into wasm.

## Task Commits

Each task was committed atomically:

1. **Task 1: Add failing contract tests for exact pairwise distance and angle queries** - `9d3e46c` (`test`)
2. **Task 2: Implement transform-aware exact distance and angle root bindings plus occt-core wrappers** - `08dbec7` (`feat`)

## Files Created/Modified

- `test/exact_pairwise_measurement_contract.test.mjs` - Added the new root pairwise distance/angle contract coverage.
- `packages/occt-core/test/core.test.mjs` - Added wrapper-shape tests for pairwise distance and angle.
- `packages/occt-core/test/live-root-integration.test.mjs` - Added repeated-geometry pairwise distance coverage.
- `src/importer.hpp` - Added pairwise exact DTO structs for distance and angle.
- `src/exact-query.hpp` / `src/exact-query.cpp` - Added transform-aware pairwise query declarations, exact lookup helpers, and OCCT pairwise math.
- `src/js-interface.cpp` - Added matrix parsing, DTO serialization, and Embind bindings for pairwise distance and angle.
- `dist/occt-js.d.ts` - Added public pairwise method signatures and result typings.
- `packages/occt-core/src/occt-core.js` - Added occurrence-scoped pairwise wrapper methods.

## Decisions Made

- Kept the root pairwise signature same-model-only in v1.1 by carrying a single `exactModelId` plus two exact refs and two transforms.
- Used exact trimmed-shape distance for attach points, while keeping angle semantics constrained to analytic line/plane carriers.
- Treated zero-separation distance results as `coincident-geometry` instead of inventing a working plane with a zero normal.

## Deviations from Plan

- The root parallel-angle failure now uses a pair of separated parallel line edges from `simple_part.step` instead of planar faces because the fixture also contains disjoint coplanar face cases that would have produced the stricter `coincident-geometry` failure family.

## Issues Encountered

- The first parallel-face test heuristic matched coplanar trimmed faces, which surfaced as `coincident-geometry`; the fixture selection was tightened using runtime evidence from the new pairwise query path.

## User Setup Required

None.

## Next Phase Readiness

- `08-02` can build directly on the new pairwise DTO family and helper layer to add planar thickness plus shared failure hardening.
- The remaining pairwise work is now contract extension and failure-family hardening, not fresh lifecycle or occurrence plumbing.

---
*Phase: 08-pairwise-measurement-contract-hardening*
*Completed: 2026-04-15*
