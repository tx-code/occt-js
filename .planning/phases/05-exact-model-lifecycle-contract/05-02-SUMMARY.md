---
phase: 05-exact-model-lifecycle-contract
plan: "02"
subsystem: runtime-contract
tags: [wasm, lifecycle, exact-model, occt-core]
requires:
  - phase: 05-exact-model-lifecycle-contract
    provides: retained exact-model handles and root exact open/release APIs
provides:
  - Typed public lifecycle DTOs on the root package surface
  - Thin `occt-core` exact-model open/retain/release wrappers
  - Root and live downstream verification for invalid-after-release behavior
affects: [phase-05, phase-06, phase-08, occt-core]
tech-stack:
  added: []
  patterns: [thin-downstream-adapter, explicit-lifecycle-dto, runtime-first-verification]
key-files:
  created:
    - .planning/phases/05-exact-model-lifecycle-contract/05-02-SUMMARY.md
  modified:
    - dist/occt-js.d.ts
    - package.json
    - packages/occt-core/src/occt-core.js
    - packages/occt-core/test/core.test.mjs
    - packages/occt-core/test/live-root-integration.test.mjs
    - test/exact_model_lifecycle_contract.test.mjs
key-decisions:
  - "Keep `occt-core` lifecycle helpers thin so downstream JS can consume the root exact lane without losing explicit `invalid-handle` and `released-handle` semantics."
  - "Make invalid-after-release behavior part of the normal root `npm test` suite rather than a one-off lifecycle smoke path."
patterns-established:
  - "Exact-model lifecycle behavior is now locked simultaneously at the root typings layer, the thin downstream adapter layer, and the normal runtime verification layer."
  - "Runtime-first contract tests stay authoritative even when downstream adapters add convenience helpers."
requirements-completed: [LIFE-02]
duration: 10min
completed: 2026-04-14
---

# Phase 05 Plan 02 Summary

**The exact-model lifecycle contract is now fully typed, exposed through `occt-core`, and verified through both root and live downstream test paths.**

## Performance

- **Duration:** 10 min
- **Started:** 2026-04-14T22:42:12+08:00
- **Completed:** 2026-04-14T22:52:23+08:00
- **Tasks:** 2
- **Files modified:** 6

## Accomplishments

- Added public lifecycle types on `dist/occt-js.d.ts` and thin `occt-core` helpers for exact open, retain, and release operations.
- Added stub-based `occt-core` coverage for format dispatch, convenience exact open helpers, and lifecycle DTO pass-through behavior.
- Locked invalid-after-release behavior in root lifecycle tests, added a live `occt-core` exact open/dispose smoke test, and wired the lifecycle suite into the root `npm test` command.

## Task Commits

Each task was committed atomically:

1. **Task 1: Harden the public lifecycle typing surface and thin occt-core adapter** - `69d8cdc` (`feat`)
2. **Task 2: Lock invalid-after-release behavior in root and live downstream verification** - `36b3285` (`test`)

## Files Created/Modified

- `dist/occt-js.d.ts` - Added `OcctJSExactOpenResult`, lifecycle DTO types, and exact lifecycle module signatures.
- `packages/occt-core/src/occt-core.js` - Added `openExactModel`, `openExactStep`, `openExactIges`, `openExactBrep`, `retainExactModel`, and `releaseExactModel`.
- `packages/occt-core/test/core.test.mjs` - Added stub-based exact lifecycle wrapper tests for direct dispatch, generic fallback, convenience helpers, and DTO pass-through.
- `test/exact_model_lifecycle_contract.test.mjs` - Added retained-handle, released/unknown-handle, and stateless `ReadFile` lifecycle contract coverage.
- `packages/occt-core/test/live-root-integration.test.mjs` - Added a live exact open/dispose smoke test through the built root carrier.
- `package.json` - Added the lifecycle contract suite to the normal root `npm test` chain.

## Decisions Made

- Kept exact lifecycle open results unnormalized in `occt-core` so downstream consumers can access `exactModelId` and raw runtime semantics directly.
- Treated `package.json` script wiring as part of the contract surface, so lifecycle regressions run by default with the rest of the root runtime suite.

## Deviations from Plan

None. The runtime semantics from `05-01` already satisfied the new contract tests, so Task 2 focused on locking them into the standard verification path.

## Issues Encountered

No new runtime issues surfaced during `05-02`; the stronger lifecycle and live-carrier tests passed once the new wrapper and typing surface were in place.

## User Setup Required

None.

## Next Phase Readiness

- Phase 06 can now build occurrence-scoped exact refs on top of retained `exactModelId` handles instead of introducing a second viewer-specific lifecycle.
- The root and `occt-core` lifecycle boundary is stable enough for exact face/edge/vertex ref mapping work.

---
*Phase: 05-exact-model-lifecycle-contract*
*Completed: 2026-04-14*
