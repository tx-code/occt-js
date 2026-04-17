---
gsd_state_version: 1.0
milestone: v1.5
milestone_name: Root Release Hardening
status: defining_requirements
stopped_at: milestone v1.5 started; defining requirements and roadmap
last_updated: "2026-04-17T20:05:00.0000000+08:00"
last_activity: 2026-04-17
progress:
  total_phases: 0
  completed_phases: 0
  total_plans: 0
  completed_plans: 0
  percent: 0
---

# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-04-16)

Core value: Downstream applications can reliably consume the OCCT Wasm runtime and its root API contract without build drift or packaging surprises.
Current focus: Defining milestone v1.5 requirements and roadmap

## Current Position

Milestone: v1.5 Root Release Hardening
Phase: Not started (defining requirements)
Plan: —
Status: Defining requirements
Last activity: 2026-04-17 — Milestone v1.5 started

Progress: [----------] 0%

## Milestone Snapshot

- `v1.4 Exact Measurement Placement & Relation SDK` shipped and was archived on 2026-04-16.
- The root runtime now exposes additive exact placement helpers and exact relation classification on top of the prior exact-measurement foundation.
- `@tx-code/occt-core` now provides package-first placement and relation wrappers that preserve occurrence transforms.
- Package-first SDK docs, tarball checks, and the authoritative root release gate now lock the exact placement/relation contract.

## Accumulated Context

- The root Wasm carrier remains the primary product surface and release boundary.
- `v1.0` hardened the runtime-first build and release contract.
- `v1.1` shipped exact BRep measurement foundations at the wasm/core boundary.
- `v1.2` shipped explicit import color-mode and default-color control.
- `v1.3` extended that import appearance surface with opacity fallback, named presets, and completed governance coverage.
- `v1.4` shipped exact placement, relation classification, and package-first SDK governance for downstream measurement consumers.

## Pending Todos

- Finalize `v1.5` requirements and roadmap.
- Start execution at the first planned phase once roadmap approval is complete.

## Blockers/Concerns

- `gsd-tools audit-open` still crashes with `ReferenceError: output is not defined` in this environment, so milestone-close preflight still needs manual fallback.
- Root preflight and release-governance drift need to be resolved before additional runtime surface expansion.

## Session Continuity

Last session: 2026-04-17
Stopped at: milestone `v1.5` initialized; requirements and roadmap in progress
Resume file: .planning/MILESTONES.md
