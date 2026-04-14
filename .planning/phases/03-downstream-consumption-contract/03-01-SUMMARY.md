---
phase: 03-downstream-consumption-contract
plan: "01"
subsystem: root-package
tags: [tests, packaging, tarball, wasm, downstream]
requires:
  - phase: 01-wasm-build-dist-baseline
    provides: canonical dist artifacts and Windows build verification
  - phase: 02-root-runtime-contract
    provides: locked root Wasm payload and initialization semantics
provides:
  - Tarball-focused contract coverage for the packed `@tx-code/occt-js` surface
  - Explicit root-package exports that preserve downstream deep access to `dist/occt-js.wasm`
  - Published `locateFile` typings aligned with the generated runtime callback shape
affects: [phase-03, downstream-consumers, release]
tech-stack:
  added: []
  patterns: [packed-surface-contract, explicit-wasm-entrypoints]
key-files:
  created:
    - .planning/phases/03-downstream-consumption-contract/03-01-SUMMARY.md
    - test/package_tarball_contract.test.mjs
  modified:
    - package.json
    - dist/occt-js.d.ts
key-decisions:
  - "The root package now declares explicit `exports` while preserving vendored/deep access to `./dist/occt-js.js`, `./dist/occt-js.wasm`, and `./dist/occt-js.d.ts`."
  - "Published typings widen `locateFile` to `(filename, scriptDirectory?)` because that is the runtime callback shape downstream consumers actually receive."
patterns-established:
  - "A packed `@tx-code/occt-js` tarball must remain a minimal Wasm carrier: metadata plus `dist/occt-js.js`, `dist/occt-js.wasm`, and `dist/occt-js.d.ts`."
requirements-completed: [CONS-01]
duration: 19min
completed: 2026-04-14
---

# Phase 03: 03-01 Summary

**The packed root package contract is now explicit and regression-tested for tarballed or vendored downstream consumers.**

## Performance

- **Duration:** 19 min
- **Started:** 2026-04-14T20:09:00+08:00
- **Completed:** 2026-04-14T20:28:00+08:00
- **Tasks:** 2
- **Files modified:** 4

## Accomplishments

- Added `test/package_tarball_contract.test.mjs` to lock the dry-run tarball file list, explicit package entrypoints, runtime Wasm hooks, and independence from repo-local build intermediates.
- Fixed the new tarball test harness for Windows by invoking `npm pack --dry-run --json` through `cmd.exe`, so the test fails on real contract drift instead of shell-launch quirks.
- Added a minimal `exports` map to [package.json](/E:/Coding/occt-js/package.json) that keeps the root entry explicit while preserving downstream deep imports of the canonical `dist` artifacts.
- Widened `locateFile` in [dist/occt-js.d.ts](/E:/Coding/occt-js/dist/occt-js.d.ts) to match the actual generated loader callback shape and keep `wasmBinary` explicit.

## Task Commits

Each task was committed atomically:

1. **Task 1: Lock the packed root package surface and Wasm initialization contract with a tarball test** - shipped in this plan's completion commit
2. **Task 2: Make package metadata and published types explicit for the supported tarball contract** - shipped in this plan's completion commit

## Files Created/Modified

- `test/package_tarball_contract.test.mjs` - Added root tarball contract coverage for packed file surface, exports, Wasm resolution hooks, and build-intermediate independence.
- `package.json` - Declared explicit root-package exports without widening the public surface beyond the canonical `dist` artifacts.
- `dist/occt-js.d.ts` - Updated `locateFile` typing to accept the runtime `scriptDirectory` argument.
- `.planning/phases/03-downstream-consumption-contract/03-01-SUMMARY.md` - Recorded the plan outcome and verification evidence.

## Decisions Made

- Kept the root package focused on the Wasm carrier and avoided adding any demo/Babylon-facing exports.
- Preserved deep access to `./dist/occt-js.wasm` because downstream consumers such as vendored apps resolve the Wasm file directly.

## Deviations from Plan

- No runtime source changes were needed. The generated loader already honors adjacent Wasm resolution and `locateFile` / `wasmBinary`; the drift was only in package metadata and published types.

## Issues Encountered

- The first red test on Windows failed in the harness because `npm` cannot be spawned directly as a child process there. The test was corrected to launch via `cmd.exe`, after which it failed only on the intended contract gaps.

## User Setup Required

None.

## Next Phase Readiness

- `03-01` now gives Phase 03 an explicit regression guard around tarball and vendored root-package consumption.
- The next execution target is `03-02`, which can tighten `@tx-code/occt-core` as the engine-agnostic downstream adapter on top of this root package contract.

---
*Phase: 03-downstream-consumption-contract*
*Completed: 2026-04-14*
