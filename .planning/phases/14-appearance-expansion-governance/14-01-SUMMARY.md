---
phase: 14-appearance-expansion-governance
plan: "01"
subsystem: governance-docs
tags: [docs, typings, release, appearance, presets, opacity]
requires:
  - phase: 13-appearance-preset-adapter-parity
    provides: shipped appearancePreset/defaultOpacity runtime and adapter contract
provides:
  - Final root/package doc wording for `appearancePreset` and `defaultOpacity`
  - Repo-level agent guidance that names the finalized appearance options explicitly
  - Governance coverage for doc and type-comment drift on the expanded appearance contract
affects: [phase-14, release, downstream-consumers]
tech-stack:
  added: []
  patterns: [docs-first-governance-hardening, type-comment-contract-locking]
key-files:
  created:
    - .planning/phases/14-appearance-expansion-governance/14-01-SUMMARY.md
  modified:
    - README.md
    - packages/occt-core/README.md
    - AGENTS.md
    - dist/occt-js.d.ts
    - test/release_governance_contract.test.mjs
key-decisions:
  - "Document `cad-solid` and `cad-ghosted` as thin bundles over the root default appearance primitives instead of separate rendering modes."
  - "Keep settings persistence and viewer overrides explicitly downstream even while expanding import-time appearance docs."
patterns-established:
  - "Governance tests should fail before docs/type commentary drift reaches a release."
  - "Appearance presets and opacity belong to the import contract, not to viewer-side repaint workflows."
requirements-completed: [ADAPT-06]
duration: 10min
completed: 2026-04-15
---

# Phase 14 Plan 01 Summary

**The expanded appearance contract is now documented and governed as a root/package import surface instead of an implicit runtime detail.**

## Performance

- **Duration:** 10 min
- **Started:** 2026-04-15T22:50:00+08:00
- **Completed:** 2026-04-15T23:00:00+08:00
- **Tasks:** 2
- **Files modified:** 5

## Accomplishments

- Tightened `test/release_governance_contract.test.mjs` so it now requires root/package docs and repo-level guidance to mention `appearancePreset`, `defaultOpacity`, `cad-solid`, `cad-ghosted`, and the downstream settings boundary.
- Updated the root README to describe preset resolution, built-in ghost opacity, explicit override rules, and import-time scope.
- Updated `packages/occt-core/README.md` to document preset forwarding, alpha promotion from `defaultColor`, and explicit `defaultOpacity` precedence.
- Updated `AGENTS.md` and `dist/occt-js.d.ts` comments so repository guidance and packaged typings use the same finalized appearance language.

## Task Commits

Both governance-doc tasks landed together once the red release-governance test turned green:

1. **Task 1: Add failing governance tests for final appearance-expansion docs** - pending current plan commit
2. **Task 2: Update root/package docs and type comments for the finalized appearance contract** - pending current plan commit

## Files Created/Modified

- `test/release_governance_contract.test.mjs` - Added governance assertions for presets, opacity, and explicit downstream boundaries.
- `README.md` - Documented `appearancePreset`, `defaultOpacity`, preset semantics, and import-time override rules.
- `packages/occt-core/README.md` - Documented adapter parity, alpha promotion, and preset/defaultOpacity forwarding.
- `AGENTS.md` - Named the finalized appearance options in repository-level release guidance.
- `dist/occt-js.d.ts` - Tightened public type comments around preset semantics and default opacity behavior.

## Decisions Made

- Documented `cad-solid` as an alias for the existing opaque default appearance rather than implying a second rendering pipeline.
- Documented `cad-ghosted` as a built-in import preset with opacity `0.35`, while keeping explicit `defaultColor` / `defaultOpacity` overrides authoritative in default mode.

## Deviations from Plan

None. This stayed governance-only and did not reopen runtime or adapter logic.

## Issues Encountered

- The expected red step came from the root README missing `appearancePreset`, which confirmed the new governance assertions were actually exercising the gap rather than restating current wording.

## User Setup Required

None.

## Next Phase Readiness

- `14-02` can now lock the packaged tarball contract against the same preset/defaultOpacity wording.
- The final milestone closeout can rely on `npm run test:release:root` to enforce the completed appearance-expansion guidance.

---
*Phase: 14-appearance-expansion-governance*
*Completed: 2026-04-15*
