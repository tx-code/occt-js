---
phase: 18-runtime-path-contract-alignment
plan: "01"
subsystem: root-runtime-contract
tags: [preflight, dist, runtime-path, node-test]
requires:
  - phase: 18-runtime-path-contract-alignment
    provides: Phase context and verified plan artifacts for runtime-path alignment
provides:
  - Root preflight contract coverage aligned to concrete `dist/occt-js.js` and `dist/occt-js.wasm` file paths
  - Explicit rejection of stale directory-base local-dev runtime lookup patterns
  - A passing `npm run test:wasm:preflight` gate with missing-`dist/` boundary checks preserved
affects: [phase-18, root, preflight, tests]
tech-stack:
  added: []
  patterns: [concrete-dist-contract, root-source-text-assertions, strict-missing-dist-guard]
key-files:
  created:
    - .planning/phases/18-runtime-path-contract-alignment/18-01-SUMMARY.md
  modified:
    - test/dist_contract_consumers.test.mjs
key-decisions:
  - "Root preflight now follows the concrete local-dev `dist/occt-js.js` and `dist/occt-js.wasm` contract instead of a directory-base lookup."
  - "The root contract test rejects both plain and `@vite-ignore` directory-base `../../../dist/` patterns."
  - "Missing `dist/` artifact failure coverage stays on the preflight path."
patterns-established:
  - "Root source-text contract tests mirror the maintained demo loader contract instead of forcing the loader back to stale assumptions."
  - "Runtime-path alignment changes preserve the existing strict `dist/` boundary rather than broadening accepted loader patterns."
requirements-completed: [PATH-02]
duration: n/a
completed: 2026-04-17
---

# Phase 18 Plan 01 Summary

**The root preflight contract now asserts the same concrete `dist/occt-js.js` and `dist/occt-js.wasm` paths already used by maintained runtime consumers.**

## Performance

- **Duration:** n/a
- **Tasks:** 1
- **Files modified:** 1

## Accomplishments

- Replaced the stale directory-base assertion in `test/dist_contract_consumers.test.mjs` with explicit concrete-file checks for `../../../dist/occt-js.js` and `../../../dist/occt-js.wasm`.
- Added negative assertions that reject both plain and `@vite-ignore` directory-base `../../../dist/` lookup patterns so the preflight gate cannot silently drift back toward ambiguous loader behavior.
- Kept the existing `package.json` and Tauri resource assertions intact, so this change stayed inside Phase 18’s runtime-path boundary.
- Re-ran `node --test test/dist_contract_consumers.test.mjs` and `npm run test:wasm:preflight` to confirm the corrected root contract passes while the missing-`dist/` checks in the preflight suite still run.

## Task Commits

Each task was committed atomically:

1. **Task 1: Replace the stale root runtime-path assertion with the concrete-file contract** - `a476e03` (`test`)

## Files Created/Modified

- `test/dist_contract_consumers.test.mjs` - Updated the root consumer contract to mirror the shipped concrete-file dev runtime lookup and reject stale directory-base patterns.

## Decisions Made

- Treated the concrete local-dev JS/Wasm file URLs as the authoritative shared contract for root preflight.
- Preserved negative `dist/` boundary coverage instead of weakening preflight to accept broader path forms.
- Kept governance and secondary-surface concerns out of this plan so Phase 18 stayed tightly scoped.

## Deviations from Plan

- No substantive deviations. The executed change matches the planned narrow runtime-path alignment scope.

## Issues Encountered

- None after the contract assertion was updated. The root preflight suite passed immediately once the stale directory-base expectation was removed.

## User Setup Required

None.

## Next Phase Readiness

- Plan `18-02` can now verify the demo-side runtime contract against an aligned root preflight gate.
- Phase 19 can later decouple `.planning` archive-state governance without re-opening the runtime-path contract itself.

---
*Phase: 18-runtime-path-contract-alignment*
*Completed: 2026-04-17*
