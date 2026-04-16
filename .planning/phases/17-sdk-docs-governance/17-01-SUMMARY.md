---
phase: 17-sdk-docs-governance
plan: "01"
subsystem: docs-governance
tags: [docs, sdk, placement, relations, package-first]
requires:
  - phase: 16-exact-relation-classifier-contract
    provides: shipped root and `occt-core` placement/relation runtime surface
provides:
  - Package-first exact measurement SDK docs for `@tx-code/occt-core`
  - Lower-level root Wasm reference guidance for placement and relation entrypoints
  - Governance assertions for SDK docs and Phase 17 readiness
affects: [phase-17, docs, governance]
tech-stack:
  added: [markdown-docs]
  patterns: [package-first-docs, lower-level-root-reference, downstream-boundary-docs]
key-files:
  created:
    - .planning/phases/17-sdk-docs-governance/17-01-SUMMARY.md
    - docs/sdk/measurement.md
  modified:
    - README.md
    - packages/occt-core/README.md
    - test/release_governance_contract.test.mjs
key-decisions:
  - "`@tx-code/occt-core` is the primary documented entry point for exact measurement workflows."
  - "The root README stays a lower-level Wasm reference instead of becoming the main SDK tutorial."
  - "Overlay rendering, label layout, and measurement UX remain explicitly downstream concerns in every SDK doc."
patterns-established:
  - "Measurement docs stay package-first while the root release boundary remains authoritative."
  - "A dedicated SDK guide carries the longer walkthrough so root/package READMEs can stay concise."
requirements-completed: [DOCS-01]
duration: n/a
completed: 2026-04-16
---

# Phase 17 Plan 01 Summary

**The exact measurement SDK is now documented package-first through `@tx-code/occt-core`, with the root Wasm carrier kept as the lower-level reference and downstream viewer concerns kept out of scope.**

## Performance

- **Duration:** n/a
- **Tasks:** 2
- **Files modified:** 4

## Accomplishments

- Reworked the root README so it now describes the exact measurement SDK instead of stopping at pairwise measurement only.
- Updated `packages/occt-core/README.md` to document package-first placement helpers and relation classification alongside the existing pairwise APIs.
- Added `docs/sdk/measurement.md` as a dedicated SDK guide covering exact refs, pairwise measurement, placement helpers, relation classification, and the root-carrier fallback surface.
- Extended `test/release_governance_contract.test.mjs` so governance now fails if the package-first docs, the dedicated SDK guide, or the downstream-boundary wording drift from the shipped SDK contract.

## Task Commits

The docs and governance changes landed together with the authoritative package-script updates because the Phase 17 surface was finalized as one SDK contract:

1. **Task 1 + Task 2: Finalize package-first SDK docs and governance wording** - `6200bcf` (`docs`)

## Files Created/Modified

- `README.md` - Reframed exact measurement as an SDK surface with package-first guidance and lower-level root reference examples.
- `packages/occt-core/README.md` - Added package-first placement and relation helper guidance.
- `docs/sdk/measurement.md` - Added the dedicated measurement SDK guide.
- `test/release_governance_contract.test.mjs` - Added governance assertions for SDK docs and downstream-boundary wording.

## Decisions Made

- Made `@tx-code/occt-core` the default documented path for downstream JS consumers.
- Kept the root README additive and lower-level instead of turning it into the primary SDK tutorial.
- Repeated the downstream-boundary wording in all public docs so viewer and app behavior do not creep into the runtime/package contract.

## Deviations from Plan

- The planned docs and package-script work landed in one atomic execution commit. The shipped docs still match the plan exactly: package-first SDK walkthroughs plus governance coverage.

## Issues Encountered

- None beyond normal wording alignment across root docs, package docs, and the new dedicated SDK guide.

## User Setup Required

None.

## Next Phase Readiness

- `17-02` can focus entirely on package scripts, tarball assertions, and the final root release gate because the package-first docs surface is now stable.
- The SDK guide now gives downstream consumers a canonical reference point for future additive measurement work.

---
*Phase: 17-sdk-docs-governance*
*Completed: 2026-04-16*
