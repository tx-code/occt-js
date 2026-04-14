---
phase: 02-root-runtime-contract
plan: "01"
subsystem: runtime
tags: [tests, contract, step, iges, brep]
requires:
  - phase: 01-wasm-build-dist-baseline
    provides: canonical dist runtime artifact enforcement and fast preflight coverage
provides:
  - Direct-vs-generic parity coverage for the canonical STEP, IGES, and BREP root payload
  - Field-level assertions for the root Wasm success contract and paired unit metadata
affects: [phase-02, downstream-consumers, release]
tech-stack:
  added: []
  patterns: [canonical-payload-signature, direct-generic-entrypoint-parity]
key-files:
  created: [.planning/phases/02-root-runtime-contract/02-01-SUMMARY.md]
  modified: [test/test_multi_format_exports.mjs]
key-decisions:
  - "Treat source-unit metadata as a paired contract: `sourceUnit` and `unitScaleToMeters` appear together or not at all."
  - "Lock parity by comparing canonical result signatures rather than only spot-checking import success."
patterns-established:
  - "STEP, IGES, and BREP direct and generic entrypoints must produce the same canonical success payload signature for the same bytes."
requirements-completed: [CORE-02]
duration: 7min
completed: 2026-04-14
---

# Phase 02: 02-01 Summary

**The root Wasm import contract is now locked down with explicit direct-vs-generic payload parity coverage for STEP, IGES, and BREP.**

## Performance

- **Duration:** 7 min
- **Started:** 2026-04-14T19:50:00+08:00
- **Completed:** 2026-04-14T19:57:00+08:00
- **Tasks:** 2
- **Files modified:** 1

## Accomplishments

- Reworked `test/test_multi_format_exports.mjs` around reusable `assertCanonicalResultShape(...)` and `assertEntryPointParity(...)` helpers.
- Added field-level contract assertions for `sourceFormat`, `rootNodes`, `geometries`, `materials`, `warnings`, `stats`, `sourceUnit`, and `unitScaleToMeters`.
- Proved that `ReadStepFile`, `ReadIgesFile`, and `ReadBrepFile` match `ReadFile(...)` on the same STEP, IGES, and BREP fixtures.
- Rebuilt the Wasm artifacts and reran the parity test against fresh `dist/` output.

## Task Commits

Each task was committed atomically:

1. **Task 1: Lock direct-vs-generic canonical payload parity for STEP, IGES, and BREP** - shipped in this plan's completion commit
2. **Task 2: Keep the Wasm bindings on one canonical success-payload builder** - verified without source changes because `src/js-interface.cpp` already routes successful imports through `BuildResult(...)`

## Files Created/Modified

- `test/test_multi_format_exports.mjs` - Added canonical payload helpers, direct-vs-generic signature parity checks, and broader topology validation across baseline fixtures.
- `.planning/phases/02-root-runtime-contract/02-01-SUMMARY.md` - Recorded the plan outcome and verification evidence.

## Decisions Made

- Strengthened the contract at the test layer first and kept `src/js-interface.cpp` unchanged because the current implementation already uses one normalized `ReadByFormat(...)` dispatcher plus `BuildResult(...)`.
- Elevated unit metadata from an incidental detail to an explicit contract pair so downstream callers can rely on consistent presence semantics.

## Deviations from Plan

- No `src/js-interface.cpp` changes were necessary. The planner allowed for minimal binding updates only if the new parity assertions exposed drift, and they did not.

## Issues Encountered

None.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- `02-01` now gives Phase 02 a canonical import-payload regression guard for the root Wasm API.
- The next execution target is `02-02`, which can focus on explicit root-mode and unit-metadata semantics without revisiting entrypoint parity.

---
*Phase: 02-root-runtime-contract*
*Completed: 2026-04-14*
