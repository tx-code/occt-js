---
phase: 12-root-alpha-opacity-fallback
plan: "01"
subsystem: runtime-core
tags: [wasm, import, appearance, opacity, occt]
requires:
  - phase: 11-appearance-governance-downstream-contract
    provides: stable root appearance contract and release governance baseline
provides:
  - Explicit root `defaultOpacity` parsing for default appearance mode
  - Additive raw `opacity` payloads on root colors and materials
  - Stateless root contract coverage for opacity fallback across built-in and custom default colors
affects: [phase-12, phase-13, release, downstream-consumers]
tech-stack:
  added: []
  patterns: [runtime-owned-opacity-fallback, additive-raw-dto-extension]
key-files:
  created:
    - .planning/phases/12-root-alpha-opacity-fallback/12-01-SUMMARY.md
  modified:
    - dist/occt-js.d.ts
    - src/importer.hpp
    - src/js-interface.cpp
    - src/importer-xde.cpp
    - src/importer-brep.cpp
    - test/import_appearance_contract.test.mjs
key-decisions:
  - "Add a separate `defaultOpacity` root input instead of overloading `defaultColor` with alpha."
  - "Expose opacity additively on raw root DTOs so v1.2 RGB-only consumers remain compatible."
patterns-established:
  - "Default appearance policy can extend through the shared root import path without introducing a second importer lane."
  - "Raw Wasm DTOs can grow optional appearance fields while keeping older contract shapes valid."
requirements-completed: [APPR-06]
duration: 18min
completed: 2026-04-15
---

# Phase 12 Plan 01 Summary

**The root Wasm carrier now accepts explicit default-opacity fallback and can expose that policy directly on raw colors and materials without downstream repaint work.**

## Performance

- **Duration:** 18 min
- **Started:** 2026-04-15T22:01:00+08:00
- **Completed:** 2026-04-15T22:19:00+08:00
- **Tasks:** 2
- **Files modified:** 6

## Accomplishments

- Added root contract coverage proving that `defaultOpacity` drives raw appearance opacity only when `colorMode: "default"` is selected.
- Added `defaultOpacity?: number` to the public root import params and widened raw `OcctJSColor` / `OcctJSMaterial` with additive `opacity?: number`.
- Extended `OcctColor`, `ImportParams`, and the shared binding/import path so STEP, IGES, and BREP can reuse one runtime-owned default-opacity policy.

## Task Commits

Both plan tasks landed in the same root runtime patch once the red contract tests were in place:

1. **Task 1: Add failing root tests for explicit defaultOpacity semantics** - `f26db01` (`feat`)
2. **Task 2: Parse defaultOpacity and expose additive raw opacity on the root carrier** - `f26db01` (`feat`)

## Files Created/Modified

- `test/import_appearance_contract.test.mjs` - Added stateless root opacity-fallback coverage and upgraded appearance signatures so opacity becomes part of the contract surface.
- `src/importer.hpp` - Added explicit default-opacity state and helper resolution on the shared import params path.
- `src/js-interface.cpp` - Added `defaultOpacity` parsing plus additive raw `opacity` serialization on colors/materials.
- `src/importer-xde.cpp` - Reused the shared default-appearance helpers for STEP/IGES fallback opacity.
- `src/importer-brep.cpp` - Reused the same default-appearance helpers for BREP fallback opacity.
- `dist/occt-js.d.ts` - Published `defaultOpacity` and additive raw `opacity` typing comments.

## Decisions Made

- Kept `defaultColor` RGB-only and introduced `defaultOpacity` as a separate field to avoid silently redefining the shipped v1.2 contract.
- Made raw `opacity` optional rather than unconditional so callers that only understand RGB objects remain compatible.

## Deviations from Plan

None. The minimal root-only implementation was enough to satisfy the stateless opacity contract without introducing new viewer or adapter work.

## Issues Encountered

No implementation blockers surfaced once the new root tests were in place. The main change was threading opacity through the existing default-appearance seam instead of inventing a parallel material pipeline.

## User Setup Required

None.

## Next Phase Readiness

- `12-02` can now harden read/openExact parity and compatibility on top of the shipped root opacity contract.
- Phase 13 can build on a stable root `defaultOpacity` surface while introducing preset and adapter parity work later.

---
*Phase: 12-root-alpha-opacity-fallback*
*Completed: 2026-04-15*
