---
phase: 13-appearance-preset-adapter-parity
plan: "01"
subsystem: runtime-contract
tags: [wasm, import, appearance, presets, exact-open]
requires:
  - phase: 12-root-alpha-opacity-fallback
    provides: explicit root defaultOpacity contract and additive raw opacity payloads
provides:
  - Named root appearance presets on top of the shipped primitive appearance contract
  - Preset-driven read/openExact parity across STEP, IGES, and BREP
  - Explicit precedence coverage for preset defaults versus caller overrides
affects: [phase-13, phase-14, release, downstream-consumers]
tech-stack:
  added: []
  patterns: [runtime-owned-appearance-presets, preset-to-primitive-resolution]
key-files:
  created:
    - .planning/phases/13-appearance-preset-adapter-parity/13-01-SUMMARY.md
  modified:
    - dist/occt-js.d.ts
    - src/importer.hpp
    - src/js-interface.cpp
    - test/import_appearance_contract.test.mjs
key-decisions:
  - "Keep presets enum-like and runtime-owned instead of introducing rich preset descriptors in Phase 13."
  - "Resolve presets into the existing default-appearance primitives so explicit `colorMode`, `defaultColor`, and `defaultOpacity` can still override them."
patterns-established:
  - "Preset strings are just a convenience layer over the root appearance contract, not a second import pipeline."
  - "Read and exact-open parity for new appearance options is locked by comparing raw appearance payloads directly."
requirements-completed: [APPR-07, APPR-08]
duration: 24min
completed: 2026-04-15
---

# Phase 13 Plan 01 Summary

**The root Wasm carrier now supports named appearance presets while preserving the shipped primitive contract and exact-open parity.**

## Performance

- **Duration:** 24 min
- **Started:** 2026-04-15T22:22:00+08:00
- **Completed:** 2026-04-15T22:46:00+08:00
- **Tasks:** 2
- **Files modified:** 4

## Accomplishments

- Added `appearancePreset` typing on the public root import surface, with a small enum-like contract for `cad-solid` and `cad-ghosted`.
- Resolved presets on the shared root import-param path so `Read*` and `OpenExact*` pick up the same preset semantics automatically.
- Added root contract coverage proving that `cad-solid` matches the shipped explicit default appearance, `cad-ghosted` adds the built-in ghost opacity, and explicit appearance params still override preset-derived defaults.

## Task Commits

Both root preset tasks landed together once the red contract tests were in place:

1. **Task 1: Add failing root tests for named preset mapping and parity** - `1edde7f` (`feat`)
2. **Task 2: Parse root presets and resolve them through the shared appearance contract** - `1edde7f` (`feat`)

## Files Created/Modified

- `test/import_appearance_contract.test.mjs` - Added root preset mapping, parity, and precedence coverage.
- `src/importer.hpp` - Added the runtime-owned ghosted preset opacity constant.
- `src/js-interface.cpp` - Added preset parsing and resolution on the shared import path.
- `dist/occt-js.d.ts` - Exposed `OcctJSImportAppearancePreset` and `appearancePreset` on the root public contract.

## Decisions Made

- Kept `cad-solid` as an alias for the existing default appearance behavior so it does not widen the raw payload with unnecessary `opacity: 1`.
- Kept `cad-ghosted` as a thin bundle over the existing default appearance primitives rather than inventing preset-only output semantics.

## Deviations from Plan

None. The preset contract stayed root-scoped and did not expand into adapter or docs work.

## Issues Encountered

No runtime blockers surfaced. The only non-trivial design choice was making sure preset defaults stay overrideable by the shipped primitive fields.

## User Setup Required

None.

## Next Phase Readiness

- `13-02` can now normalize and forward presets through `@tx-code/occt-core` against a stable root contract.
- Phase 14 can later document and govern the final preset/opacity shape without reopening root runtime behavior.

---
*Phase: 13-appearance-preset-adapter-parity*
*Completed: 2026-04-15*
