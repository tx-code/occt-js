---
phase: 02-root-runtime-contract
plan: "03"
subsystem: runtime
tags: [tests, contract, orientation, golden, step, iges, brep]
requires:
  - phase: 02-root-runtime-contract
    provides: explicit root-mode and unit-metadata contract coverage for supported root imports
provides:
  - Explicit orientation API-shape coverage for supported formats and failure modes
  - Conditional golden checks for base-face, preset-axis, and unit-metadata semantics
affects: [phase-02, downstream-consumers, release]
tech-stack:
  added: []
  patterns: [orientation-contract-helpers, conditional-golden-assertions]
key-files:
  created: [.planning/phases/02-root-runtime-contract/02-03-SUMMARY.md]
  modified: [test/test_optimal_orientation_api.mjs, test/test_optimal_orientation_reference.mjs]
key-decisions:
  - "Separate orientation API shape guarantees from heuristic numeric golden checks by tightening both test layers independently."
  - "Treat `stage1.baseFaceId` as a conditional field: required for planar-base strategies, absent for non-planar and preset-axis flows."
patterns-established:
  - "Supported STEP, IGES, and BREP orientation calls must expose the full diagnostics container set and reject unsupported modes explicitly."
requirements-completed: [CORE-04]
duration: 10min
completed: 2026-04-14
---

# Phase 02: 02-03 Summary

**The optimal-orientation contract is now explicit for supported formats, failure modes, preset-axis requests, and golden diagnostics.**

## Performance

- **Duration:** 10 min
- **Started:** 2026-04-14T20:06:00+08:00
- **Completed:** 2026-04-14T20:16:00+08:00
- **Tasks:** 2
- **Files modified:** 2

## Accomplishments

- Reworked `test/test_optimal_orientation_api.mjs` into a contract test that checks full result shape for STEP, IGES, and BREP, plus unsupported-format and unsupported-mode failures.
- Tightened `test/test_optimal_orientation_reference.mjs` so golden checks now enforce conditional `stage1.baseFaceId`, unit metadata semantics, and preset-axis strategy behavior.
- Verified that preset-axis requests still return full diagnostics and keep `strategy` rooted in `preset-axis`.
- Rebuilt the Wasm artifacts and reran the focused orientation suite against fresh `dist/` output.

## Task Commits

Each task was committed atomically:

1. **Task 1: Tighten the orientation API and golden-fixture contract tests** - shipped in this plan's completion commit
2. **Task 2: Keep orientation diagnostics and golden references aligned with the supported-format contract** - verified without `src/orientation.cpp` or golden-data changes because the current implementation already satisfies the tightened contract

## Files Created/Modified

- `test/test_optimal_orientation_api.mjs` - Added `assertOrientationContract(...)`, supported-format coverage, and unsupported orientation mode assertions.
- `test/test_optimal_orientation_reference.mjs` - Added conditional `baseFaceId`, unit metadata, and preset-axis contract assertions on top of the golden numeric checks.
- `.planning/phases/02-root-runtime-contract/02-03-SUMMARY.md` - Recorded the plan outcome and verification evidence.

## Decisions Made

- Kept `src/orientation.cpp` unchanged because the current implementation already exposes the expected failure modes, strategy strings, unit metadata flow, and preset-axis diagnostics.
- Left `test/orientation_reference_golden.json` untouched because the tightened contract did not require any numeric golden updates.

## Deviations from Plan

- No `src/orientation.cpp` or `test/orientation_reference_golden.json` changes were necessary. The plan allowed minimal code or golden updates only if the stronger tests revealed contract drift, and they did not.

## Issues Encountered

None.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- Phase 02 now has explicit contract coverage for root imports, root-mode semantics, unit metadata, and optimal orientation diagnostics.
- The next workflow step is discussing or planning Phase 03 around downstream consumption and vendored package contracts.

---
*Phase: 02-root-runtime-contract*
*Completed: 2026-04-14*
