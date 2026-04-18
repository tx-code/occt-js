---
phase: 21-hole-helper-foundations
plan: "02"
subsystem: exact-hole-carrier
tags: [root-runtime, exact-query, hole-helper, embind, live-integration]
requires:
  - phase: 21-hole-helper-foundations
    provides: Phase 21 context, patterns, and plan artifacts
  - commit: b8563f8
    provides: package-first `describeExactHole(ref)` wrapper contract
provides:
  - Additive root `DescribeExactHole(...)` carrier query and public typings
  - Root retained-model contract coverage for supported and unsupported hole candidates
  - Live package parity proving `describeExactHole(ref)` stays occurrence-safe against the built runtime
affects: [phase-21, root, dist, packages/occt-core, tests]
tech-stack:
  added: []
  patterns: [selected-ref-hole-classifier, carrier-to-package-hole-parity, fixture-reuse-over-new-fixture]
key-files:
  created:
    - .planning/phases/21-hole-helper-foundations/21-02-SUMMARY.md
    - test/exact_hole_contract.test.mjs
  modified:
    - dist/occt-js.d.ts
    - src/importer.hpp
    - src/exact-query.hpp
    - src/exact-query.cpp
    - src/js-interface.cpp
    - packages/occt-core/test/live-root-integration.test.mjs
key-decisions:
  - "The root carrier grows by one narrow selected-ref method `DescribeExactHole(...)` instead of generic topology or discovery APIs."
  - "Cylindrical-hole support is recognized by selected circle/cylinder refs whose face topology exposes exactly two circular boundary loops and at least one open boundary."
  - "Existing retained-model fixtures (`as1_pe_203.brep`, `ANC101.stp`) are stable enough for supported and unsupported hole candidates, so no new `simple_hole.step` fixture was needed."
patterns-established:
  - "When distinguishing cylindrical holes from external cylinders, probe toward the cylinder axis and beyond each circular boundary against the retained geometry instead of relying on viewer semantics."
  - "A new exact semantic helper should add a dedicated root contract test plus a package live-integration parity test before governance work broadens release coverage."
requirements-completed: [FEAT-03, ADAPT-09]
duration: n/a
completed: 2026-04-18
---

# Phase 21 Plan 02 Summary

**The root carrier now exposes `DescribeExactHole(...)`, and `@tx-code/occt-core` can describe supported cylindrical holes from one selected exact ref while preserving occurrence transforms in live runtime tests.**

## Performance

- **Duration:** n/a
- **Tasks:** 1
- **Files modified:** 7

## Accomplishments

- Added `OcctExactHoleResult` / `OcctJSExactHoleResult` and wired `DescribeExactHole(...)` through `src/importer.hpp`, `dist/occt-js.d.ts`, `src/exact-query.hpp`, and `src/js-interface.cpp`.
- Implemented `DescribeExactHole(...)` in `src/exact-query.cpp` as a narrow selected-ref query:
  - resolves a cylindrical face directly or through a circular edge adjacent to exactly one cylindrical face
  - distinguishes supported hole cavities from non-hole cylinders by probing toward the axis inside the retained geometry
  - derives open/closed circular boundaries to classify through vs blind semantics
  - reuses the existing frame/anchor vocabulary for app-facing support geometry
- Added `test/exact_hole_contract.test.mjs` to verify:
  - supported circular-edge hole semantics
  - supported cylindrical-face semantics for the same hole
  - explicit `unsupported-geometry` failures for non-hole or out-of-scope circular/cylindrical candidates
- Extended `packages/occt-core/test/live-root-integration.test.mjs` with a live transform-parity test proving `describeExactHole(ref)` stays occurrence-safe against the built carrier.
- Verified the implementation with:
  - `npm run build:wasm:win`
  - `node --test test/exact_hole_contract.test.mjs`
  - `npm --prefix packages/occt-core test`
  - `npm run test:release:root`

## Task Commits

1. **Plan 21-02 implementation:** `736b7aa` (`feat(21): add exact hole carrier support`)

## Files Created/Modified

- `dist/occt-js.d.ts` - Added public hole-result typings, the `DescribeExactHole(...)` carrier signature, and additive anchor-role vocabulary.
- `src/importer.hpp` - Added the additive exact-hole result struct reusing placement frame and anchor concepts.
- `src/exact-query.hpp` / `src/exact-query.cpp` - Added the selected-ref hole carrier query and its cavity/boundary classification logic.
- `src/js-interface.cpp` - Added hole-result serialization plus the new Embind binding.
- `test/exact_hole_contract.test.mjs` - Added retained-model root contract coverage for supported and unsupported hole candidates.
- `packages/occt-core/test/live-root-integration.test.mjs` - Added a live occurrence-transform parity test for `describeExactHole(ref)`.

## Decisions Made

- Kept the carrier surface intentionally narrow: one selected-ref query instead of generic topology traversal or feature discovery.
- Reused existing retained-model fixtures rather than adding a synthetic hole file because the shipped BREP/STEP fixtures already exposed stable supported and unsupported candidates.
- Deliberately left release-governance/docs wiring for `DescribeExactHole` to Phase 23, while still proving the helper does not break the current authoritative root release gate.

## Deviations from Plan

- Reused existing fixtures (`as1_pe_203.brep`, `ANC101.stp`) instead of adding `test/simple_hole.step`. This reduced fixture maintenance overhead and still satisfied the contract-testing goal with deterministic supported and unsupported candidates.

## Issues Encountered

- No blocker-level issues. The main design risk was false positives on external cylinders, which was addressed by retained-geometry probe classification toward the cylinder axis and beyond the boundary loops.

## User Setup Required

None.

## Next Phase Readiness

- Phase 21 is complete. Phase 22 can extend the helper family to chamfer plus equal-distance/symmetry/midpoint semantics using the same package-first + narrow-carrier pattern.
- Phase 23 can document and govern `describeExactHole(ref)` / `DescribeExactHole(...)` now that the runtime and package surface are stable.

---
*Phase: 21-hole-helper-foundations*
*Completed: 2026-04-18*
