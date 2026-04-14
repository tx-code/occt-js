---
phase: 06-occurrence-scoped-exact-ref-mapping
plan: "02"
subsystem: occt-core
tags: [occt-core, exact-ref, occurrence, adapter]
requires:
  - phase: 06-occurrence-scoped-exact-ref-mapping
    provides: root exact-definition bindings aligned to exported geometries
provides:
  - `normalizeExactOpenResult(...)` for geometry-id keyed exact binding normalization
  - `resolveExactElementRef(...)` and convenience helpers for occurrence-scoped exact refs
  - Unit, live-carrier, and root-suite coverage for repeated-geometry occurrence semantics
affects: [phase-06, phase-07, phase-08, occt-core]
tech-stack:
  added: []
  patterns: [pure-exact-normalizer, occurrence-scoped-ref-resolution, explicit-ref-failure-dto]
key-files:
  created:
    - .planning/phases/06-occurrence-scoped-exact-ref-mapping/06-02-SUMMARY.md
    - packages/occt-core/src/exact-model-normalizer.js
    - packages/occt-core/src/exact-ref-resolver.js
    - packages/occt-core/test/exact-ref-resolver.test.mjs
  modified:
    - package.json
    - packages/occt-core/src/index.js
    - packages/occt-core/test/live-root-integration.test.mjs
key-decisions:
  - "Keep Phase 5 `openExactModel` thin; add exact normalization and ref resolution as pure helper exports instead of mutating the lifecycle wrapper into a session framework."
  - "Use existing `nodeId` / `geometryId` / topology-id data as the canonical resolver input, and return explicit `invalid-handle`, `invalid-id`, and `occurrence-mismatch` DTOs."
patterns-established:
  - "`occt-core` is the bridge between definition-scoped Wasm exact bindings and occurrence-scoped downstream refs."
  - "Repeated geometry instances share exact definition identity while remaining distinguishable through node occurrence context."
requirements-completed: [REF-02]
duration: 5min
completed: 2026-04-15
---

# Phase 06 Plan 02 Summary

**`occt-core` can now normalize exact-open results and resolve occurrence-scoped exact refs from the existing scene ids, with explicit failure DTOs for invalid handles, ids, and node/geometry mismatches.**

## Performance

- **Duration:** 5 min
- **Started:** 2026-04-15T07:39:43+08:00
- **Completed:** 2026-04-15T07:44:11+08:00
- **Tasks:** 2
- **Files modified:** 6

## Accomplishments

- Added `normalizeExactOpenResult(...)` so exact-open results become geometry-id keyed normalized models with exact binding metadata.
- Added `resolveExactElementRef(...)` plus face/edge/vertex convenience helpers with explicit `invalid-handle`, `invalid-id`, and `occurrence-mismatch` failure DTOs.
- Added unit tests, live-root integration, and root `npm test` coverage for occurrence-scoped exact refs and repeated geometry reuse.

## Task Commits

Each task was committed atomically:

1. **Task 1: Add failing occt-core tests for occurrence-scoped exact-ref resolution** - `31e9989` (`test`)
2. **Task 2: Implement exact-open normalization and explicit ref resolution in occt-core** - `2f3c693` (`feat`)

## Files Created/Modified

- `packages/occt-core/src/exact-model-normalizer.js` - Added exact-open normalization on top of `normalizeOcctResult(...)`.
- `packages/occt-core/src/exact-ref-resolver.js` - Added occurrence-scoped exact-ref resolution and failure DTO helpers.
- `packages/occt-core/src/index.js` - Exported the new exact-model normalization and ref-resolution helpers.
- `packages/occt-core/test/exact-ref-resolver.test.mjs` - Added stub-level resolver coverage for success and failure cases.
- `packages/occt-core/test/live-root-integration.test.mjs` - Added a live `assembly.step` repeated-geometry ref-resolution smoke test.
- `package.json` - Wired `test/exact_ref_mapping_contract.test.mjs` into the normal root `npm test` chain.

## Decisions Made

- Kept ref resolution in `occt-core` rather than Wasm so the root runtime does not learn viewer-specific occurrence ids.
- Normalized exact models with `geometryId` and `nodeId` aliases so downstream resolver inputs match the ids already used by the web stack.

## Deviations from Plan

None.

## Issues Encountered

No runtime defects surfaced during `06-02`; the main red phase was missing exports for `normalizeExactOpenResult(...)` and `resolveExactElementRef(...)`, which the new helper modules resolved cleanly.

## User Setup Required

None.

## Next Phase Readiness

- Phase 07 can now assume exact refs carry both definition identity (`exactShapeHandle`) and occurrence context (`nodeId` + transform).
- The remaining work can focus on primitive geometry classification and single-entity exact queries instead of revisiting ref identity.

---
*Phase: 06-occurrence-scoped-exact-ref-mapping*
*Completed: 2026-04-15*
