---
phase: 18-runtime-path-contract-alignment
plan: "02"
subsystem: demo-runtime-contract
tags: [demo, runtime-path, vite, verification-only]
requires:
  - phase: 18-runtime-path-contract-alignment
    provides: Root preflight contract aligned to the concrete local-dev `dist/` file paths
provides:
  - Verified demo-side contract coverage for the same concrete root `dist/` files asserted by preflight
  - Confirmed preservation of Tauri resource resolution and production CDN fallback behavior
  - Verified demo build compatibility for the unchanged runtime split
affects: [phase-18, demo, runtime]
tech-stack:
  added: []
  patterns: [verification-only-reconciliation, concrete-dist-contract, unchanged-runtime-split]
key-files:
  created:
    - .planning/phases/18-runtime-path-contract-alignment/18-02-SUMMARY.md
  modified: []
key-decisions:
  - "No hook change was necessary once root preflight matched the shipped concrete-file contract."
  - "Demo-side verification remains explicit about concrete local-dev `dist/` files and continues to reject directory-base lookup patterns."
  - "Tauri resource resolution and production CDN fallback were preserved unchanged in this plan."
patterns-established:
  - "Runtime-path reconciliation can close with verification only when the maintained implementation already satisfies the planned contract."
  - "Demo verification remains conditional to demo-surface work without being promoted into an unconditional root release gate."
requirements-completed: [PATH-01]
duration: n/a
completed: 2026-04-17
---

# Phase 18 Plan 02 Summary

**The demo-side runtime contract already matched the intended concrete-file loader behavior, so this plan completed by verification-only confirmation instead of source changes.**

## Performance

- **Duration:** n/a
- **Tasks:** 1
- **Files modified:** 0

## Accomplishments

- Re-verified `demo/tests/use-occt-runtime-contract.test.mjs` against the current `demo/src/hooks/useOcct.js` and confirmed the demo-side contract already asserts the same concrete `../../../dist/occt-js.js` and `../../../dist/occt-js.wasm` paths as the corrected root preflight suite.
- Confirmed the demo-side contract still rejects stale directory-base lookup patterns, including the `@vite-ignore` form.
- Ran `npm --prefix demo run build` to confirm the unchanged runtime split still builds cleanly after the root preflight adjustment.
- Re-ran `npm run test:wasm:preflight` as the canonical Phase 18 gate to verify the root/demo contract alignment end to end.

## Task Commits

No source commit was required for this plan. The existing demo hook and demo-side contract test already satisfied the planned runtime-path contract once Plan `18-01` landed.

## Files Created/Modified

- `demo/src/hooks/useOcct.js` - Verified unchanged; local dev still resolves concrete root `dist/` files, Tauri still resolves bundled resources, and production web fallback still uses the CDN path.
- `demo/tests/use-occt-runtime-contract.test.mjs` - Verified unchanged; still guards the concrete-file local-dev runtime contract and rejects stale directory-base patterns.

## Decisions Made

- Kept the demo hook unchanged because the maintained runtime split already matched the intended contract.
- Used verification-only closure rather than forcing a no-op code edit just to satisfy the plan mechanically.
- Preserved the existing Tauri and production-web branches to avoid dragging Phase 20 or CDN-hardening work into Phase 18.

## Deviations from Plan

- The plan allowed minimal reconciliation if needed; in execution, no reconciliation edit was needed because the demo-side code and test were already aligned to the intended contract.

## Issues Encountered

- None. The demo runtime contract test, demo build, and root preflight gate all passed without additional source edits.

## User Setup Required

None.

## Next Phase Readiness

- Phase 18 is ready for phase-level verification and closure.
- Phase 19 can now focus purely on release-governance decoupling instead of runtime-path drift.

---
*Phase: 18-runtime-path-contract-alignment*
*Completed: 2026-04-17*
