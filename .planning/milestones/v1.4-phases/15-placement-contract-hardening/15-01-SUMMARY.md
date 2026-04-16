---
phase: 15-placement-contract-hardening
plan: "01"
subsystem: runtime-core
tags: [wasm, placement, pairwise, distance, angle, thickness]
requires:
  - phase: 08-pairwise-measurement-contract-hardening
    provides: exact pairwise distance, angle, and thickness queries plus occurrence-aware wrapper patterns
provides:
  - Root exact placement DTOs for pairwise measurement overlays
  - Additive root bindings for distance, angle, and thickness placement
  - Root contract coverage for stable frames, anchors, and explicit failures
affects: [phase-15, runtime]
tech-stack:
  added: []
  patterns: [additive-placement-dto, pairwise-placement-frame, explicit-placement-failure]
key-files:
  created:
    - .planning/phases/15-placement-contract-hardening/15-01-SUMMARY.md
    - test/exact_placement_contract.test.mjs
  modified:
    - dist/occt-js.d.ts
    - src/importer.hpp
    - src/exact-query.hpp
    - src/exact-query.cpp
    - src/js-interface.cpp
key-decisions:
  - "Placement helpers stay additive beside the shipped MeasureExact* APIs instead of reshaping existing exact measurement DTOs."
  - "Pairwise placement success returns anchors plus a full right-handed frame with origin, normal, xDir, and yDir."
  - "Unsupported or degenerate placement cases fail explicitly instead of inventing guessed frames or zero vectors."
patterns-established:
  - "Root wasm owns placement frame construction while downstream packages only normalize occurrence space and attach refs."
  - "Placement contract tests lock overlay-support geometry without introducing viewer-specific abstractions."
requirements-completed: [PLCT-01, PLCT-02, PLCT-04]
duration: n/a
completed: 2026-04-16
---

# Phase 15 Plan 01 Summary

**The root Wasm carrier now exposes additive pairwise placement helpers for distance, angle, and thickness, with stable anchors and full working frames suitable for downstream overlay code.**

## Performance

- **Duration:** n/a
- **Tasks:** 2
- **Files modified:** 6

## Accomplishments

- Added `test/exact_placement_contract.test.mjs` to lock exact distance, angle, and thickness placement DTOs, including frame shape, anchor arrays, and explicit failure behavior.
- Added `OcctExactPlacementAnchor`, `OcctExactPlacementFrame`, and `OcctExactPlacementResult` to `src/importer.hpp` and published the additive placement typings through `dist/occt-js.d.ts`.
- Implemented `SuggestExactDistancePlacement`, `SuggestExactAnglePlacement`, and `SuggestExactThicknessPlacement` in `src/exact-query.cpp` with the existing same-model, transform-aware exact-ref signature.
- Added placement DTO serialization and Embind bindings in `src/js-interface.cpp` without changing any existing `MeasureExact*` contract.
- Reused the shipped exact distance, angle, and thickness math to derive stable placement anchors and normalized working frames rather than creating a second measurement kernel.

## Task Commits

Each task was committed atomically:

1. **Task 1: Add failing root contract tests for pairwise placement helpers** - `8ef34b3` (`test`)
2. **Task 2: Implement additive pairwise placement DTOs and root bindings** - `618ce2d` (`feat`)

## Files Created/Modified

- `test/exact_placement_contract.test.mjs` - Added root contract coverage for pairwise placement success and failure cases.
- `src/importer.hpp` - Added the public placement DTO family.
- `src/exact-query.hpp` / `src/exact-query.cpp` - Added pairwise placement declarations and implementations for distance, angle, and thickness.
- `src/js-interface.cpp` - Added placement result serialization plus root Wasm bindings.
- `dist/occt-js.d.ts` - Added public placement result typings and module method signatures.

## Decisions Made

- Kept placement helpers additive beside the shipped `MeasureExactDistance`, `MeasureExactAngle`, and `MeasureExactThickness` APIs.
- Derived distance and thickness frames from the separation direction and the existing working-plane origin instead of inventing a new frame origin policy.
- Treated degenerate separation or parallel-angle cases as explicit placement failures instead of returning unstable frames.

## Deviations from Plan

- No substantive deviations. The shipped root placement surface matches the plan: additive DTOs, pairwise bindings, and explicit failure semantics.

## Issues Encountered

- None beyond the expected TDD RED phase while the placement helpers were still absent from the root Wasm carrier.

## User Setup Required

None.

## Next Phase Readiness

- `15-02` can extend the same placement DTO family to circular geometry and `occt-core` wrapper parity without reopening the root pairwise contract.
- The remaining Phase 15 work is adapter normalization and circular-placement support, not fresh pairwise lifecycle plumbing.

---
*Phase: 15-placement-contract-hardening*
*Completed: 2026-04-16*
