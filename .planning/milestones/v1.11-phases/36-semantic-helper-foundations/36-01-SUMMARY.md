---
phase: 36-semantic-helper-foundations
plan: "01"
subsystem: compound-hole-helper-contract
tags: [root-runtime, occt-core, compound-hole, counterbore, countersink, tdd]
requires:
  - phase: 36-semantic-helper-foundations
    provides: Phase 36 context, research, and execution plan baseline
  - file: .planning/phases/36-semantic-helper-foundations/36-01-PLAN.md
    provides: Compound-hole helper scope, acceptance criteria, and verification contract
provides:
  - Additive root `DescribeExactCompoundHole(...)` carrier support for supported selected-ref `counterbore` and `countersink` semantics
  - Package-first `describeExactCounterbore(ref)` and `describeExactCountersink(ref)` helpers in `@tx-code/occt-core`
  - Deterministic retained-model and live-wrapper verification proving occurrence-safe compound-hole semantics
affects: [phase-36, src, dist, packages/occt-core, tests]
tech-stack:
  added: []
  patterns: [selected-ref-compound-hole-normalization, carrier-family-to-package-kind-narrowing, fixture-backed-semantic-helper-contract]
key-files:
  added:
    - .planning/phases/36-semantic-helper-foundations/36-01-SUMMARY.md
    - test/exact_compound_hole_contract.test.mjs
    - test/freecad_hole_puzzle_counterbore.brep
    - test/freecad_hole_puzzle_countersink.brep
  modified:
    - src/importer.hpp
    - src/exact-query.hpp
    - src/exact-query.cpp
    - src/js-interface.cpp
    - dist/occt-js.d.ts
    - dist/occt-js.js
    - dist/occt-js.wasm
    - packages/occt-core/src/occt-core.js
    - packages/occt-core/src/index.d.ts
    - packages/occt-core/test/core.test.mjs
    - packages/occt-core/test/live-root-integration.test.mjs
key-decisions:
  - "The root carrier widens by one narrow selected-ref method, `DescribeExactCompoundHole(...)`, instead of introducing generic topology discovery or viewer-owned feature analysis."
  - "Compound-hole detection stays geometry-first: counterbore normalizes cylinder + annular transition plane + smaller cylinder, while countersink normalizes cone + smaller cylinder."
  - "The package layer narrows carrier `family` into explicit package-first helper kinds (`counterbore` and `countersink`) while reusing the existing occurrence-space transform path."
patterns-established:
  - "When a semantic helper family has multiple downstream names, keep one additive carrier descriptor and let the package layer expose narrowed intent-specific wrappers."
  - "For exact semantic helpers, deterministic upstream geometry can be vendored as minimal BREP fixtures when shipped repo fixtures do not cover the required topology."
requirements-completed: [FEAT-07]
duration: n/a
completed: 2026-04-21
---

# Phase 36 Plan 01 Summary

**The root runtime and `@tx-code/occt-core` now expose supported compound-hole semantics for `counterbore` and `countersink` from one selected exact ref, with deterministic retained-model coverage and occurrence-safe package wrappers.**

## Accomplishments

- Added `DescribeExactCompoundHole(...)` to the root exact-query surface, including:
  - additive DTO support in `src/importer.hpp`
  - exact-query declarations in `src/exact-query.hpp`
  - retained-geometry normalization logic in `src/exact-query.cpp`
  - Embind serialization and binding exposure in `src/js-interface.cpp`
  - public typing updates in `dist/occt-js.d.ts`
- Refactored the hole helper internals to reuse a shared cylindrical-boundary descriptor path before layering compound-hole classification on top.
- Implemented supported compound-hole normalization rules:
  - counterbore from coaxial large-cylinder + annular plane + smaller-cylinder stacks
  - countersink from cone + smaller-cylinder stacks
  - explicit typed unsupported behavior for plain cylindrical holes or unsupported topology
- Added package-first wrapper APIs in `packages/occt-core/src/occt-core.js` and typed results in `packages/occt-core/src/index.d.ts`:
  - `describeExactCounterbore(ref)`
  - `describeExactCountersink(ref)`
- Added focused verification assets and tests:
  - `test/exact_compound_hole_contract.test.mjs` for retained-model root coverage
  - `packages/occt-core/test/core.test.mjs` mocked wrapper coverage
  - `packages/occt-core/test/live-root-integration.test.mjs` live occurrence-transform coverage
  - `test/freecad_hole_puzzle_counterbore.brep` and `test/freecad_hole_puzzle_countersink.brep` as deterministic semantic fixtures
- Rebuilt the canonical root runtime artifacts in `dist/` so the new binding ships through the published carrier shape.

## Verification

- `node --test packages/occt-core/test/core.test.mjs`
- `npm run build:wasm:win`
- `node --test test/exact_compound_hole_contract.test.mjs`
- `node --test packages/occt-core/test/live-root-integration.test.mjs`
- `npm --prefix packages/occt-core test`
- `npm test`
- `npm run test:planning:audit`

All commands passed on 2026-04-21.

## Process Notes

- `superpowers:test-driven-development` was followed for this plan: the new compound-hole tests were added first, verified red, then driven green through the carrier and package layers.
- Verification was widened from the plan minimum to include the full root `npm test` lane because this plan changed the root Wasm contract and Embind surface.

## Deviations From Plan

- The repository's shipped fixtures did not provide a deterministic cone-backed compound-hole case, so two narrow BREP fixtures were added from FreeCAD demo geometry rather than widening the helper scope or relying on unstable ad hoc model generation.

## Next Phase Readiness

- The retained root/package boundary for compound-hole semantics is now locked around shipped `hole`, `chamfer`, `counterbore`, and `countersink` semantics.
- Historical note: the planned `36-02` candidate-analysis follow-on was later dropped before acceptance when `v1.11` was narrowed back to helper-only scope.
