---
phase: 07-primitive-exact-geometry-queries
plan: "01"
subsystem: runtime-core
tags: [wasm, occt-core, exact-query, classification, radius, center]
requires:
  - phase: 06-occurrence-scoped-exact-ref-mapping
    provides: occurrence-scoped exact refs plus definition-scoped exact geometry bindings
provides:
  - Root exact query bindings for geometry classification, radius, and center
  - Retained exact-geometry lookup keyed by `exactModelId + exactShapeHandle`
  - Thin `occt-core` wrappers that adapt local-space primitive results into occurrence space
affects: [phase-07, phase-08, occt-core]
tech-stack:
  added: []
  patterns: [definition-scoped-exact-query, local-to-world-primitive-adaptation]
key-files:
  created:
    - .planning/phases/07-primitive-exact-geometry-queries/07-01-SUMMARY.md
    - src/exact-query.hpp
    - src/exact-query.cpp
    - test/exact_primitive_queries_contract.test.mjs
  modified:
    - package.json
    - dist/occt-js.d.ts
    - src/importer.hpp
    - src/exact-model-store.hpp
    - src/exact-model-store.cpp
    - src/js-interface.cpp
    - packages/occt-core/src/occt-core.js
    - packages/occt-core/test/core.test.mjs
key-decisions:
  - "Exact primitive queries resolve against `ExactModelEntry.exactGeometryShapes[exactShapeHandle - 1]`, never the model-level root shape."
  - "Wasm returns local-space kernel facts; `occt-core` adapts them into occurrence-space points and directions."
  - "Use `as1_pe_203.brep` rather than `bearing.igs` for stable circle/cylinder coverage because the IGES import path classified the bearing mostly as `other`."
patterns-established:
  - "Exact query logic lives in a dedicated helper layer instead of bloating `js-interface.cpp`."
  - "New exact primitive contracts are locked in root tests and added to the default `npm test` chain."
requirements-completed: [REF-03]
duration: 34min
completed: 2026-04-15
---

# Phase 07 Plan 01 Summary

**The runtime now exposes exact geometry classification plus radius and center primitives on retained exact refs, and `occt-core` can adapt those local-space results back into occurrence space.**

## Performance

- **Duration:** 34 min
- **Tasks:** 2
- **Files modified:** 10

## Accomplishments

- Added `test/exact_primitive_queries_contract.test.mjs` and extended `packages/occt-core/test/core.test.mjs` to lock the new exact primitive-query contract.
- Added a dedicated exact-query helper layer in C++ that resolves geometry-local topology ids through retained `exactGeometryShapes`.
- Exposed `GetExactGeometryType`, `MeasureExactRadius`, and `MeasureExactCenter` on the root wasm module and typed them in `dist/occt-js.d.ts`.
- Added thin `occt-core` wrappers for geometry classification, radius, and center that transform local-space points and directions into occurrence space.
- Wired the new root contract test into `npm test`.

## Task Commits

Each task was committed atomically:

1. **Task 1: Add failing contract tests for exact geometry classification, radius, and center** - `31894b5` (`test`)
2. **Task 2: Implement root exact classification, radius, and center queries plus thin occt-core wrappers** - `6765141` (`feat`)

## Files Created/Modified

- `src/exact-query.hpp` / `src/exact-query.cpp` - Added retained exact lookup plus analytic classification/radius/center helpers.
- `src/exact-model-store.hpp` / `src/exact-model-store.cpp` - Added read-only retained entry lookup for exact query services.
- `src/js-interface.cpp` - Added root exact query bindings and DTO serialization.
- `dist/occt-js.d.ts` - Added exact primitive-query typings.
- `packages/occt-core/src/occt-core.js` - Added occurrence-scoped wrappers for classification, radius, and center.
- `test/exact_primitive_queries_contract.test.mjs` - Added root exact primitive contract coverage.
- `packages/occt-core/test/core.test.mjs` - Added wrapper-shape and local-to-world adaptation tests.
- `package.json` - Added the new exact primitive contract test to `npm test`.

## Decisions Made

- Kept the root query surface definition-scoped and string-based (`face` / `edge`) instead of leaking `nodeId` or `geometryId` into wasm.
- Treated unsupported analytic families explicitly instead of guessing from mesh data.
- Chose a smaller BREP fixture for circle/cylinder coverage after verifying `bearing.igs` classified mostly as `other`.

## Deviations from Plan

- The `07-01` validation used `as1_pe_203.brep` instead of `bearing.igs` for circle/cylinder coverage after a fresh family-distribution scan showed the IGES sample did not exercise the intended analytic families through the current exact importer path.

## Issues Encountered

- Initial build failed because `gp_Circ` does not expose `Value()`. The fix was to sample the anchor point from `BRepAdaptor_Curve::Value(midParam)` instead.
- The first analytic fixture assumption was wrong: `bearing.igs` produced mostly `other` families, so the test fixture had to be corrected based on runtime evidence.

## User Setup Required

None.

## Next Phase Readiness

- `07-02` can build on the same `src/exact-query.*` helper layer for edge length, face area, and face-normal-at-point.
- The next remaining risk area is trimmed-face normal evaluation and world/local point conversion for occurrence-scoped refs.

---
*Phase: 07-primitive-exact-geometry-queries*
*Completed: 2026-04-15*
