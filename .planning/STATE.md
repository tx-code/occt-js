---
gsd_state_version: 1.0
milestone: v1.10
milestone_name: Exact Measurement Demo Loop
status: ready_to_execute
stopped_at: Phase 33.1-01 completed
last_updated: "2026-04-21T22:45:00+08:00"
last_activity: 2026-04-21 -- Completed Phase 33.1 Plan 01 Multi-Actor Workspace
progress:
  total_phases: 4
  completed_phases: 1
  total_plans: 7
  completed_plans: 2
  percent: 29
---

# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-04-21)

Core value: Downstream applications can reliably consume the OCCT Wasm runtime and its root API contract without build drift or packaging surprises.
Current focus: Phase 33.1-02 execution

## Current Position

Milestone: v1.10 Exact Measurement Demo Loop
Phase: 33 complete; 33.1 in progress
Plan: 33.1-02 next
Status: Ready to execute
Last activity: 2026-04-21 -- Completed Phase 33.1 Plan 01 Multi-Actor Workspace

Progress: [###-------] 29%

## Performance Metrics

Current milestone (`v1.10`) planned scope:

- Phases: 4 (33, 33.1, 34, 35)
- Plans: 1/7 complete
- Primary outcome target: browser demo workpiece-plus-tool exact measurement workflow and verification

## Accumulated Context

### Decisions

- `v1.10` should prove the existing exact measurement kernel through demo integration before any broader runtime expansion.
- The demo must retain managed exact models and resolve picks to occurrence-safe refs instead of coupling measurements to viewer-only entity ids.
- Measurement overlay and inspection output remain demo-owned; the root runtime stays focused on exact geometry, DTOs, and lifecycle-safe handles.
- `npm run test:release:root` remains the authoritative root release gate; measurement demo verification must stay a conditional secondary-surface flow.
- Imported CAD and generated revolved shapes now converge on one demo-local `exactSession` contract with explicit replacement and reset semantics.
- The workpiece-plus-tool target turns multi-actor retained state and cross-model exact pairwise support into a concrete milestone requirement rather than a future abstraction.
- The demo now uses canonical actor records plus a derived composite display model so workpiece and tool can coexist without teaching Babylon packages app-specific tool semantics.
- Tool motion is now store-owned actor pose state rather than a Babylon-only side channel.
- Playwright browser verification now boots on an isolated loopback port instead of reusing arbitrary local `5173` servers.

### Pending Todos

- Execute `33.1-02` to add additive cross-model pairwise support and actor-aware exact-ref selection bridging.
- Keep Phase 34 focused on measurement actions and overlay output rather than reopening workspace or cross-model kernel design.

### Blockers/Concerns

- Babylon selection entities must map back to stable `OcctExactRef` occurrence paths without stale-handle drift.
- Exact placement DTOs already exist, but the demo render path must avoid inventing app-coupled semantics beyond an MVP inspection or overlay layer.
- `demo`'s packaged `test:e2e` script does not cover `demo/tests/demo.spec.mjs`, so viewer regression coverage still requires an explicit Playwright invocation until that routing is tightened.
- The current pairwise exact wrapper rejects refs from different `exactModelId` values, so imported-workpiece plus generated-tool measurement cannot be correct until that gap is addressed.

## Deferred Items

Items intentionally deferred while `v1.10` starts on 2026-04-21:

| Category | Item | Status |
|----------|------|--------|
| future | batch measurement candidate discovery and suggestion flows | deferred |
| future | persistent measurement history, export, or reporting UX | deferred |

## Session Continuity

Last session: 2026-04-21T22:45:00+08:00
Stopped at: Phase 33.1-01 completed
Resume file: .planning/phases/33.1-multi-actor-exact-workspace/33.1-02-PLAN.md
