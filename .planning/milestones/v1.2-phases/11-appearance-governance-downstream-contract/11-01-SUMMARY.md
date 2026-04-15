---
phase: 11-appearance-governance-downstream-contract
plan: "01"
subsystem: docs-typing-contract
tags: [docs, typings, governance, appearance, package-contract]
requires:
  - phase: 10-custom-default-color-adapter-parity
    provides: shipped root/runtime and `occt-core` appearance semantics
provides:
  - Root and `occt-core` docs that describe `colorMode`, `defaultColor`, and the built-in CAD fallback
  - Public typing comments that pin the finalized import appearance option shape
  - Governance tests that fail if docs or typing comments drift from the shipped appearance contract
affects: [phase-11, docs, release-gate, downstream-consumers]
tech-stack:
  added: []
  patterns: [package-first-appearance-docs, governed-typing-comments]
key-files:
  created:
    - .planning/phases/11-appearance-governance-downstream-contract/11-01-SUMMARY.md
  modified:
    - README.md
    - packages/occt-core/README.md
    - dist/occt-js.d.ts
    - AGENTS.md
    - test/release_governance_contract.test.mjs
key-decisions:
  - "Apps own settings persistence; the runtime only consumes import-time appearance options."
  - "Viewer overrides remain downstream concerns even when the import appearance contract is fully documented."
patterns-established:
  - "Docs and typing comments are part of the release-governed package contract, not optional explanatory text."
requirements-completed: []
duration: n/a
completed: 2026-04-15
---

# Phase 11 Plan 01 Summary

**The shipped import appearance contract is now documented and typed where downstream consumers actually consume it: the root package, the `occt-core` adapter, and the public `.d.ts` surface.**

## Performance

- **Duration:** n/a
- **Tasks:** 2
- **Files modified:** 5

## Accomplishments

- Added package-first import appearance guidance to the root README, including `colorMode`, `defaultColor`, the built-in CAD fallback `[0.9, 0.91, 0.93]`, and the legacy `readColors` boundary.
- Added matching `@tx-code/occt-core` README guidance that documents tuple/object `defaultColor` normalization and keeps app-side settings persistence or viewer overrides out of scope.
- Tightened the public typing comments in `dist/occt-js.d.ts` so the finalized appearance option shape is explicit at the published API surface.
- Updated `AGENTS.md` so repo-level release guidance treats `colorMode` and `defaultColor` as part of the root runtime contract.
- Extended release-governance tests to fail if the docs or packaged typing comments drift from the shipped appearance contract.

## Task Commits

Both plan tasks landed together once the red governance tests were in place:

1. **Task 1: Add failing governance tests for appearance docs and typing commentary** - `75312e6` (`docs`)
2. **Task 2: Finalize root/package docs and public typing comments for the appearance contract** - `75312e6` (`docs`)

## Files Created/Modified

- `README.md` - Added package-first import appearance guidance and explicit downstream-boundary language.
- `packages/occt-core/README.md` - Documented adapter-level appearance usage and normalization semantics.
- `dist/occt-js.d.ts` - Clarified the legacy `readColors` boundary and the `defaultColor` applicability comments.
- `AGENTS.md` - Recorded import appearance options as part of the root release boundary.
- `test/release_governance_contract.test.mjs` - Added governance assertions for docs and typing drift.

## Decisions Made

- Kept the built-in CAD fallback visible in both docs and type comments so downstream package consumers do not need repo-local knowledge to interpret default appearance mode.
- Repeated the settings-persistence and viewer-override boundary in both root and adapter docs to prevent later milestones from quietly pulling UI behavior into the runtime contract.

## Deviations from Plan

- No substantive deviations. The work stayed in docs, typing comments, and governance tests without reopening runtime or adapter behavior.

## Issues Encountered

- No blockers surfaced after the failing governance tests were in place.

## User Setup Required

None.

## Next Phase Readiness

- `11-02` can now treat the documented root/package appearance contract as authoritative and lock it into packaged tarball and release-gate coverage.

---
*Phase: 11-appearance-governance-downstream-contract*
*Completed: 2026-04-15*
