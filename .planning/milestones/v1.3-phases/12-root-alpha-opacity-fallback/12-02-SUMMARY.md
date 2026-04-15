---
phase: 12-root-alpha-opacity-fallback
plan: "02"
subsystem: runtime-contract
tags: [wasm, import, appearance, opacity, exact-open, compatibility]
requires:
  - phase: 12-root-alpha-opacity-fallback
    provides: root `defaultOpacity` contract and additive raw opacity serialization
provides:
  - Exact-open parity for `defaultOpacity` across STEP, IGES, and BREP
  - Deterministic compatibility for source-mode and legacy no-`colorMode` calls
  - Full root release-gate verification covering the expanded opacity contract
affects: [phase-12, phase-13, release]
tech-stack:
  added: []
  patterns: [exact-read-opacity-parity, explicit-legacy-compatibility]
key-files:
  created:
    - .planning/phases/12-root-alpha-opacity-fallback/12-02-SUMMARY.md
  modified:
    - test/import_appearance_contract.test.mjs
key-decisions:
  - "Keep `defaultOpacity` behavior on the same root test surface as `colorMode` and `defaultColor` so precedence is defined once."
  - "Treat the shared import path as the source of truth for exact-open parity instead of adding exact-specific appearance logic."
patterns-established:
  - "Expanded appearance options are complete only when stateless and exact-open payloads compare equal under the same params."
  - "Compatibility hardening can ride on the same runtime patch when the shared root implementation already satisfies the broader contract."
requirements-completed: [APPR-06]
duration: 10min
completed: 2026-04-15
---

# Phase 12 Plan 02 Summary

**`defaultOpacity` now stays explicit and deterministic across read/exact lanes, colorless fixtures, and legacy/source compatibility paths.**

## Performance

- **Duration:** 10 min
- **Started:** 2026-04-15T22:19:00+08:00
- **Completed:** 2026-04-15T22:29:00+08:00
- **Tasks:** 2
- **Files modified:** 1

## Accomplishments

- Added exact-open parity coverage proving that direct and generic `OpenExact*` APIs return the same opacity-bearing appearance payload as the stateless read lane.
- Added compatibility coverage proving that `defaultOpacity` stays inert for `colorMode: "source"` and legacy no-`colorMode` imports.
- Re-ran the canonical root release gate to verify the expanded opacity contract inside the authoritative package/runtime workflow.

## Task Commits

Both hardening tasks rode on the same runtime contract patch:

1. **Task 1: Add failing root tests for opacity parity and compatibility across read/exact lanes** - `f26db01` (`feat`)
2. **Task 2: Harden shared root serialization and cross-format parity for defaultOpacity** - `f26db01` (`feat`)

## Files Created/Modified

- `test/import_appearance_contract.test.mjs` - Added exact-open parity and source/legacy compatibility coverage for `defaultOpacity`.

## Decisions Made

- Kept parity enforcement in the same root contract suite instead of splitting opacity behavior into a second test surface.
- Accepted that `12-02` required no new production patch beyond `12-01`; the shared root import path already delivered the needed exact-open behavior once the broader tests were written.

## Deviations from Plan

No production code changes were required during `12-02`. The expanded parity and compatibility tests passed on the first run after the `12-01` runtime patch.

## Issues Encountered

None. The only meaningful work in `12-02` was broadening the contract coverage and re-running the full root release gate.

## User Setup Required

None.

## Next Phase Readiness

- Phase 13 can assume a stable root color-plus-opacity contract and focus on named presets plus `@tx-code/occt-core` parity.
- Phase 14 can later harden docs, typings, tarball checks, and governance around the expanded appearance surface without reopening runtime semantics.

---
*Phase: 12-root-alpha-opacity-fallback*
*Completed: 2026-04-15*
