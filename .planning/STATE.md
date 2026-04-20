---
gsd_state_version: 1.0
milestone: v1.8
milestone_name: Wasm+JS Revolved Tool Generation
status: planning
stopped_at: Phase 27 context gathered
last_updated: "2026-04-20T15:09:41.2691427+08:00"
last_activity: 2026-04-20 -- Captured Phase 27 context and discussion defaults
progress:
  total_phases: 3
  completed_phases: 0
  total_plans: 6
  completed_plans: 0
  percent: 0
---

# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-04-20)

Core value: Downstream applications can reliably consume the OCCT Wasm runtime and its root API contract without build drift or packaging surprises.
Current focus: Phase 27 planning

## Current Position

Milestone: v1.8 Wasm+JS Revolved Tool Generation
Phase: 27. Revolved Tool Spec & Wasm Builder
Plan: Not started
Status: Context gathered; ready for planning
Last activity: 2026-04-20 -- Captured Phase 27 context and discussion defaults

Progress: [----------] 0%

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

### Pending Todos

- Run Phase 27 planning for revolved tool spec parsing, diagnostics, and OCCT revolve construction.
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

Last session: 2026-04-20T15:09:41.2691427+08:00
Stopped at: Phase 27 context gathered
Resume file: .planning/phases/27-revolved-tool-spec-wasm-builder/27-CONTEXT.md
