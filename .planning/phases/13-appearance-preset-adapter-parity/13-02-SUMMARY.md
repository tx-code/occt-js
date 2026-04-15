---
phase: 13-appearance-preset-adapter-parity
plan: "02"
subsystem: adapter-contract
tags: [occt-core, import, appearance, presets, opacity, downstream]
requires:
  - phase: 13-appearance-preset-adapter-parity
    provides: stable root appearancePreset/defaultOpacity contract
provides:
  - Canonical preset/defaultOpacity forwarding from `@tx-code/occt-core` to the root carrier
  - Preservation of raw root object-form `opacity` during adapter normalization
  - Live parity coverage for preset imports through the built root carrier
affects: [phase-13, phase-14, release, downstream-consumers]
tech-stack:
  added: []
  patterns: [adapter-preset-normalization, raw-opacity-preservation, live-root-parity]
key-files:
  created:
    - .planning/phases/13-appearance-preset-adapter-parity/13-02-SUMMARY.md
  modified:
    - packages/occt-core/src/occt-core.js
    - packages/occt-core/src/model-normalizer.js
    - packages/occt-core/test/core.test.mjs
    - packages/occt-core/test/live-root-integration.test.mjs
key-decisions:
  - "Normalize caller-friendly alpha on `defaultColor` into canonical root `defaultOpacity` when the caller did not pass one explicitly."
  - "Treat root raw object-form `opacity` as the adapter's alpha channel so normalized RGBA output stays faithful to the runtime."
patterns-established:
  - "Adapter convenience can extend the root appearance contract as long as forwarded params stay canonical."
  - "Normalized output must preserve the raw runtime appearance signal rather than synthesizing its own alpha semantics."
requirements-completed: [ADAPT-05]
duration: 13min
completed: 2026-04-15
---

# Phase 13 Plan 02 Summary

**`@tx-code/occt-core` now preserves the expanded preset/opacity contract instead of dropping root appearance information during normalization.**

## Performance

- **Duration:** 13 min
- **Started:** 2026-04-15T22:46:00+08:00
- **Completed:** 2026-04-15T22:59:00+08:00
- **Tasks:** 2
- **Files modified:** 4

## Accomplishments

- Added adapter tests proving canonical forwarding for `appearancePreset` / `defaultOpacity`, plus alpha promotion from caller-friendly `defaultColor` values when explicit `defaultOpacity` is absent.
- Updated normalization so root raw object-form `opacity` now survives into normalized RGBA `baseColor` and geometry/face/edge colors.
- Added a live integration test proving `createOcctCore(...).importModel(...)` can drive `cad-ghosted` through the built root carrier end-to-end.

## Task Commits

Both adapter tasks landed in the same parity patch:

1. **Task 1: Add failing adapter tests for preset forwarding and opacity preservation** - `b721405` (`feat`)
2. **Task 2: Implement occt-core preset normalization and live parity with the root runtime** - `b721405` (`feat`)

## Files Created/Modified

- `packages/occt-core/src/occt-core.js` - Added preset/defaultOpacity normalization and alpha promotion into canonical root params.
- `packages/occt-core/src/model-normalizer.js` - Preserved object-form `opacity` and taught fallback synthesis about preset-derived appearance context.
- `packages/occt-core/test/core.test.mjs` - Added adapter-level preset/defaultOpacity forwarding and raw opacity preservation coverage.
- `packages/occt-core/test/live-root-integration.test.mjs` - Added a built-root preset parity test for `cad-ghosted`.

## Decisions Made

- Kept the adapter forwarding root-shaped params instead of inventing package-only preset aliases.
- Preserved explicit `defaultOpacity` precedence over alpha derived from caller-friendly `defaultColor`.

## Deviations from Plan

None. The adapter work stayed inside `packages/occt-core` and did not require reopening root runtime files after `13-01`.

## Issues Encountered

- The one failing assertion after the initial adapter patch was an old expectation that no longer accounted for alpha promotion into `defaultOpacity`. Tightening that expectation was the correct contract fix, not a regression.

## User Setup Required

None.

## Next Phase Readiness

- Phase 14 can now focus on docs, typings commentary, tarball checks, and release governance for the final preset/opacity contract.
- Downstream apps can already treat presets as import-time settings while keeping persistence/UI decisions on the app side.

---
*Phase: 13-appearance-preset-adapter-parity*
*Completed: 2026-04-15*
