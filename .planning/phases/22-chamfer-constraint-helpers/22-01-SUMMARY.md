---
phase: 22-chamfer-constraint-helpers
plan: "01"
subsystem: exact-chamfer-carrier
tags: [root-runtime, exact-query, chamfer-helper, embind, live-integration]
requires:
  - phase: 22-chamfer-constraint-helpers
    provides: Phase 22 context, patterns, and plan artifacts
provides:
  - Additive root `DescribeExactChamfer(...)` carrier query and public typings
  - Package-first `describeExactChamfer(ref)` wrapper in `@tx-code/occt-core`
  - Root retained-model contract coverage and live package parity for planar chamfer semantics
affects: [phase-22, root, dist, packages/occt-core, tests]
tech-stack:
  added: []
  patterns: [selected-ref-planar-chamfer-classifier, carrier-to-package-chamfer-parity, fixture-reuse-over-new-fixture]
key-files:
  created:
    - .planning/phases/22-chamfer-constraint-helpers/22-01-SUMMARY.md
    - test/exact_chamfer_contract.test.mjs
  modified:
    - .planning/STATE.md
    - dist/occt-js.d.ts
    - packages/occt-core/src/occt-core.js
    - packages/occt-core/test/core.test.mjs
    - packages/occt-core/test/live-root-integration.test.mjs
    - src/importer.hpp
    - src/exact-query.hpp
    - src/exact-query.cpp
    - src/js-interface.cpp
key-decisions:
  - "The carrier grows by one narrow face-ref method `DescribeExactChamfer(...)`; initial chamfer support does not accept edge refs."
  - "Supported planar chamfers are derived from exactly two non-parallel oblique planar support faces and their linear boundary edges relative to the virtual support-plane intersection edge."
  - "Existing shipped fixture `ANC101.stp` is stable enough for supported and unsupported chamfer candidates, so no new chamfer fixture was needed."
patterns-established:
  - "A planar chamfer can be described from one selected face by combining support-plane intersection geometry with the two support boundary lines instead of exposing generic topology APIs."
  - "New semantic helpers should prove root contract behavior and live occurrence-transform parity before broader governance or helper-family work lands."
requirements-completed: [FEAT-04]
duration: n/a
completed: 2026-04-18
---

# Phase 22 Plan 01 Summary

**The root carrier now exposes `DescribeExactChamfer(...)`, and `@tx-code/occt-core` can describe supported planar chamfers from one selected face ref while preserving occurrence transforms in live runtime tests.**

## Performance

- **Duration:** n/a
- **Tasks:** 1
- **Files modified:** 9

## Accomplishments

- Added `OcctExactChamferResult` / `OcctJSExactChamferResult` and wired `DescribeExactChamfer(...)` through `src/importer.hpp`, `dist/occt-js.d.ts`, `src/exact-query.hpp`, and `src/js-interface.cpp`.
- Added `describeExactChamfer(ref)` to `packages/occt-core/src/occt-core.js` and reused the existing occurrence-transform machinery so the package surface stays aligned with Phase 21.
- Implemented `DescribeExactChamfer(...)` in `src/exact-query.cpp` as a narrow selected-ref query:
  - accepts only planar face refs
  - derives exactly two non-parallel oblique planar support faces from retained topology
  - computes chamfer offsets from the virtual support-plane intersection line to the two support boundary lines
  - returns semantic chamfer facts (`variant`, `distanceA`, `distanceB`, `supportAngle`, `frame`, `anchors`, support normals, and edge direction)
  - keeps unsupported or ambiguous topology explicit through typed failures
- Added `test/exact_chamfer_contract.test.mjs` to verify:
  - a supported planar chamfer face ref in `ANC101.stp`
  - explicit `unsupported-geometry` failures for non-chamfer planar faces
- Extended `packages/occt-core/test/core.test.mjs` with mocked wrapper tests for `describeExactChamfer(ref)`.
- Extended `packages/occt-core/test/live-root-integration.test.mjs` with a live transform-parity test proving `describeExactChamfer(ref)` stays occurrence-safe against the built carrier.
- Verified the implementation with:
  - `node --test packages/occt-core/test/core.test.mjs`
  - `npm run build:wasm:win`
  - `node --test test/exact_chamfer_contract.test.mjs`
  - `node --test packages/occt-core/test/live-root-integration.test.mjs`
  - `npm --prefix packages/occt-core test`

## Files Created/Modified

- `dist/occt-js.d.ts` - Added public chamfer-result typings, the `DescribeExactChamfer(...)` carrier signature, and additive anchor-role vocabulary.
- `packages/occt-core/src/occt-core.js` - Added the package-first `describeExactChamfer(ref)` wrapper and semantic-geometry transforms.
- `packages/occt-core/test/core.test.mjs` - Added mocked wrapper tests for chamfer DTO shape, transforms, failures, and input validation.
- `packages/occt-core/test/live-root-integration.test.mjs` - Added a live occurrence-transform parity test for `describeExactChamfer(ref)`.
- `src/importer.hpp` - Added the additive exact-chamfer result struct reusing placement frame and anchor concepts.
- `src/exact-query.hpp` / `src/exact-query.cpp` - Added the selected-ref chamfer carrier query and its support-plane/boundary-line classification logic.
- `src/js-interface.cpp` - Added chamfer-result serialization plus the new Embind binding.
- `test/exact_chamfer_contract.test.mjs` - Added retained-model root contract coverage for supported and unsupported planar chamfer candidates.

## Decisions Made

- Kept the carrier surface intentionally narrow: one selected face-ref query instead of generic topology traversal or feature discovery.
- Chose face-only support for the initial chamfer contract, because the selected face already identifies the semantic feature without reopening ambiguous boundary-edge entry points.
- Reused `ANC101.stp` instead of creating a synthetic chamfer fixture because it already exposed both supported and unsupported planar candidates deterministically.

## Deviations from Plan

- No substantive deviations. The only scope tightening was making face-only input explicit in the implementation, which stayed within the Phase 22 context decisions.

## Issues Encountered

- The first heuristic candidate in `ANC101.stp` exposed two oblique but parallel support planes, which looked chamfer-like from the selected face normal alone but was not a valid support-edge chamfer. The contract search and live helper detection were tightened to require non-parallel support planes.

## User Setup Required

None.

## Next Phase Readiness

- Plan `22-02` can now build the package-only midpoint, equal-distance, and symmetry-style helper family on top of the stabilized placement/relation foundation plus the new chamfer wrapper surface.
- `FEAT-04` is now satisfied; Phase 22 can focus entirely on `FEAT-05` next.

---
*Phase: 22-chamfer-constraint-helpers*
*Completed: 2026-04-18*
