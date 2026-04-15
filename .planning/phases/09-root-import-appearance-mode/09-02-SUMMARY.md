---
phase: 09-root-import-appearance-mode
plan: "02"
subsystem: runtime-contract
tags: [wasm, import, appearance, exact-open, compatibility]
requires:
  - phase: 09-root-import-appearance-mode
    provides: explicit import appearance mode and built-in default CAD color handling
provides:
  - Explicit precedence between legacy `readColors` and `colorMode`
  - Exact-open appearance parity with stateless read lanes
  - Standard root test coverage for appearance behavior in `npm test`
affects: [phase-09, phase-10, phase-11, release]
tech-stack:
  added: []
  patterns: [legacy-option-precedence, exact-read-parity, default-runtime-contract-tests]
key-files:
  created:
    - .planning/phases/09-root-import-appearance-mode/09-02-SUMMARY.md
  modified:
    - test/import_appearance_contract.test.mjs
    - dist/occt-js.d.ts
    - package.json
key-decisions:
  - "Treat `readColors` as a legacy toggle that remains authoritative only when `colorMode` is omitted."
  - "Wire the appearance contract test into the normal root `npm test` suite instead of leaving it as a manual one-off."
patterns-established:
  - "New import options can coexist with legacy params as long as precedence is typed and regression-tested."
  - "Exact-open lane parity is locked by comparing its appearance payload directly against the stateless read lane."
requirements-completed: [APPR-05]
duration: 19min
completed: 2026-04-15
---

# Phase 09 Plan 02 Summary

**Legacy `readColors` compatibility and exact-open appearance parity are now explicit, typed, and part of the default root runtime test chain.**

## Performance

- **Duration:** 19 min
- **Started:** 2026-04-15T19:42:00+08:00
- **Completed:** 2026-04-15T20:01:00+08:00
- **Tasks:** 2
- **Files modified:** 3

## Accomplishments

- Added contract coverage proving that `readColors: false` stays colorless when `colorMode` is omitted.
- Added precedence coverage proving that explicit `colorMode` overrides legacy `readColors`, and added exact-open parity checks across STEP, IGES, and BREP.
- Documented precedence on the public typings surface and wired the appearance contract suite into the standard `npm test` command.

## Task Commits

The compatibility and parity hardening rode on the same runtime contract patch that introduced the appearance mode:

1. **Task 1: Lock legacy `readColors` compatibility and explicit precedence in root tests** - `681cab3` (`feat`)
2. **Task 2: Lock read/openExact appearance parity and standardize the root test entrypoint** - `681cab3` (`feat`)

## Files Created/Modified

- `test/import_appearance_contract.test.mjs` - Added legacy colorless behavior, explicit precedence, and exact-open parity coverage.
- `dist/occt-js.d.ts` - Added precedence comments documenting `readColors` as legacy-only when `colorMode` is present.
- `package.json` - Added the appearance contract suite to the standard root `npm test` command.

## Decisions Made

- Kept the precedence rule minimal: explicit `colorMode` wins, otherwise legacy `readColors` stays deterministic.
- Used the same root test file for read-lane and exact-open appearance coverage so the contract is defined once instead of duplicated across multiple suites.

## Deviations from Plan

None. The runtime implementation from `09-01` already supported the required precedence and parity behavior once the broader tests were added.

## Issues Encountered

No new runtime issues surfaced during `09-02`; the expanded compatibility and exact-open tests passed on the first verification run after the root appearance-mode implementation landed.

## User Setup Required

None.

## Next Phase Readiness

- Phase 10 can build on a stable root precedence rule while adding caller-provided `defaultColor` overrides and `occt-core` forwarding parity.
- Phase 11 can treat the new appearance suite and typing comments as the baseline governance surface for docs and release checks.

---
*Phase: 09-root-import-appearance-mode*
*Completed: 2026-04-15*
