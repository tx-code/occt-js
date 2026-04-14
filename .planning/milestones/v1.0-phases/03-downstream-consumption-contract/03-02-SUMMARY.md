---
phase: 03-downstream-consumption-contract
plan: "02"
subsystem: occt-core
tags: [tests, adapter, normalization, downstream, wasm]
requires:
  - phase: 03-downstream-consumption-contract
    provides: explicit packed root-package contract and Wasm carrier entrypoints
provides:
  - Explicit `@tx-code/occt-core` adapter contract coverage for factory setup, format resolution, and normalized DTO output
  - Canonical normalization for legacy face/edge payloads and 0-255 colors
  - Clear missing-format failure semantics for downstream imports
affects: [phase-03, downstream-consumers, packages]
tech-stack:
  added: []
  patterns: [package-first-adapter-contract, canonical-legacy-normalization]
key-files:
  created:
    - .planning/phases/03-downstream-consumption-contract/03-02-SUMMARY.md
  modified:
    - packages/occt-core/test/core.test.mjs
    - packages/occt-core/src/occt-core.js
    - packages/occt-core/src/model-normalizer.js
key-decisions:
  - "Missing import format is now an explicit downstream error instead of silently defaulting to STEP."
  - "Legacy face and edge payloads normalize into the same canonical DTO shape used by the modern root Wasm contract."
patterns-established:
  - "`createOcctCore(...)` accepts `wasmBinary` or `wasmBinaryLoader` and normalizes the bytes before factory init."
requirements-completed: [CONS-02]
duration: 14min
completed: 2026-04-14
---

# Phase 03: 03-02 Summary

**`@tx-code/occt-core` is now explicitly verified as the engine-agnostic downstream adapter over the root Wasm carrier.**

## Performance

- **Duration:** 14 min
- **Started:** 2026-04-14T20:15:00+08:00
- **Completed:** 2026-04-14T20:28:54+08:00
- **Tasks:** 2
- **Files modified:** 4

## Accomplishments

- Expanded `packages/occt-core/test/core.test.mjs` into a downstream contract suite covering `factory`, `factoryGlobalName`, `wasmBinary`, `wasmBinaryLoader`, file-name inference, missing-format rejection, unit metadata semantics, warning normalization, and legacy DTO normalization.
- Tightened `packages/occt-core/src/occt-core.js` so downstream callers must provide either `format` or `fileName`, and so all supported `wasmBinary` inputs normalize to the correct byte view before factory initialization.
- Fixed `packages/occt-core/src/model-normalizer.js` so 0-255 RGB arrays keep alpha at `1` unless alpha is explicitly provided, legacy face ranges normalize into canonical face DTOs, and legacy edge payloads become structured edge objects with points and ownership metadata.
- Kept `resolveAutoOrientedModel(...)` package-first and Babylon-independent by verifying it without widening the implementation surface.

## Task Commits

Each task was committed atomically:

1. **Task 1: Turn the `occt-core` adapter and normalized DTO into an explicit package contract** - shipped in commit `c801af5`
2. **Task 2: Make the adapter and normalizer behavior internally consistent for downstream use** - shipped in commit `c801af5`

## Files Created/Modified

- `packages/occt-core/test/core.test.mjs` - Added downstream contract coverage for factory setup, format inference, normalization consistency, and legacy-payload regression cases.
- `packages/occt-core/src/occt-core.js` - Normalized `wasmBinary` handling and made missing-format semantics explicit.
- `packages/occt-core/src/model-normalizer.js` - Fixed color scaling, canonicalized legacy faces/edges, and emitted unit metadata only when present.
- `.planning/phases/03-downstream-consumption-contract/03-02-SUMMARY.md` - Recorded the plan outcome and verification evidence.

## Decisions Made

- Removed the implicit STEP fallback because silent guessing is unsafe for downstream consumers that vendor the package into larger applications.
- Normalized legacy face and edge structures into the canonical DTO shape rather than preserving mixed historical payload variants.

## Deviations from Plan

- No `packages/occt-core/src/orientation.js` changes were needed. The added contract suite confirmed the convenience wrapper already stayed within the intended engine-agnostic boundary.

## Issues Encountered

None.

## User Setup Required

None.

## Next Phase Readiness

- `03-02` now gives Phase 03 a stable adapter layer on top of the packed root Wasm carrier.
- The next execution target is `03-03`, which aligns docs and repo-level guardrails with the verified package contract.

---
*Phase: 03-downstream-consumption-contract*
*Completed: 2026-04-14*
