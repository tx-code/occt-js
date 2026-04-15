---
phase: 05-exact-model-lifecycle-contract
plan: "01"
subsystem: runtime-core
tags: [wasm, lifecycle, exact-model, occt]
requires:
  - phase: 04-release-governance-flow
    provides: runtime-first verification boundary and stable root package contract
provides:
  - Retained exact-model store in the root wasm carrier
  - Root `OpenExact*` and `RetainExactModel` / `ReleaseExactModel` APIs
  - Root smoke coverage for the exact lifecycle lane
affects: [phase-05, phase-06, phase-07, phase-08, occt-core]
tech-stack:
  added: []
  patterns: [stateless-vs-stateful-runtime-lanes, wasm-handle-lifecycle]
key-files:
  created:
    - .planning/phases/05-exact-model-lifecycle-contract/05-01-SUMMARY.md
    - src/exact-model-store.hpp
    - src/exact-model-store.cpp
    - test/exact_model_lifecycle_contract.test.mjs
  modified:
    - src/importer.hpp
    - src/importer-step.hpp
    - src/importer-step.cpp
    - src/importer-iges.hpp
    - src/importer-iges.cpp
    - src/importer-brep.hpp
    - src/importer-brep.cpp
    - src/importer-xde.hpp
    - src/importer-xde.cpp
    - src/js-interface.cpp
key-decisions:
  - "Keep the exact-model lane separate from `Read*` so existing stateless import consumers do not inherit lifecycle concerns."
  - "Retain exact-model handles inside wasm with explicit refcounted `retain` / `release` semantics and explicit `invalid-handle` / `released-handle` failure codes."
patterns-established:
  - "Root APIs can add stateful exact-model capabilities without reshaping the existing scene payload contract."
  - "Exact lifecycle state is owned by wasm and surfaced to JS as model-level handles rather than viewer-specific identifiers."
requirements-completed: [LIFE-01]
duration: 9min
completed: 2026-04-14
---

# Phase 05 Plan 01 Summary

**The root wasm carrier now exposes a retained exact-model lifecycle lane with explicit open, retain, and release APIs alongside the unchanged stateless import surface.**

## Performance

- **Duration:** 9 min
- **Started:** 2026-04-14T22:33:00+08:00
- **Completed:** 2026-04-14T22:42:12+08:00
- **Tasks:** 2
- **Files modified:** 13

## Accomplishments

- Added root smoke coverage for exact-model lifecycle entrypoints and verified that `ReadStepFile` remains exact-handle-free.
- Added a wasm-side exact-model store with retained handles and explicit `retain` / `release` semantics.
- Added root `OpenExactModel`, `OpenExactStepModel`, `OpenExactIgesModel`, `OpenExactBrepModel`, `RetainExactModel`, and `ReleaseExactModel` bindings on top of exact importer paths.

## Task Commits

Each task was committed atomically:

1. **Task 1: Add a failing root smoke contract for the exact-model lifecycle lane** - `deeee52` (`test`)
2. **Task 2: Implement the wasm-side exact-model store and root exact open/release APIs** - `75e7ff8` (`feat`)

## Files Created/Modified

- `test/exact_model_lifecycle_contract.test.mjs` - Added root lifecycle smoke tests for exact open APIs and fresh-handle release behavior.
- `src/exact-model-store.hpp` / `src/exact-model-store.cpp` - Added the retained exact-model registry and handle lifecycle logic.
- `src/importer.hpp` - Added shared exact-import and lifecycle DTO structs.
- `src/importer-step.*`, `src/importer-iges.*`, `src/importer-brep.*`, `src/importer-xde.*` - Added exact import paths that preserve scene output while returning retained exact shapes.
- `src/js-interface.cpp` - Added exact open/release bindings and lifecycle DTO serialization.

## Decisions Made

- Kept exact-model retention at the model-handle level for Phase 5 and intentionally deferred public face/edge/vertex refs to Phase 6.
- Reused the existing importer scene payload path so exact opens return the same mesh-oriented contract plus `exactModelId`.

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

- The first Wasm build failed because `ImportExactBrepFromMemory()` still had one stale `return scene;` from the pre-refactor signature. The build log identified the exact line, it was corrected, and the next build plus lifecycle test run passed.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- `05-02` can now type the lifecycle DTOs, add `occt-core` lifecycle wrappers, and lock invalid-after-release behavior on top of the live root exact lane.
- The retained store is intentionally model-level only; exact topology refs and measurement primitives remain deferred to Phases 6-8.

---
*Phase: 05-exact-model-lifecycle-contract*
*Completed: 2026-04-14*
