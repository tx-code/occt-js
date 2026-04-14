---
phase: 01-wasm-build-dist-baseline
plan: "01"
subsystem: infra
tags: [windows, emscripten, cmake, dist, build]
requires: []
provides:
  - Windows Wasm build scripts now validate canonical dist artifacts directly
  - Static regression coverage for the dist artifact contract and retained diagnostics
affects: [01-03, release, downstream-consumers]
tech-stack:
  added: []
  patterns: [dist-first-runtime-artifact-contract, static-build-script-contract-tests]
key-files:
  created: [test/wasm_build_contract.test.mjs]
  modified: [tools/build_wasm_win.bat, tools/build_wasm_win_dist.bat]
key-decisions:
  - "Treat dist/occt-js.js and dist/occt-js.wasm as the only authoritative runtime artifacts."
  - "Remove the build/wasm copy fallback from the Windows dist wrapper."
patterns-established:
  - "Windows build wrappers must assert canonical dist outputs instead of silently copying from intermediary build folders."
  - "Batch/CMake contract drift is guarded by a fast static node --test suite."
requirements-completed: [CORE-01]
duration: 95min
completed: 2026-04-14
---

# Phase 01: 01-01 Summary

**Windows Wasm build wrappers now enforce a direct `dist/` runtime-artifact contract backed by a static regression test.**

## Performance

- **Duration:** 95 min
- **Started:** 2026-04-14T17:51:00+08:00
- **Completed:** 2026-04-14T19:29:00+08:00
- **Tasks:** 2
- **Files modified:** 3

## Accomplishments

- Added `test/wasm_build_contract.test.mjs` to lock the CMake and batch-script artifact contract.
- Updated `tools/build_wasm_win.bat` to fail if canonical `dist/occt-js.js` or `dist/occt-js.wasm` are missing after the build.
- Updated `tools/build_wasm_win_dist.bat` to validate canonical `dist/` outputs directly instead of copying from `build/wasm`.

## Task Commits

Each task was committed atomically:

1. **Task 1: Lock the Windows build-path invariants in a fast contract test** - `a5235aa` (fix)
2. **Task 2: Reconcile CMake and Windows batch scripts to generate the canonical dist artifacts directly** - `a5235aa` (fix)

## Files Created/Modified

- `test/wasm_build_contract.test.mjs` - Static assertions for `dist/` artifact paths, retained logs, and retry guidance.
- `tools/build_wasm_win.bat` - Canonical output checks plus retained diagnostics.
- `tools/build_wasm_win_dist.bat` - Direct `dist/` validation without intermediary copy fallback.

## Decisions Made

- Used `dist/` as the only runtime artifact origin because root tests, local web dev, and Tauri packaging already consume that contract.
- Kept `build/wasm-build.log` and `BUILD_JOBS=1` guidance intact while tightening artifact validation.

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

- The first full wave gate attempt collided with an orphaned background `mingw32-make` process from a closed executor. The build itself completed successfully in the background; after the orphaned process exited, the clean-shell gate was rerun and passed.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- Plan `01-01` is complete and its contract is now testable in isolation.
- `01-03` can depend on the canonical `dist/` behavior without preserving legacy copy logic.

---
*Phase: 01-wasm-build-dist-baseline*
*Completed: 2026-04-14*
