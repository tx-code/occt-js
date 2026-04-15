---
gsd_state_version: 1.0
milestone: v1.2
milestone_name: Import Appearance Contract
status: active
stopped_at: Milestone v1.2 defined; next step is /gsd-plan-phase 9
last_updated: "2026-04-15T12:05:00.000Z"
last_activity: 2026-04-15
progress:
  total_phases: 3
  completed_phases: 0
  total_plans: 6
  completed_plans: 0
  percent: 0
---

# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-04-15)

Core value: Downstream applications can reliably consume the OCCT Wasm runtime and its root API contract without build drift or packaging surprises.
Current focus: Phase 09 planning for v1.2 Import Appearance Contract

## Current Position

Phase: 09 (root-import-appearance-mode) — PLANNED
Plan: 0 of 2 complete
Status: Phase 09 ready for planning
Last activity: 2026-04-15

Progress: [----------] 0%

## Milestone Snapshot

- `v1.2 Import Appearance Contract` is active and starts at phases 09-11.
- The root runtime must move beyond `readColors?: boolean` to an explicit appearance contract that downstream apps can drive from user settings.
- `occt-core` currently owns the only documented default CAD color fallback, so v1.2 needs to lift that behavior into a shared runtime/package contract.
- App code still owns settings persistence and viewer behavior; the milestone boundary stays at import-time color semantics.

## Accumulated Context

- The root Wasm carrier remains the primary product surface and release boundary.
- `v1.1` shipped exact lifecycle, exact refs, and exact primitive/pairwise measurement foundations without expanding into viewer UX.
- `DEFAULT_CAD_BASE_COLOR = [0.9, 0.91, 0.93, 1]` currently exists only inside `packages/occt-core/src/model-normalizer.js`.
- Existing downstream consumers may still pass `readColors`, so precedence and compatibility need to be explicit in v1.2.

## Pending Todos

- Define the exact precedence between legacy `readColors` and the new appearance options.
- Decide whether the built-in default CAD color should remain aligned with the current `occt-core` fallback or be redefined once in the root contract.

## Blockers/Concerns

- No active blockers.
- Next step is `/gsd-plan-phase 9`.

## Session Continuity

Last session: 2026-04-15
Stopped at: Milestone v1.2 defined; next step is `/gsd-plan-phase 9`
Resume file: .planning/ROADMAP.md
