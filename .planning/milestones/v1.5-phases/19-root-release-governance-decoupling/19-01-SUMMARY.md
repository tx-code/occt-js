---
phase: 19-root-release-governance-decoupling
plan: "01"
subsystem: root-release-governance
tags: [release-gate, planning-audit, root-tests, package-json]
requires:
  - phase: 19-root-release-governance-decoupling
    provides: Phase 19 context, patterns, and plan artifacts
provides:
  - Root release governance no longer depends on live `.planning` archive-state assertions
  - Separate `test:planning:audit` command and planning audit suite outside `npm run test:release:root`
  - Passing governance coverage for both root release and planning-audit command surfaces
affects: [phase-19, root, tests, planning]
tech-stack:
  added: []
  patterns: [split-governance-lanes, root-source-text-assertions, explicit-maintainer-command]
key-files:
  created:
    - .planning/phases/19-root-release-governance-decoupling/19-01-SUMMARY.md
    - test/planning_archive_contract.test.mjs
  modified:
    - package.json
    - test/release_governance_contract.test.mjs
key-decisions:
  - "The authoritative root release gate stays on publishable runtime/package/docs coverage only."
  - "Any retained `.planning` audit is surfaced as `npm run test:planning:audit` instead of living inside `npm run test:release:root`."
  - "The planning audit validates the current planning corpus intentionally instead of hardcoding the old archived-v1.4/no-active-milestone state."
patterns-established:
  - "When release governance mixes publishable contract checks with repo-process checks, split the process checks into a separate explicit maintainer command rather than weakening the root gate."
  - "Planning audits should validate the current `.planning` state generically, not freeze one historical milestone state as a permanent release truth."
requirements-completed: [GOV-02, GOV-03]
duration: n/a
completed: 2026-04-17
---

# Phase 19 Plan 01 Summary

**The authoritative root release governance lane now ignores live `.planning` archive-state drift, and any retained planning audit runs from a separate explicit maintainer command.**

## Performance

- **Duration:** n/a
- **Tasks:** 1
- **Files modified:** 3

## Accomplishments

- Added `test:planning:audit` to the root `package.json` scripts so planning/archive verification is explicitly discoverable without being bundled into `npm run test:release:root`.
- Removed the brittle archived-v1.4 / no-active-milestone `.planning` assertions from `test/release_governance_contract.test.mjs` and kept that file focused on publishable root runtime/package/docs governance.
- Added `test/planning_archive_contract.test.mjs` as a separate planning audit that validates the active milestone corpus, completed phase artifacts, and archived milestone links generically for the current repo state.
- Verified the split with `node --test test/release_governance_contract.test.mjs`, `node --test test/planning_archive_contract.test.mjs`, `npm run test:planning:audit`, and the full `npm run test:release:root` gate.

## Task Commits

Implementation landed in a shared execution commit with Plan `19-02` because both plans needed coordinated edits in `test/release_governance_contract.test.mjs`:

1. **Plans 19-01 and 19-02 combined implementation:** `14cb2a7` (`test(19): decouple root release governance from planning audit`)

## Files Created/Modified

- `package.json` - Added the separate `test:planning:audit` command while leaving `test:release:root` focused on the authoritative root gate.
- `test/release_governance_contract.test.mjs` - Removed live `.planning` archive-state coupling and added a guard that the root release command does not absorb planning-audit coverage.
- `test/planning_archive_contract.test.mjs` - Added a dedicated planning-audit suite for active-milestone consistency, completed phase artifacts, and archive link retention.

## Decisions Made

- Kept the release-governance suite source-text based instead of introducing a heavier planning parser just for this split.
- Preserved the existing release command string so the authoritative root gate stayed stable while its underlying governance assertions became cleaner.
- Made the planning audit generic to the current repo state so starting a new milestone does not automatically break release verification again.

## Deviations from Plan

- No substantive deviations. The only practical adjustment was landing Plans `19-01` and `19-02` in one implementation commit because they shared the same governance test file.

## Issues Encountered

- `gsd-tools audit-open` remains broken, so the separate planning-audit lane stayed as a plain Node test command rather than integrating with the existing tool.

## User Setup Required

None.

## Next Phase Readiness

- Plan `19-02` can now align README, AGENTS, package docs, and the release skill to the new root-gate/planning-audit split.
- Phase 19 is ready for phase-level verification once the documentation alignment plan is summarized.

---
*Phase: 19-root-release-governance-decoupling*
*Completed: 2026-04-17*
