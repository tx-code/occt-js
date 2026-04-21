---
gsd_state_version: 1.0
milestone: v1.10
milestone_name: Exact Measurement Demo Loop
status: ready_to_plan
stopped_at: Inserted Phase 33.1 to capture the multi-actor workspace gap
last_updated: "2026-04-21T19:20:00+08:00"
last_activity: 2026-04-21 -- Inserted Phase 33.1 Multi-Actor Exact Workspace after confirming workpiece-plus-tool measurement target
progress:
  total_phases: 4
  completed_phases: 1
  total_plans: 7
  completed_plans: 1
  percent: 14
---

# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-04-21)

Core value: Downstream applications can reliably consume the OCCT Wasm runtime and its root API contract without build drift or packaging surprises.
Current focus: Phase 33.1 planning

## Current Position

Milestone: v1.10 Exact Measurement Demo Loop
Phase: 33 complete; 33.1 next
Plan: 33.1 discuss/plan next
Status: Ready to plan
Last activity: 2026-04-21 -- Inserted Phase 33.1 Multi-Actor Exact Workspace

Progress: [#---------] 14%

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

### Pending Todos

- Capture Phase 33.1 context and plan the multi-actor workspace before resuming selection-bridge implementation.
- Define the actor-scoped workspace contract for imported workpiece plus generated tool, including movable tool pose and retained exact lifecycle.
- Design the narrow additive cross-model exact pairwise seam needed for workpiece-tool measurements, then re-scope the old single-actor `33-02` bridge draft around that contract.

### Blockers/Concerns

- Babylon selection entities must map back to stable `OcctExactRef` occurrence paths without stale-handle drift.
- Exact placement DTOs already exist, but the demo render path must avoid inventing app-coupled semantics beyond an MVP inspection or overlay layer.
- `demo`'s packaged `test:e2e` script does not cover `demo/tests/demo.spec.mjs`, so viewer regression coverage still requires an explicit Playwright invocation until that routing is tightened.
- The current pairwise exact wrapper rejects refs from different `exactModelId` values, so imported-workpiece plus generated-tool measurement cannot be correct until that gap is addressed.
- Tool movement cannot remain a Babylon-only transform; render pose and exact-measurement pose must stay in lockstep.

## Deferred Items

Items intentionally deferred while `v1.10` starts on 2026-04-21:

| Category | Item | Status |
|----------|------|--------|
| future | batch measurement candidate discovery and suggestion flows | deferred |
| future | persistent measurement history, export, or reporting UX | deferred |

## Session Continuity

Last session: 2026-04-21T19:20:00+08:00
Stopped at: Inserted Phase 33.1 to capture the multi-actor workspace gap
Resume file: .planning/phases/33.1-multi-actor-exact-workspace/33.1-CONTEXT.md
