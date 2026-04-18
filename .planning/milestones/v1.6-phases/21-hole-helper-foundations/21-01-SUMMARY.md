---
phase: 21-hole-helper-foundations
plan: "01"
subsystem: occt-core-hole-wrapper
tags: [occt-core, hole-helper, wrapper, occurrence-transforms, mocked-tests]
requires:
  - phase: 21-hole-helper-foundations
    provides: Phase 21 context, patterns, and plan artifacts
provides:
  - Package-first `describeExactHole(ref)` helper in `@tx-code/occt-core`
  - Mocked wrapper coverage for hole DTO shape, occurrence transforms, and typed failures
  - Reusable transform path for semantic hole geometry fields layered over the existing exact helper surface
affects: [phase-21, packages/occt-core, tests]
tech-stack:
  added: []
  patterns: [single-ref-semantic-wrapper, occurrence-space-hole-dto]
key-files:
  created:
    - .planning/phases/21-hole-helper-foundations/21-01-SUMMARY.md
  modified:
    - packages/occt-core/src/occt-core.js
    - packages/occt-core/test/core.test.mjs
key-decisions:
  - "The package-first API name is `describeExactHole(ref)`, with the root carrier method name reserved as `DescribeExactHole`."
  - "Hole helper wrappers reuse the existing frame/anchor/vector transform helpers instead of introducing a second semantic-transform path."
  - "Optional point-valued semantic fields are transformed only when present; typed failures pass through unchanged."
patterns-established:
  - "When a new exact semantic helper crosses the package boundary, lock the package wrapper contract with mocked tests before live carrier work."
  - "Occurrence-space helper wrappers should transform geometry fields only; scalar semantics and failure payloads stay carrier-transparent."
requirements-completed: []
duration: n/a
completed: 2026-04-18
---

# Phase 21 Plan 01 Summary

**`@tx-code/occt-core` now exposes a package-first `describeExactHole(ref)` wrapper, and its DTO/failure behavior is locked by mocked occurrence-transform tests before live carrier integration.**

## Performance

- **Duration:** n/a
- **Tasks:** 1
- **Files modified:** 2

## Accomplishments

- Added `describeExactHole(ref)` to `packages/occt-core/src/occt-core.js` as a single-ref semantic helper layered on the existing exact-ref validation flow.
- Reused the current placement/frame transform helpers so hole helper results return occurrence-space `frame`, `anchors`, `axisDirection`, and optional point-valued metadata when present.
- Added mocked wrapper tests in `packages/occt-core/test/core.test.mjs` covering:
  - carrier call shape to `DescribeExactHole`
  - transformed occurrence-space semantic geometry
  - explicit unsupported/failure passthrough
  - invalid-ref validation behavior
- Verified Plan 21-01 with `node --test packages/occt-core/test/core.test.mjs`.

## Task Commits

1. **Plan 21-01 implementation:** `b8563f8` (`feat(21): add package-first hole helper wrapper`)

## Files Created/Modified

- `packages/occt-core/src/occt-core.js` - Added the package-first `describeExactHole(ref)` wrapper and semantic-geometry transform handling.
- `packages/occt-core/test/core.test.mjs` - Added mocked wrapper tests for hole DTO shape, transforms, failures, and input validation.

## Decisions Made

- Kept the wrapper package-first and single-ref, mirroring `suggestExactRadiusPlacement(ref)` instead of inventing a multi-ref orchestration API.
- Reserved rich semantic interpretation for the carrier while keeping the package layer transform-transparent and failure-transparent.
- Allowed optional semantic point fields to flow through the same transform boundary, so later helper families can reuse the same wrapper pattern.

## Deviations from Plan

- No substantive deviations. Plan 21-01 landed exactly on the intended package-wrapper and mocked-test scope.

## Issues Encountered

- None. The package wrapper work stayed isolated from the live carrier surface as intended.

## User Setup Required

None.

## Next Phase Readiness

- Plan `21-02` can now implement the additive root `DescribeExactHole(...)` carrier method against a fixed package-facing DTO contract.
- The package wrapper is already in place, so live integration only needs to prove carrier parity rather than redesign the JS API.

---
*Phase: 21-hole-helper-foundations*
*Completed: 2026-04-18*
