---
phase: 17-sdk-docs-governance
plan: "02"
subsystem: docs-governance
tags: [release-gate, tarball, package-json, typings, runtime-first]
requires:
  - phase: 17-sdk-docs-governance
    provides: package-first SDK docs and governance wording for the finalized placement/relation surface
provides:
  - Root test and release commands that include placement/relation contract coverage
  - Packaged README/type assertions for the exact measurement SDK
  - Final green `npm run test:release:root` for v1.4
affects: [phase-17, release, governance, package]
tech-stack:
  added: []
  patterns: [authoritative-root-gate, tarball-contract-lock, docs-plus-typings-governance]
key-files:
  created:
    - .planning/phases/17-sdk-docs-governance/17-02-SUMMARY.md
  modified:
    - package.json
    - test/package_tarball_contract.test.mjs
    - test/release_governance_contract.test.mjs
key-decisions:
  - "Placement and relation contract tests are now part of both `npm test` and `npm run test:release:root`."
  - "Packaged root README and published typings together define the distributable exact measurement SDK contract."
  - "The authoritative root release gate remains runtime-first and excludes unconditional demo, Babylon, and Tauri checks."
patterns-established:
  - "New exact-measurement surfaces do not count as shipped until they are in the authoritative root test and release commands."
  - "Tarball assertions lock packaged docs and typings together so downstream vendor consumers do not drift from repo-local guidance."
requirements-completed: [GOV-01]
duration: n/a
completed: 2026-04-16
---

# Phase 17 Plan 02 Summary

**The packaged exact measurement SDK surface is now enforced by the authoritative root test and release gates, including placement and relation contract coverage.**

## Performance

- **Duration:** n/a
- **Tasks:** 2
- **Files modified:** 3

## Accomplishments

- Extended `package.json` so both `npm test` and `npm run test:release:root` now include `test/exact_placement_contract.test.mjs` and `test/exact_relation_contract.test.mjs` alongside the existing pairwise measurement contract.
- Extended `test/package_tarball_contract.test.mjs` so the packed root package now proves the shipped measurement SDK docs and typings in the distributable tarball.
- Extended `test/release_governance_contract.test.mjs` so governance now locks the authoritative root script surface and the placement/relation typing surface.
- Re-ran `npm run test:release:root` and confirmed the full root runtime-first gate stays green with the finalized SDK docs surface.

## Task Commits

The package-script and packaged-contract work landed in the same atomic Phase 17 execution commit as the SDK docs because the authoritative release gate and public docs had to agree on one finalized surface:

1. **Task 1 + Task 2: Lock packaged exact measurement SDK coverage on the root release gate** - `6200bcf` (`docs`)

## Files Created/Modified

- `package.json` - Added placement and relation contract files to the authoritative root test and release commands.
- `test/package_tarball_contract.test.mjs` - Added packaged measurement SDK README/type assertions and package-first boundary checks.
- `test/release_governance_contract.test.mjs` - Locked the authoritative root script surface and the published placement/relation typing contract.

## Decisions Made

- Kept `npm run test:release:root` as the single authoritative release gate instead of creating a second measurement-specific gate.
- Locked packaged docs and typings together because the published SDK contract is what downstream vendor consumers actually receive.
- Kept secondary-surface verification out of the authoritative release command even while broadening exact-measurement coverage.

## Deviations from Plan

- The planned package-script and docs work were committed together once the full release gate was green. No contract-level deviations were introduced.

## Issues Encountered

- None beyond updating the authoritative command expectations and verifying the tarball still stayed root-runtime-only.

## User Setup Required

None.

## Next Phase Readiness

- `v1.4` is now ready for milestone closeout. All roadmap phases are complete, and the root release gate already covers the finalized placement/relation SDK contract.
- Any future work can build on the package-first measurement SDK without reopening the current placement/relation boundary.

---
*Phase: 17-sdk-docs-governance*
*Completed: 2026-04-16*
