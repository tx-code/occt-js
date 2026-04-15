---
phase: 14-appearance-expansion-governance
plan: "02"
subsystem: package-governance
tags: [tarball, release, governance, appearance, presets, opacity]
requires:
  - phase: 14-appearance-expansion-governance
    provides: finalized appearance docs and type commentary
provides:
  - Packaged README and typing checks for the finalized preset/defaultOpacity contract
  - Release-governance coverage that proves the tarball contract mentions presets and opacity
  - A fresh green `npm run test:release:root` against the completed appearance-expansion surface
affects: [phase-14, release, downstream-consumers]
tech-stack:
  added: []
  patterns: [tarball-contract-hardening, runtime-first-release-closeout]
key-files:
  created:
    - .planning/phases/14-appearance-expansion-governance/14-02-SUMMARY.md
  modified:
    - test/package_tarball_contract.test.mjs
    - test/release_governance_contract.test.mjs
    - .planning/ROADMAP.md
    - .planning/REQUIREMENTS.md
    - .planning/STATE.md
key-decisions:
  - "Keep the packaged contract anchored to the root README and `dist/occt-js.d.ts` rather than widening tarball checks into secondary surfaces."
  - "Use the authoritative `npm run test:release:root` gate as the final proof point for the appearance-expansion milestone."
patterns-established:
  - "Release governance should assert not just runtime behavior but also that the packaged test corpus covers the intended surface."
  - "Milestone closeout state should move only after a fresh full release gate succeeds."
requirements-completed: [ADAPT-06]
duration: 9min
completed: 2026-04-15
---

# Phase 14 Plan 02 Summary

**The packaged root contract now explicitly locks the final preset and opacity guidance, and the authoritative root release gate is green against that completed surface.**

## Performance

- **Duration:** 9 min
- **Started:** 2026-04-15T23:00:00+08:00
- **Completed:** 2026-04-15T23:09:00+08:00
- **Tasks:** 2
- **Files modified:** 5

## Accomplishments

- Tightened `test/release_governance_contract.test.mjs` so governance now requires `test/package_tarball_contract.test.mjs` to cover `appearancePreset`, `defaultOpacity`, and `cad-ghosted`.
- Extended `test/package_tarball_contract.test.mjs` so the packaged README and public typings must mention the finalized preset/defaultOpacity contract and built-in ghost opacity.
- Re-ran `npm run test:release:root` successfully after the package-governance updates.
- Advanced roadmap, requirements, and state tracking to Phase 14 complete with the milestone ready for closeout.

## Task Commits

Both package-governance tasks landed together once the combined package/governance tests and full release gate were green:

1. **Task 1: Add failing packaged-contract checks for presets and opacity** - pending current plan commit
2. **Task 2: Re-run the authoritative root release gate against the finalized governance surface** - pending current plan commit

## Files Created/Modified

- `test/package_tarball_contract.test.mjs` - Added packaged README/type assertions for `appearancePreset`, `defaultOpacity`, and `cad-ghosted`.
- `test/release_governance_contract.test.mjs` - Added governance checks proving the tarball contract itself covers the finalized appearance surface and advanced planning-state assertions to Phase 14 complete.
- `.planning/ROADMAP.md` - Marked Phase 14 complete.
- `.planning/REQUIREMENTS.md` - Marked `ADAPT-06` complete.
- `.planning/STATE.md` - Moved the project to milestone-closeout readiness.

## Decisions Made

- Kept package verification scoped to the published root carrier instead of introducing `demo/`, Babylon, or Tauri assertions into tarball governance.
- Used the existing runtime-first release command as the final milestone proof rather than inventing a second closeout command.

## Deviations from Plan

None. The plan stayed package-first and finished with the canonical release gate.

## Issues Encountered

- The red step was exactly the intended one: release governance failed because `test/package_tarball_contract.test.mjs` still lagged the shipped preset/defaultOpacity contract.

## User Setup Required

None.

## Next Phase Readiness

- `v1.3 Appearance Expansion` is ready for milestone closeout and archive.
- The next milestone can build on a fully-governed appearance import surface instead of revisiting preset/opacity documentation drift.

---
*Phase: 14-appearance-expansion-governance*
*Completed: 2026-04-15*
