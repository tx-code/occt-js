---
gsd_state_version: 1.0
milestone: v1.9
milestone_name: Generic Profile Solids
status: milestone_archived
stopped_at: v1.9 closeout complete
last_updated: "2026-04-21T12:20:00+08:00"
last_activity: 2026-04-21 -- v1.9 archived
progress:
  total_phases: 3
  completed_phases: 3
  total_plans: 6
  completed_plans: 6
  percent: 100
---

# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-04-21)

Core value: Downstream applications can reliably consume the OCCT Wasm runtime and its root API contract without build drift or packaging surprises.
Current focus: Planning next milestone

## Current Position

Milestone: v1.9 Generic Profile Solids
Phase: archived
Plan: closeout complete
Status: Planning next milestone
Last activity: 2026-04-21 -- v1.9 archived

Progress: [##########] 100%

## Performance Metrics

Current milestone (`v1.9`) shipped scope:

- Phases: 3 (30-32)
- Plans: 6/6 complete
- Primary outcome target: shared profile kernel plus generic linear extruded solids with package-first SDK/governance parity

## Accumulated Context

### Decisions

- The root Wasm surface is now generic `revolved shape`; demo-only tool presets stay downstream and do not define the runtime contract.
- Exact generated shapes reuse the retained exact-model lifecycle and now expose `revolvedShape.faceBindings`, `shapeValidation`, and runtime-owned `systemRole` semantics.
- `@tx-code/occt-core` plus `npm run test:release:root` are the authoritative package-first and governance surfaces for `v1.8`.
- `v1.9` extends the generic geometry line through one shared 2D profile kernel and additive `generated-extruded-shape` APIs rather than reintroducing tool-coupled abstractions.
- Phase `30` shipped a generic `Profile2D` validator plus an internal resolved-loop adapter that keeps revolved `auto_axis` closure family-owned while build/openExact paths reuse the shared kernel.
- Phase `31` shipped additive `ValidateExtrudedShapeSpec`, `BuildExtrudedShape`, and `OpenExactExtrudedShape` APIs in canonical local `XY + Z-depth` space.
- Generated extruded shapes now expose stable `wall`, `start_cap`, and `end_cap` bindings plus deterministic runtime-owned wall/cap appearance grouping based on prism history instead of face-order assumptions.
- Phase `32` shipped package-first `occt-core` wrappers, normalized extruded metadata preservation, generic profile-solid docs, and release-governance/tarball coverage for the shared-profile plus extruded contract.

### Pending Todos

- Start the next milestone with `$gsd-new-milestone`.
- Re-evaluate `SEED-001-web-exact-brep-measurement` only if it fits the next milestone boundary.

### Blockers/Concerns

- No technical blockers are currently open.

## Deferred Items

Items acknowledged and deferred at milestone close on 2026-04-21:

| Category | Item | Status |
|----------|------|--------|
| seed | 001-web-exact-brep-measurement | dormant |

## Session Continuity

Last session: 2026-04-21T12:20:00+08:00
Stopped at: v1.9 closeout complete
Resume file: .planning/PROJECT.md
