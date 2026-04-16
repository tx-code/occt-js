---
phase: 16-exact-relation-classifier-contract
plan: "01"
subsystem: runtime-core
tags: [wasm, relations, analytic, parallel, perpendicular, concentric, tangent]
requires:
  - phase: 15-placement-contract-hardening
    provides: stable placement frame and anchor DTOs reused by relation-support geometry
provides:
  - Root exact relation DTOs for parallel, perpendicular, concentric, tangent, and none
  - Additive root binding for `ClassifyExactRelation(...)`
  - Root contract coverage for relation success, none, and explicit failures
affects: [phase-16, runtime]
tech-stack:
  added: []
  patterns: [additive-relation-dto, none-as-success, transform-aware-relation-kernel]
key-files:
  created:
    - .planning/phases/16-exact-relation-classifier-contract/16-01-SUMMARY.md
    - test/exact_relation_contract.test.mjs
  modified:
    - dist/occt-js.d.ts
    - src/importer.hpp
    - src/exact-query.hpp
    - src/exact-query.cpp
    - src/js-interface.cpp
key-decisions:
  - "Relation classification stays additive beside the shipped `MeasureExact*` and `SuggestExact*Placement` APIs."
  - "`kind: \"none\"` is a successful root result for valid analytic non-relations, not a failure path."
  - "Root relation results reuse placement frame and anchor vocabulary instead of inventing a second presentation-geometry shape."
patterns-established:
  - "Root wasm owns analytic relation classification and supporting geometry; downstream packages only preserve transforms and refs."
  - "Supported relation families stay tight and exact: line/line, plane/plane, circle/circle, and circle/cylinder."
requirements-completed: [REL-01, REL-02, REL-03]
duration: n/a
completed: 2026-04-16
---

# Phase 16 Plan 01 Summary

**The root Wasm carrier now exposes an additive exact relation classifier that can return `parallel`, `perpendicular`, `concentric`, `tangent`, or `none` with stable supporting geometry and explicit failures.**

## Performance

- **Duration:** n/a
- **Tasks:** 2
- **Files modified:** 6

## Accomplishments

- Added `test/exact_relation_contract.test.mjs` to lock root relation semantics for line-line and rotational analytic pairs, plus `kind: "none"` and explicit failure payloads.
- Added `OcctExactRelationResult` to `src/importer.hpp` and published the additive relation typings through `dist/occt-js.d.ts`.
- Added `ClassifyExactRelation(...)` to `src/exact-query.hpp` and `src/exact-query.cpp` with same-model, transform-aware exact-ref semantics.
- Implemented relation classification for line-line and plane-plane `parallel` / `perpendicular`, circle-circle `concentric` / `tangent`, and circle-cylinder `concentric`.
- Added relation DTO serialization and Embind bindings in `src/js-interface.cpp` without reshaping any existing exact-measurement or placement APIs.

## Task Commits

The RED→GREEN cycle was verified locally first, then landed as one atomic root-contract commit because the new public binding, DTOs, and contract tests are inseparable:

1. **Task 1 + Task 2: Add failing root contract tests and implement the additive relation classifier** - `5d4ff2f` (`feat`)

## Files Created/Modified

- `test/exact_relation_contract.test.mjs` - Added root contract coverage for relation success, `none`, and explicit failures.
- `src/importer.hpp` - Added the public relation DTO family.
- `src/exact-query.hpp` / `src/exact-query.cpp` - Added relation declarations and analytic classifier implementations.
- `src/js-interface.cpp` - Added relation result serialization plus root Wasm bindings.
- `dist/occt-js.d.ts` - Added public relation typings and module method signature.

## Decisions Made

- Kept relation helpers additive instead of folding relation metadata into `MeasureExactAngle`, `MeasureExactDistance`, or placement results.
- Returned `kind: "none"` for supported analytic pairs with no matching relation instead of collapsing them into `unsupported-geometry`.
- Reused the Phase 15 placement frame and anchor vocabulary so downstream overlay code can consume one compact geometry-support DTO family.

## Deviations from Plan

- The two planned tasks were committed together once the RED tests and root implementation both stabilized. The shipped surface still matches the plan exactly: additive relation DTOs, root binding, and root contract coverage.

## Issues Encountered

- The initial RED phase failed because `ClassifyExactRelation` did not exist yet. No additional fixture work was needed after using occurrence transforms to synthesize a stable tangent case from existing circular geometry.

## User Setup Required

None.

## Next Phase Readiness

- `16-02` can now stay thin: `occt-core` only needs to validate refs, forward transforms to `ClassifyExactRelation`, preserve `kind: "none"`, and attach refs on success.
- The root relation surface is stable enough for package parity and later SDK docs/governance work.

---
*Phase: 16-exact-relation-classifier-contract*
*Completed: 2026-04-16*
