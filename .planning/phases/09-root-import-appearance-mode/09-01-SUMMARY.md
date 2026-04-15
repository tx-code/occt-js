---
phase: 09-root-import-appearance-mode
plan: "01"
subsystem: runtime-core
tags: [wasm, import, appearance, colors, occt]
requires:
  - phase: 08-pairwise-measurement-contract-hardening
    provides: stable retained exact/read lanes and root runtime verification
provides:
  - Explicit root import appearance mode parsing for source/default color behavior
  - Built-in default CAD color handling inside STEP/IGES/BREP importers
  - Root contract tests for default-color imports across colored and colorless fixtures
affects: [phase-09, phase-10, release, downstream-consumers]
tech-stack:
  added: []
  patterns: [import-time-appearance-contract, runtime-owned-default-color]
key-files:
  created:
    - .planning/phases/09-root-import-appearance-mode/09-01-SUMMARY.md
    - test/import_appearance_contract.test.mjs
  modified:
    - src/importer.hpp
    - src/js-interface.cpp
    - src/importer-xde.cpp
    - src/importer-brep.cpp
    - dist/occt-js.d.ts
key-decisions:
  - "Make default CAD color an import-time runtime concern instead of a viewer-side repaint step."
  - "Align the built-in root default CAD color with the existing `occt-core` fallback RGB `[0.9, 0.91, 0.93]`."
patterns-established:
  - "Root import params can introduce explicit appearance behavior without reshaping the scene payload contract."
  - "Color-bearing and colorless formats now converge through the same runtime-owned default-color path."
requirements-completed: [APPR-01, APPR-02]
duration: 32min
completed: 2026-04-15
---

# Phase 09 Plan 01 Summary

**The root wasm carrier now understands an explicit import appearance mode and can collapse imported output onto one built-in CAD color across STEP, IGES, and BREP.**

## Performance

- **Duration:** 32 min
- **Started:** 2026-04-15T19:10:00+08:00
- **Completed:** 2026-04-15T19:42:00+08:00
- **Tasks:** 2
- **Files modified:** 6

## Accomplishments

- Added `colorMode: "source" | "default"` parsing on the shared root import params path used by both read and exact-open entrypoints.
- Added runtime-owned default-color helpers on `ImportParams` and applied them inside the XDE and BREP importers.
- Added root contract coverage proving that `colorMode: "default"` collapses both colored STEP imports and colorless IGES/BREP imports onto the built-in CAD color.

## Task Commits

The implementation for both plan tasks landed together once the red contract tests were in place:

1. **Task 1: Add a failing root appearance contract test for explicit default-color imports** - `681cab3` (`feat`)
2. **Task 2: Implement root appearance-mode parsing and built-in default CAD color handling** - `681cab3` (`feat`)

## Files Created/Modified

- `test/import_appearance_contract.test.mjs` - Added root appearance contract coverage for source-vs-default behavior and colorless fixture fallback.
- `src/importer.hpp` - Added import appearance mode and built-in default CAD color helpers.
- `src/js-interface.cpp` - Added `colorMode` parsing on the shared root import param path.
- `src/importer-xde.cpp` - Routed STEP/IGES source-color loading and exported mesh/face colors through the new appearance contract.
- `src/importer-brep.cpp` - Added default-color assignment for BREP imports that have no source colors.
- `dist/occt-js.d.ts` - Exposed the public `colorMode` option on root read params.

## Decisions Made

- Kept the built-in default color fixed in Phase 9 and deferred caller-provided overrides to Phase 10.
- Applied default colors during import rather than in result normalization so exact-open and stateless read lanes can stay in parity.

## Deviations from Plan

None. The implementation matched the planned root/runtime scope and deliberately stopped short of `defaultColor` overrides or `occt-core` forwarding work.

## Issues Encountered

No implementation blockers surfaced once the failing appearance contract tests were in place.

## User Setup Required

None.

## Next Phase Readiness

- `09-02` can now harden legacy `readColors` precedence and exact-open parity on top of the new explicit appearance mode.
- Phase 10 can extend the same runtime contract with caller-provided `defaultColor` overrides instead of inventing a second color pipeline.

---
*Phase: 09-root-import-appearance-mode*
*Completed: 2026-04-15*
