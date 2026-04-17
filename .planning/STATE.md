---
gsd_state_version: 1.0
milestone: v1.5
milestone_name: Root Release Hardening
status: executing
stopped_at: Phase 20 planning complete
last_updated: "2026-04-17T13:31:48.744Z"
last_activity: 2026-04-17 -- Phase 20 planning complete
progress:
  total_phases: 3
  completed_phases: 2
  total_plans: 6
  completed_plans: 4
  percent: 67
---

# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-04-17)

Core value: Downstream applications can reliably consume the OCCT Wasm runtime and its root API contract without build drift or packaging surprises.
Current focus: Phase 20 Conditional Secondary-Surface Verification

## Current Position

Milestone: v1.5 Root Release Hardening
Phase: 20 of 20 (Conditional Secondary-Surface Verification)
Plan: 0 of 2 in current phase
Status: Ready to execute
Last activity: 2026-04-17 -- Phase 20 planning complete

Progress: [#######---] 67%

## Performance Metrics

Velocity:

- Total plans completed: 4
- Average duration: 0 min
- Total execution time: 0.0 hours

By Phase:

| Phase | Plans | Total | Avg/Plan |
|-------|-------|-------|----------|
| 18 | 2/2 | 0 min | 0 min |
| 19 | 2/2 | 0 min | 0 min |
| 20 | 0/2 | 0 min | 0 min |

Recent Trend:

- Last 5 plans: none recorded
- Trend: Stable

## Accumulated Context

### Decisions

- Phase 18 locked the shared local-dev runtime contract on concrete `dist/occt-js.js` and `dist/occt-js.wasm` file URLs.
- Phase 19 separated `.planning` process checks from `npm run test:release:root` through the explicit `npm run test:planning:audit` path.
- Phase 20 will keep secondary-surface verification manifest-first and conditional instead of promoting it into the root release gate.
- Phase 20 planning keeps demo browser/node verification separate from `tauri:*` so desktop work remains a conditional follow-up surface.
- Phase 20 will lock secondary-surface policy through a separate contract-audit lane instead of extending `npm run test:release:root`.

### Pending Todos

- Execute Plan 20-01 to add explicit non-Tauri demo verification commands and stabilize the demo node-test lane.
- Execute Plan 20-02 to fix loader dependency ownership and publish the conditional secondary-surface routing matrix.
- Keep any new secondary-surface contract audit outside `npm run test:release:root`.

### Blockers/Concerns

- `gsd-tools phase complete` still assumes legacy `STATE.md` body fields in this repo, so future phase transitions may need manual cleanup until the tool or template is aligned.
- `gsd-tools audit-open` still crashes with `ReferenceError: output is not defined`, so any planning-audit lane may need a manual fallback until that tool is fixed.
- `demo/tests/auto-orient.test.mjs` currently imports a missing `demo/src/lib/auto-orient.js`, so the default demo node-test lane needs repair or intentional narrowing before it becomes the official manifest entrypoint.
- `packages/occt-babylon-loader` still imports `@babylonjs/core` and `@tx-code/occt-babylon-viewer` without package-owned dependencies, so standalone loader tests are still blocked until Plan 20-02 lands.

## Session Continuity

Last session: 2026-04-17T13:31:48.744Z
Stopped at: Phase 20 planning complete
Resume file: .planning/phases/20-conditional-secondary-surface-verification/20-01-PLAN.md
