---
phase: 06-occurrence-scoped-exact-ref-mapping
plan: "01"
subsystem: runtime-core
tags: [wasm, exact-ref, geometry-binding, topology]
requires:
  - phase: 05-exact-model-lifecycle-contract
    provides: retained exact-model handles and root exact-open lifecycle
provides:
  - Root exact-open results now expose `exactGeometryBindings`
  - Retained exact models now keep one exact definition shape per exported geometry
  - Root contract coverage for binding alignment under reused geometry definitions
affects: [phase-06, phase-07, phase-08, occt-core]
tech-stack:
  added: []
  patterns: [definition-vs-occurrence-split, exact-geometry-binding]
key-files:
  created:
    - .planning/phases/06-occurrence-scoped-exact-ref-mapping/06-01-SUMMARY.md
    - test/exact_ref_mapping_contract.test.mjs
  modified:
    - dist/occt-js.d.ts
    - src/importer.hpp
    - src/exact-model-store.hpp
    - src/exact-model-store.cpp
    - src/importer-brep.cpp
    - src/importer-xde.cpp
    - src/js-interface.cpp
key-decisions:
  - "Keep exact geometry bindings definition-scoped and index-aligned with exported `geometries`, rather than baking occurrence state into the root Wasm contract."
  - "Use numeric `exactShapeHandle` values scoped to one retained `exactModelId`, so later phases can combine them with scene occurrence context in `occt-core`."
patterns-established:
  - "Root exact-open results can expand with exact-definition metadata while the stateless `Read*` lane remains untouched."
  - "Geometry reuse stays modeled as shared definition bindings plus separate node transforms."
requirements-completed: [REF-01]
duration: 7min
completed: 2026-04-15
---

# Phase 06 Plan 01 Summary

**The root exact-open lane now exposes one exact geometry binding per exported geometry definition, giving later phases a stable definition-level exact handle without leaking occurrence state into Wasm.**

## Performance

- **Duration:** 7 min
- **Started:** 2026-04-15T07:32:31+08:00
- **Completed:** 2026-04-15T07:39:43+08:00
- **Tasks:** 2
- **Files modified:** 8

## Accomplishments

- Added `test/exact_ref_mapping_contract.test.mjs` to lock `exactGeometryBindings` shape, reused-geometry alignment, and stateless-lane isolation.
- Extended retained exact-model state so exact imports keep one exact definition shape per exported geometry definition.
- Serialized `exactGeometryBindings` on exact-open results and typed the new root contract in `dist/occt-js.d.ts`.

## Task Commits

Each task was committed atomically:

1. **Task 1: Add a failing root contract test for exact-definition binding alignment** - `f0560b9` (`test`)
2. **Task 2: Implement exact-definition bindings on the root exact-open lane** - `c2d3bb5` (`feat`)

## Files Created/Modified

- `test/exact_ref_mapping_contract.test.mjs` - Added root contract coverage for `exactGeometryBindings`.
- `src/importer.hpp` - Extended exact import payloads with per-geometry exact shape retention.
- `src/exact-model-store.hpp` / `src/exact-model-store.cpp` - Retained exact geometry-definition shapes alongside each exact model entry.
- `src/importer-brep.cpp` / `src/importer-xde.cpp` - Collected exact definition shapes in lockstep with exported geometry-definition extraction.
- `src/js-interface.cpp` - Added `exactGeometryBindings` serialization on exact-open results.
- `dist/occt-js.d.ts` - Added `OcctJSExactGeometryBinding` to the public typing surface.

## Decisions Made

- Kept `exactShapeHandle` generation simple and deterministic: one positive integer per exported geometry definition, scoped to one `exactModelId`.
- Reused the existing geometry-definition ordering instead of inventing a new geometry id surface in Wasm.

## Deviations from Plan

None.

## Issues Encountered

No new runtime issues surfaced during `06-01`; the main work was extending retained exact import state without disturbing the existing stateless import lane.

## User Setup Required

None.

## Next Phase Readiness

- `06-02` can now normalize `exactGeometryBindings` in `occt-core` and resolve occurrence-scoped exact refs from the existing scene ids.
- Later measurement phases now have the definition-level exact handle they need without re-importing the CAD payload.

---
*Phase: 06-occurrence-scoped-exact-ref-mapping*
*Completed: 2026-04-15*
