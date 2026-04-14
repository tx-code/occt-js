---
phase: 04-release-governance-flow
plan: "02"
subsystem: docs-and-skill
tags: [docs, skill, governance, release]
requires:
  - phase: 04-release-governance-flow
    provides: canonical root release command and governance contract baseline
provides:
  - Runtime-first release guidance across README, AGENTS, and occt-core docs
  - Thin release skill that points repo-wide policy back to AGENTS.md
affects: [phase-04, docs, release, skills]
tech-stack:
  added: []
  patterns: [thin-skill-shim, conditional-secondary-surface-verification]
key-files:
  created:
    - .planning/phases/04-release-governance-flow/04-02-SUMMARY.md
  modified:
    - README.md
    - packages/occt-core/README.md
    - AGENTS.md
    - .codex/skills/releasing-occt-js/SKILL.md
    - test/release_governance_contract.test.mjs
key-decisions:
  - "Repo-wide release policy stays in AGENTS.md; the release skill is a thin shim plus release-specific mechanics."
  - "Demo, Babylon, and Tauri checks are conditional secondary-surface verification, not unconditional root release gates."
patterns-established:
  - "Release docs and skill wording are guarded by the same governance contract test as the root release command surface."
requirements-completed: [CONS-03, DIST-02]
duration: 10min
completed: 2026-04-14
---

# Phase 04: 04-02 Summary

**Runtime-first release guidance is now aligned across public docs, AGENTS, and the repository release skill.**

## Performance

- **Duration:** 10 min
- **Started:** 2026-04-14T21:24:00+08:00
- **Completed:** 2026-04-14T21:34:00+08:00
- **Tasks:** 1
- **Files modified:** 6

## Accomplishments

- Extended `test/release_governance_contract.test.mjs` so it now guards runtime-first docs and thin-skill behavior in addition to the root release command surface.
- Added `npm run test:release:root` and conditional secondary-surface wording to `README.md`, `packages/occt-core/README.md`, and `AGENTS.md`.
- Rewrote `.codex/skills/releasing-occt-js/SKILL.md` as a thin shim that points repo-wide policy back to `AGENTS.md` and keeps only release-specific mechanics local.
- Removed unconditional demo/browser/Tauri release gating from the release skill without widening root release scope.

## Task Commits

1. **Task 1: Align runtime-first docs and the release skill with the authoritative root release gate** - shipped in this plan's completion commit

## Files Created/Modified

- `test/release_governance_contract.test.mjs` - Added doc and skill governance assertions.
- `README.md` - Added root release gate and conditional secondary-surface language.
- `packages/occt-core/README.md` - Added runtime-first release note for downstream adapter docs.
- `AGENTS.md` - Added explicit root release gate and conditional secondary-surface verification guidance.
- `.codex/skills/releasing-occt-js/SKILL.md` - Reduced the skill to a thin shim plus release-specific mechanics.
- `.planning/phases/04-release-governance-flow/04-02-SUMMARY.md` - Recorded plan outcome and verification evidence.

## Decisions Made

- Kept AGENTS authoritative for repo-wide policy instead of duplicating that policy inside the release skill.
- Treated demo production updates and viewer verification as conditional release scope only when those files are touched.

## Deviations from Plan

- None.

## Issues Encountered

None.

## User Setup Required

None.

## Next Phase Readiness

- `04-02` now gives Phase 4 aligned runtime-first docs and release guidance.
- The next execution target is `04-03`, which will reconcile `.planning` traceability and state using the same governance contract test.

---
*Phase: 04-release-governance-flow*
*Completed: 2026-04-14*
