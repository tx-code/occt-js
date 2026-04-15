---
phase: 10-custom-default-color-adapter-parity
plan: "02"
subsystem: adapter-contract
tags: [occt-core, import, appearance, normalization, downstream]
requires:
  - phase: 10-custom-default-color-adapter-parity
    provides: root `defaultColor` contract and read/exact parity
provides:
  - Canonical `defaultColor` forwarding from `@tx-code/occt-core` to the root carrier
  - Conditional fallback-material synthesis based on explicit appearance context
  - Live parity tests for custom default colors through the built root carrier
affects: [phase-10, phase-11, release, downstream-consumers]
tech-stack:
  added: []
  patterns: [adapter-param-normalization, explicit-fallback-policy, live-root-parity]
key-files:
  created:
    - .planning/phases/10-custom-default-color-adapter-parity/10-02-SUMMARY.md
  modified:
    - packages/occt-core/src/occt-core.js
    - packages/occt-core/src/model-normalizer.js
    - packages/occt-core/test/core.test.mjs
    - packages/occt-core/test/live-root-integration.test.mjs
key-decisions:
  - "Normalize caller-friendly tuple/object colors in `occt-core`, but keep the forwarded root contract canonical and object-shaped."
  - "Only synthesize fallback materials when explicit default appearance was requested; otherwise preserve colorless runtime output."
patterns-established:
  - "Adapter convenience can coexist with a strict runtime contract as long as normalization happens before forwarding."
  - "Normalized material stats must reflect the adapter output, not stale raw runtime counters."
requirements-completed: [ADAPT-03]
duration: 39min
completed: 2026-04-15
---

# Phase 10 Plan 02 Summary

**`@tx-code/occt-core` now forwards a canonical appearance contract and no longer hides colorless runtime output behind unconditional fallback materials.**

## Performance

- **Duration:** 39 min
- **Started:** 2026-04-15T20:54:00+08:00
- **Completed:** 2026-04-15T21:33:00+08:00
- **Tasks:** 2
- **Files modified:** 4

## Accomplishments

- Added adapter tests proving that tuple/object `defaultColor` input is normalized before it reaches the root carrier.
- Changed normalized fallback-material behavior so explicit `colorMode: "default"` keeps producing a caller-driven default color, while legacy/source appearance paths stay colorless when the raw payload is colorless.
- Added a live integration test proving `createOcctCore(...).importModel(...)` can drive custom default colors end-to-end through the built root carrier.

## Task Commits

Both adapter tasks landed in the same parity patch:

1. **Task 1: Add failing adapter tests for appearance param normalization and conditional fallback behavior** - `c30aa47` (`feat`)
2. **Task 2: Implement occt-core appearance normalization and live parity with the root runtime** - `c30aa47` (`feat`)

## Files Created/Modified

- `packages/occt-core/src/occt-core.js` - Added caller-friendly `defaultColor` normalization before forwarding to root `Read*` and `OpenExact*` methods.
- `packages/occt-core/src/model-normalizer.js` - Made fallback-material synthesis depend on explicit appearance context and aligned `stats.materialCount` to normalized output.
- `packages/occt-core/test/core.test.mjs` - Added adapter-level forwarding and fallback-policy coverage.
- `packages/occt-core/test/live-root-integration.test.mjs` - Added built-root parity coverage for custom default colors through `createOcctCore`.

## Decisions Made

- Left `core.openExactModel(...)` returning the raw runtime result; the adapter still normalizes import-time params without hiding the exact lane.
- Kept backward-compat fallback behavior only for normalization paths that have no explicit appearance context at all.

## Deviations from Plan

`packages/occt-core/src/exact-model-normalizer.js` did not need code changes because it already forwards the full `options` object into `normalizeOcctResult(...)`, so the new appearance-context policy applies there automatically.

## Issues Encountered

- The first green pass exposed one secondary drift: normalized material synthesis succeeded, but `stats.materialCount` still reflected stale raw runtime counters. Fixing that kept adapter stats aligned with normalized output.

## User Setup Required

None.

## Next Phase Readiness

- Phase 11 can now focus on docs, typings, packaging guidance, and governance without reopening the runtime or adapter semantics.
- Downstream apps can already treat import appearance as an import-time setting surface and leave persistence/UI concerns on the app side.

---
*Phase: 10-custom-default-color-adapter-parity*
*Completed: 2026-04-15*
