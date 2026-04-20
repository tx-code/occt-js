---
gsd_state_version: 1.0
milestone: v1.8
milestone_name: Wasm+JS Revolved Tool Generation
status: executing
stopped_at: Phase 27 plan 27-01 completed
last_updated: "2026-04-20T15:32:16.1450605+08:00"
last_activity: 2026-04-20 -- Completed Phase 27 plan 27-01 strict spec validation and bindings
progress:
  total_phases: 3
  completed_phases: 0
  total_plans: 6
  completed_plans: 1
  percent: 17
---

# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-04-20)

Core value: Downstream applications can reliably consume the OCCT Wasm runtime and its root API contract without build drift or packaging surprises.
Current focus: Phase 27 build-path execution (`27-02`)

## Current Position

Milestone: v1.8 Wasm+JS Revolved Tool Generation
Phase: 27. Revolved Tool Spec & Wasm Builder
Plan: 27-01 complete; 27-02 next
Status: Executing Phase 27 wave 2
Last activity: 2026-04-20 -- Completed Phase 27 plan 27-01 strict spec validation and bindings

Progress: [##--------] 17%

## Performance Metrics

Latest shipped milestone (`v1.7`):

- Phases: 3 (24-26)
- Plans: 6/6 complete
- Git range: `0250495..3701c91` (21 commits)
- Diff summary: 79 files changed, 3711 insertions(+), 127 deletions(-)
- Timeline: 2026-04-18 -> 2026-04-20

## Accumulated Context

### Decisions

- `v1.7` shipped with lifecycle diagnostics, managed disposal wrappers, retained-query/store and IGES staging performance hardening, and governance-locked lifecycle/perf docs.
- Perf and soak verification lanes are explicit and optional (`npm run test:perf:exact`, `npm run test:soak:exact`) while `npm run test:release:root` remains the authoritative root gate.
- `v1.8` shifts focus to app-neutral revolved tool generation in Wasm+JS rather than package ecosystem cleanup.
- The generated tool input contract will be a normalized revolved profile spec; app-specific tool schemas stay upstream.
- Default appearance for generated tools will derive from runtime tag/role semantics instead of caller-supplied colors.
- Phase 27 defaults are now locked: strict normalized spec, separate validate/build APIs, additive top-level generated-tool metadata, and Phase 28 ownership of exact/history bindings.
- Phase 27 planning is now split into two execution plans: `27-01` strict spec validation/binding work, then `27-02` OCCT revolve build + canonical scene export.
- `27-01` is complete: the root runtime now exposes `ValidateRevolvedToolSpec(spec)` with strict normalized typings and explicit typed diagnostics.

### Pending Todos

- Execute `27-02` to build validated revolved specs into canonical root scene payloads.
- Keep future `openExactRevolvedTool` aligned with existing exact-model lifecycle and query contracts during Phase 28 planning.
- Keep `demo/.codex-run/` and `demo/dist/` out of planning commits.

### Blockers/Concerns

- No technical blockers are currently open.

## Deferred Items

Items acknowledged and deferred at milestone close on 2026-04-20:

| Category | Item | Status |
|----------|------|--------|
| seed | 001-web-exact-brep-measurement | dormant |

## Session Continuity

Last session: 2026-04-20T15:32:16.1450605+08:00
Stopped at: Phase 27 plan 27-01 completed
Resume file: .planning/phases/27-revolved-tool-spec-wasm-builder/27-02-PLAN.md
