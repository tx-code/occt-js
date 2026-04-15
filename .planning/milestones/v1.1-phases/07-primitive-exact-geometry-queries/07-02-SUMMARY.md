---
phase: 07-primitive-exact-geometry-queries
plan: "02"
subsystem: runtime-core
tags: [wasm, occt-core, exact-query, edge-length, face-area, face-normal]
requires:
  - phase: 07-primitive-exact-geometry-queries
    provides: exact geometry classification plus radius/center primitives on retained exact refs
provides:
  - Root exact query bindings for exact edge length, face area, and face-normal-at-point
  - Definition-space face-normal evaluation with trimmed-face projection validation
  - `occt-core` wrappers that convert world-space query points into definition space and return occurrence-space normals
affects: [phase-07, phase-08, occt-core]
tech-stack:
  added: []
  patterns: [exact-property-query, trimmed-face-projection-validation, occurrence-space-normal-adaptation]
key-files:
  created:
    - .planning/phases/07-primitive-exact-geometry-queries/07-02-SUMMARY.md
  modified:
    - dist/occt-js.d.ts
    - src/importer.hpp
    - src/exact-query.hpp
    - src/exact-query.cpp
    - src/js-interface.cpp
    - packages/occt-core/src/occt-core.js
    - packages/occt-core/test/core.test.mjs
    - packages/occt-core/test/live-root-integration.test.mjs
    - test/exact_primitive_queries_contract.test.mjs
key-decisions:
  - "Exact edge length and face area use OCCT property APIs (`BRepGProp`) instead of mesh-derived approximations."
  - "Face-normal evaluation projects onto the bounded face domain and rejects off-trim queries with `query-out-of-range` instead of silently evaluating the carrier surface."
  - "Occurrence transforms remain a pure `occt-core` concern: wasm receives definition-space points and returns definition-space normals."
patterns-established:
  - "Every new exact primitive is locked twice: root contract tests prove wasm behavior and `occt-core` tests prove occurrence adaptation."
  - "World-space measurement queries invert occurrence transforms before touching retained exact geometry."
requirements-completed: [MEAS-03]
duration: 39min
completed: 2026-04-15
---

# Phase 07 Plan 02 Summary

**The exact-measurement foundation now covers exact edge length, face area, and face-normal-at-point, with `occt-core` adapting world-space query points and normals for repeated geometry occurrences.**

## Performance

- **Duration:** 39 min
- **Tasks:** 2
- **Files modified:** 9

## Accomplishments

- Extended the root exact primitive contract with failing tests for edge length, face area, and face-normal evaluation plus explicit invalid-point and unsupported-geometry failures.
- Added exact query DTOs and wasm bindings for `MeasureExactEdgeLength`, `MeasureExactFaceArea`, and `EvaluateExactFaceNormal`.
- Implemented exact edge-length and face-area measurements using `BRepGProp` exact properties.
- Implemented face-normal evaluation through bounded surface projection, trimmed-face validation, and explicit failure semantics.
- Added `occt-core` wrappers that invert occurrence transforms for query points and return world-space points and normals.
- Proved the transform behavior both with mocked wrapper tests and a live repeated-geometry integration test against the built root carrier.

## Task Commits

Each task was committed atomically:

1. **Task 1: Add failing contract tests for exact edge length, face area, and face-normal evaluation** - pending commit in current batch (`test`)
2. **Task 2: Implement exact edge length, face area, and face-normal query bindings plus transform-aware occt-core wrappers** - pending commit in current batch (`feat`)

## Files Created/Modified

- `src/importer.hpp` - Added exact length, area, and face-normal DTOs.
- `src/exact-query.hpp` / `src/exact-query.cpp` - Added exact property queries and trimmed-face normal evaluation helpers.
- `src/js-interface.cpp` - Added new Embind bindings and JS DTO serialization.
- `dist/occt-js.d.ts` - Added public typings for the new exact query methods and results.
- `packages/occt-core/src/occt-core.js` - Added world/local transform-aware wrappers for edge length, face area, and face-normal evaluation.
- `packages/occt-core/test/core.test.mjs` - Added wrapper-level TDD coverage for length, area, and inverse point transforms.
- `packages/occt-core/test/live-root-integration.test.mjs` - Added repeated-geometry face-normal integration coverage.
- `test/exact_primitive_queries_contract.test.mjs` - Added root wasm contract coverage for length, area, and face normals.

## Decisions Made

- Kept face-normal evaluation exact and definition-scoped inside wasm; the app-facing occurrence adaptation stays in `occt-core`.
- Treated non-face face-normal requests as explicit `unsupported-geometry` failures.
- Used the trimmed-face classifier as the acceptance gate for query-point validity instead of accepting any projection onto the underlying infinite carrier surface.

## Deviations from Plan

- Added extra `occt-core` unit coverage for the new wrapper methods in addition to the planned live integration test so every new wrapper entered through a full red-green loop.

## Issues Encountered

- None after the red tests were in place; the first full `build:wasm:win` succeeded with the new property-query and face-normal code.

## User Setup Required

None.

## Next Phase Readiness

- Phase 08 can now build pairwise measurements on top of retained exact refs, exact scalar primitives, and occurrence-aware face-normal queries.
- The remaining scope is pairwise geometry and adapter hardening, not more single-entity kernel plumbing.

---
*Phase: 07-primitive-exact-geometry-queries*
*Completed: 2026-04-15*
