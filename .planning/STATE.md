---
gsd_state_version: 1.0
milestone: v1.6
milestone_name: Exact Semantics Helpers
status: ready
stopped_at: Phase 22 complete
last_updated: "2026-04-18T03:37:27.8133002Z"
last_activity: 2026-04-18 -- Phase 22 complete
progress:
  total_phases: 3
  completed_phases: 2
  total_plans: 6
  completed_plans: 4
  percent: 67
---

# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-04-18)

Core value: Downstream applications can reliably consume the OCCT Wasm runtime and its root API contract without build drift or packaging surprises.
Current focus: Phase 23 Helper SDK Docs & Governance

## Current Position

Milestone: v1.6 Exact Semantics Helpers
Phase: 23 of 23 (Helper SDK Docs & Governance)
Plan: 0 of 2 in current phase
Status: Ready to discuss
Last activity: 2026-04-18 -- Phase 22 complete

Progress: [######----] 67%

## Performance Metrics

Velocity:

- Total plans completed: 10
- Average duration: 0 min
- Total execution time: 0.0 hours

By Phase:

| Phase | Plans | Total | Avg/Plan |
|-------|-------|-------|----------|
| 18 | 2/2 | 0 min | 0 min |
| 19 | 2/2 | 0 min | 0 min |
| 20 | 2/2 | 0 min | 0 min |
| 21 | 2/2 | 0 min | 0 min |
| 22 | 2/2 | 0 min | 0 min |

Recent Trend:

- Last 5 plans: 20-02, 21-01, 21-02, 22-01, 22-02
- Trend: Stable

## Accumulated Context

### Decisions

- Phase 18 locked the shared local-dev runtime contract on concrete `dist/occt-js.js` and `dist/occt-js.wasm` file URLs.
- Phase 19 separated `.planning` process checks from `npm run test:release:root` through the explicit `npm run test:planning:audit` path.
- Phase 20 kept secondary-surface verification manifest-first and conditional instead of promoting it into the root release gate.
- Phase 20 split demo browser/node verification from `tauri:*` and locked the browser lane to a maintained Project Home smoke spec.
- Phase 20 locked secondary-surface policy through `npm run test:secondary:contracts` instead of extending `npm run test:release:root`.
- Phase 21 discussion locked the helper scope to caller-selected analytic cylindrical hole semantics, a package-first single-ref API shape, and only minimal ref-based carrier expansion if composition from shipped primitives is insufficient.
- Phase 21 shipped `describeExactHole(ref)` / `DescribeExactHole(...)` for supported cylindrical holes while keeping the carrier surface additive and the current authoritative root release gate green.
- Phase 22 kept chamfer support narrow by shipping one selected-ref planar-face helper query and the package-first `describeExactChamfer(ref)` wrapper instead of broader feature discovery.
- Phase 22 kept midpoint, equal-distance, and symmetry helper semantics package-only over the shipped placement/relation surface, with symmetry intentionally limited to a midplane helper for supported parallel pairs.

### Pending Todos

- Run `$gsd-discuss-phase 23` to lock package-first helper docs, typings, tarball assertions, and release-governance coverage.
- Keep helper docs package-first through `@tx-code/occt-core`, with the root Wasm carrier documented as the lower-level reference surface.
- Keep the `SEED-001` carry-forward narrow: additive helper semantics only, not a reopened viewer or broad kernel milestone.
- Keep `demo/.codex-run/` and `demo/dist/` out of planning commits.

### Blockers/Concerns

- No technical blockers remain. Phase 22 is complete and the milestone is ready for Phase 23 discussion or direct planning.

## Deferred Items

Items acknowledged and deferred at milestone close on 2026-04-18:

| Category | Item | Status |
|----------|------|--------|
| seed | 001-web-exact-brep-measurement | dormant |

## Session Continuity

Last session: 2026-04-18T03:37:27.8133002Z
Stopped at: Phase 22 complete
Resume file: .planning/ROADMAP.md
