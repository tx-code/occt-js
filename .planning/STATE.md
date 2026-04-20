---
gsd_state_version: 1.0
milestone: v1.8
milestone_name: Wasm+JS Revolved Tool Generation
status: planning
stopped_at: Phase 27 completed
last_updated: "2026-04-20T15:47:58.3799253+08:00"
last_activity: 2026-04-20 -- Completed Phase 27 revolved tool validation and OCCT build path
progress:
  total_phases: 3
  completed_phases: 1
  total_plans: 6
  completed_plans: 2
  percent: 33
---

# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-04-20)

Core value: Downstream applications can reliably consume the OCCT Wasm runtime and its root API contract without build drift or packaging surprises.
Current focus: Phase 28 planning

## Current Position

Milestone: v1.8 Wasm+JS Revolved Tool Generation
Phase: 27 complete; Phase 28 next
Plan: 27-01 and 27-02 complete
Status: Phase 27 complete; ready to plan Phase 28
Last activity: 2026-04-20 -- Completed Phase 27 revolved tool validation and OCCT build path

Progress: [###-------] 33%

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
- `27-02` is complete: the root runtime now exposes `BuildRevolvedTool(spec, options?)`, exports generated tools through the canonical scene payload, and emits additive `generatedTool` metadata without stable face bindings yet.

### Pending Todos

- Plan Phase 28 around retained exact generated tools and stable revolve-history bindings.
- Keep future `openExactRevolvedTool` aligned with existing exact-model lifecycle and query contracts during Phase 28 planning.
- Keep Phase 29 focused on `occt-core` SDK ergonomics and governance after the exact surface settles.
- Keep `demo/.codex-run/` and `demo/dist/` out of planning commits.

### Blockers/Concerns

- No technical blockers are currently open.

## Deferred Items

Items acknowledged and deferred at milestone close on 2026-04-20:

| Category | Item | Status |
|----------|------|--------|
| seed | 001-web-exact-brep-measurement | dormant |

## Session Continuity

Last session: 2026-04-20T15:47:58.3799253+08:00
Stopped at: Phase 27 completed
Resume file: .planning/ROADMAP.md
