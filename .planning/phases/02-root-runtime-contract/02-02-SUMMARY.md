---
phase: 02-root-runtime-contract
plan: "02"
subsystem: runtime
tags: [tests, contract, root-mode, units, step, iges, brep]
requires:
  - phase: 02-root-runtime-contract
    provides: canonical direct-vs-generic import payload parity coverage
provides:
  - Explicit root-mode contract coverage for STEP, IGES, and BREP
  - Explicit unit-metadata parity coverage for XDE imports and unitless BREP guarantees
affects: [phase-02, downstream-consumers, release]
tech-stack:
  added: []
  patterns: [root-mode-contract-helpers, unit-metadata-presence-parity]
key-files:
  created: [.planning/phases/02-root-runtime-contract/02-02-SUMMARY.md]
  modified: [test/test_step_iges_root_mode.mjs, test/test_brep_root_mode.mjs]
key-decisions:
  - "Treat IGES root-mode behavior as an explicit supported contract even when all three modes collapse to one root on the baseline fixture."
  - "Document BREP as intentionally unitless by asserting both direct and generic paths omit `sourceUnit` and `unitScaleToMeters`."
patterns-established:
  - "STEP and BREP fixtures lock exact multi-root counts for `multiple-shapes` while default and `one-shape` keep one logical root."
requirements-completed: [CORE-02, CORE-03]
duration: 11min
completed: 2026-04-14
---

# Phase 02: 02-02 Summary

**Root-mode and unit-metadata semantics are now explicit contract tests for STEP, IGES, and BREP, with fresh Wasm rebuild verification.**

## Performance

- **Duration:** 11 min
- **Started:** 2026-04-14T20:02:00+08:00
- **Completed:** 2026-04-14T20:13:00+08:00
- **Tasks:** 2
- **Files modified:** 2

## Accomplishments

- Reworked `test/test_step_iges_root_mode.mjs` around reusable direct-vs-generic parity helpers for root selection and unit metadata.
- Reworked `test/test_brep_root_mode.mjs` so BREP explicitly documents default/`one-shape` parity, exact `multiple-shapes` root counts, and unitless results.
- Locked `two_free_shapes.step`, `chassis-2roots.stp`, `cube_10x10.igs`, `as1_pe_203.brep`, and `nonmanifold_cells.brep` into explicit root-mode contract coverage.
- Rebuilt the Wasm artifacts and reran the focused STEP/IGES/BREP suite against fresh `dist/` output.

## Task Commits

Each task was committed atomically:

1. **Task 1: Turn root-mode and unit-metadata expectations into explicit contract tests** - shipped in this plan's completion commit
2. **Task 2: Keep importer root selection and unit metadata aligned with the explicit contract** - verified without importer source changes because the current implementation already matches the tightened contract

## Files Created/Modified

- `test/test_step_iges_root_mode.mjs` - Added helper-based direct/generic parity checks, exact STEP/IGES root-mode assertions, and unit metadata presence checks.
- `test/test_brep_root_mode.mjs` - Added helper-based BREP root-mode parity coverage, explicit unitless assertions, and exact multi-root fixture counts.
- `.planning/phases/02-root-runtime-contract/02-02-SUMMARY.md` - Recorded the plan outcome and verification evidence.

## Decisions Made

- Promoted the observed IGES behavior into an explicit contract: default, `one-shape`, and `multiple-shapes` all remain one root on `cube_10x10.igs`, and both entrypoints must agree on unit metadata presence.
- Locked BREP's unitless behavior as intentional API semantics rather than leaving it implicit.

## Deviations from Plan

- No `src/importer-xde.cpp`, `src/importer-brep.cpp`, or `src/importer.hpp` changes were necessary. The plan allowed minimum importer edits only if the new contract tests surfaced drift, and they did not.

## Issues Encountered

None.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- `02-02` now makes root selection and unit metadata explicit for all supported root import formats.
- The next execution target is `02-03`, which can focus purely on optimal-orientation diagnostics and golden-reference stability.

---
*Phase: 02-root-runtime-contract*
*Completed: 2026-04-14*
