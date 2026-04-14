---
phase: 04-release-governance-flow
plan: "01"
subsystem: release-governance
tags: [tests, scripts, release, governance]
requires:
  - phase: 03-downstream-consumption-contract
    provides: root package tarball contract and occt-core downstream contract
provides:
  - Canonical root release verification command in `package.json`
  - Governance contract coverage for runtime-first root release command drift
affects: [phase-04, release, docs, planning]
tech-stack:
  added: []
  patterns: [runtime-first-release-command, governance-contract-test]
key-files:
  created:
    - .planning/phases/04-release-governance-flow/04-01-SUMMARY.md
    - test/release_governance_contract.test.mjs
  modified:
    - package.json
key-decisions:
  - "Use `test:release:root` as the single canonical root release verification command instead of a prose-only matrix."
  - "Keep demo, Babylon, and Tauri checks outside the unconditional root release command."
patterns-established:
  - "Release governance is enforced with a repo-local Node contract test rather than manual checklist interpretation."
requirements-completed: [DIST-01]
duration: 8min
completed: 2026-04-14
---

# Phase 04: 04-01 Summary

**The repository now has one canonical runtime-first root release command, and that command is locked by a governance contract test.**

## Performance

- **Duration:** 8 min
- **Started:** 2026-04-14T21:16:00+08:00
- **Completed:** 2026-04-14T21:24:00+08:00
- **Tasks:** 1
- **Files modified:** 3

## Accomplishments

- Added `test/release_governance_contract.test.mjs` to define the authoritative root release command surface.
- Added `scripts["test:release:root"]` to `package.json` with the exact runtime-first chain covering `build:wasm:win`, build/tarball governance tests, `occt-core`, and the full root runtime suite.
- Locked the release command against unconditional `demo`, `playwright`, `tauri`, and Babylon-package gates.

## Task Commits

1. **Task 1: Establish and enforce the authoritative root release command surface** - shipped in this plan's completion commit

## Files Created/Modified

- `test/release_governance_contract.test.mjs` - Added governance assertions for the canonical root release command and secondary-surface exclusions.
- `package.json` - Added the `test:release:root` script.
- `.planning/phases/04-release-governance-flow/04-01-SUMMARY.md` - Recorded plan outcome and verification evidence.

## Decisions Made

- Promoted `test:release:root` to the single root release gate so later docs, skills, and planning artifacts can point at one command.
- Kept fast/full day-to-day entrypoints (`test:wasm:preflight`, `test`) unchanged.

## Deviations from Plan

- None.

## Issues Encountered

- One verification helper command initially failed due to quoting in PowerShell, but the underlying code/test state was green; verification was rerun with simpler commands.

## User Setup Required

None.

## Next Phase Readiness

- `04-01` gives Phase 4 a canonical root release gate.
- The next execution target is `04-02`, which will extend the same governance test into docs and the release skill.

---
*Phase: 04-release-governance-flow*
*Completed: 2026-04-14*
