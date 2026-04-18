---
phase: 19-root-release-governance-decoupling
plan: "02"
subsystem: release-docs-governance
tags: [docs, agents, package-readme, skill, governance-tests]
requires:
  - phase: 19-root-release-governance-decoupling
    provides: Root release gate and planning-audit command split from Plan 19-01
provides:
  - README, AGENTS, package README, and release skill aligned to one runtime-first root gate plus one separate planning audit path
  - Governance test coverage that locks the updated docs wording in place
  - Full root release gate validation under the active v1.5 milestone
affects: [phase-19, docs, root, tests]
tech-stack:
  added: []
  patterns: [mirrored-release-guidance, thin-skill-shim, release-doc-source-text-assertions]
key-files:
  created:
    - .planning/phases/19-root-release-governance-decoupling/19-02-SUMMARY.md
  modified:
    - README.md
    - AGENTS.md
    - packages/occt-core/README.md
    - .codex/skills/releasing-occt-js/SKILL.md
    - test/release_governance_contract.test.mjs
key-decisions:
  - "Release-facing docs should all describe the same root gate vs planning-audit split instead of relying on AGENTS-only tribal knowledge."
  - "The release skill remains a thin AGENTS shim and mentions the planning audit only as a separate optional process check."
  - "Conditional demo/Babylon/Tauri verification wording stays explicit so Phase 19 does not accidentally absorb Phase 20 scope."
patterns-established:
  - "When repo policy changes, update README, AGENTS, package README, and the thin release skill together, then lock the new wording with source-text assertions."
  - "Separate process audits should be documented explicitly, but always as optional paths outside the authoritative root release gate."
requirements-completed: [DOCS-02]
duration: n/a
completed: 2026-04-17
---

# Phase 19 Plan 02 Summary

**Release-facing docs now tell one consistent story: `npm run test:release:root` is the authoritative runtime-first gate, and `npm run test:planning:audit` is a separate optional planning/process audit.**

## Performance

- **Duration:** n/a
- **Tasks:** 1
- **Files modified:** 5

## Accomplishments

- Updated `README.md` to document the separate `npm run test:planning:audit` path immediately below the authoritative root release gate, with explicit wording that the planning audit is not part of root npm release verification.
- Updated `AGENTS.md` to surface the planning audit alongside the root release gate, preserve conditional secondary-surface verification, and keep `.planning` audits outside the authoritative root release boundary.
- Updated `packages/occt-core/README.md` and `.codex/skills/releasing-occt-js/SKILL.md` so package-first guidance and the thin release skill mirror the same gate split instead of drifting away from repo policy.
- Extended `test/release_governance_contract.test.mjs` with doc assertions that lock the new planning-audit wording across README, AGENTS, package README, and the release skill.
- Re-verified the final state with `node --test test/release_governance_contract.test.mjs`, `npm run test:planning:audit`, and the full `npm run test:release:root` gate.

## Task Commits

Implementation landed in the same execution commit as Plan `19-01` because the release-governance contract test needed one coordinated update across code and docs:

1. **Plans 19-01 and 19-02 combined implementation:** `14cb2a7` (`test(19): decouple root release governance from planning audit`)

## Files Created/Modified

- `README.md` - Added the separate planning-audit command and clarified it is outside the authoritative root release gate.
- `AGENTS.md` - Added explicit planning-audit guidance under build/test entrypoints, testing expectations, and release boundaries.
- `packages/occt-core/README.md` - Added the separate planning-audit note while preserving package-first runtime guidance.
- `.codex/skills/releasing-occt-js/SKILL.md` - Kept the release skill thin while making the optional planning audit explicit.
- `test/release_governance_contract.test.mjs` - Added doc assertions that lock the new release-gate/planning-audit split.

## Decisions Made

- Documented the planning audit in every touched release-facing surface instead of leaving it implicit in `package.json` alone.
- Preserved the semver-vs-milestone guidance in `AGENTS.md` unchanged apart from the new planning-audit path.
- Kept the package README concise and downstream-focused, adding only the minimum note needed to prevent release-process ambiguity.

## Deviations from Plan

- No substantive deviations. The implementation followed the planned doc surfaces and verification commands directly.

## Issues Encountered

- None after the governance split from Plan `19-01` was in place. The updated docs assertions and full root release gate passed on the first verification run.

## User Setup Required

None.

## Next Phase Readiness

- Phase 19 is ready for phase-level verification and closure.
- Phase 20 can now focus on conditional secondary-surface verification discoverability without re-litigating the authoritative root release gate.

---
*Phase: 19-root-release-governance-decoupling*
*Completed: 2026-04-17*
