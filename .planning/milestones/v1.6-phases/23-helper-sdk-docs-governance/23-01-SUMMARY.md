---
phase: 23-helper-sdk-docs-governance
plan: "01"
subsystem: helper-sdk-docs-and-typings
tags: [docs, occt-core, typings, package-contract, helper-sdk]
requires:
  - phase: 23-helper-sdk-docs-governance
    provides: Phase 23 context, patterns, and plan artifacts
  - commit: 5663001
    provides: Final shipped helper-family implementation in `@tx-code/occt-core`
provides:
  - Package-first helper SDK docs across root README, package README, and the deep SDK guide
  - Explicit published typing/export surface for `@tx-code/occt-core`
  - Package-governance coverage locking helper docs, typings, and metadata drift
affects: [phase-23, docs, packages/occt-core, tests]
tech-stack:
  added: []
  patterns: [package-first-helper-doc-split, typed-package-entrypoint, package-governance-doc-lock]
key-files:
  created:
    - .planning/phases/23-helper-sdk-docs-governance/23-01-SUMMARY.md
    - packages/occt-core/src/index.d.ts
    - packages/occt-core/test/package-contract.test.mjs
  modified:
    - README.md
    - docs/sdk/measurement.md
    - packages/occt-core/README.md
    - packages/occt-core/package.json
key-decisions:
  - "The package-first helper SDK lives primarily in `@tx-code/occt-core`; the root README stays a lower-level carrier reference."
  - "Published typings for `@tx-code/occt-core` should be explicit and package-local instead of relying on downstream inference from runtime JS."
  - "Helper-boundary wording now stays intentionally narrow: supported cylindrical holes, supported planar chamfer faces, and midplane-style symmetry only."
patterns-established:
  - "Lock package README wording, export metadata, and typed entrypoints in a focused package-governance suite before widening root release governance."
  - "Keep helper docs layered: concise root carrier overview, package-first README, and the deeper stable SDK guide."
requirements-completed: [DOCS-03]
duration: n/a
completed: 2026-04-18
---

# Phase 23 Plan 01 Summary

**Phase 23 now publishes the helper SDK package-first: `@tx-code/occt-core` ships an explicit typed entrypoint, package-governance tests lock that surface, and the docs now describe the shipped helper family without over-promising broader feature recognition.**

## Performance

- **Duration:** n/a
- **Tasks:** 2
- **Files modified:** 6

## Accomplishments

- Updated the root README to keep `@tx-code/occt-js` as the lower-level carrier reference while naming the shipped helper family exposed through `@tx-code/occt-core`.
- Updated `packages/occt-core/README.md` so the package-first helper surface now documents:
  - `describeExactHole(ref)`
  - `describeExactChamfer(ref)`
  - `suggestExactMidpointPlacement(refA, refB)`
  - `describeExactEqualDistance(refA, refB, refC, refD, options?)`
  - `suggestExactSymmetryPlacement(refA, refB)`
- Replaced the stale “hole/chamfer remain downstream” wording in `docs/sdk/measurement.md` with the shipped narrow helper boundaries and an expanded helper-family walkthrough.
- Added `packages/occt-core/src/index.d.ts` so the package now publishes an explicit typing surface for `createOcctCore`, `OcctCoreClient`, normalized result helpers, exact refs, and the full helper-family API.
- Updated `packages/occt-core/package.json` with a first-class `types` entry and explicit `exports` contract aligned with the typed JS barrel.
- Added `packages/occt-core/test/package-contract.test.mjs` to lock helper SDK doc wording, package metadata, and published typings.
- Verified the plan with:
  - `node --test packages/occt-core/test/package-contract.test.mjs`
  - `npm --prefix packages/occt-core test`

## Files Created/Modified

- `README.md` - Added concise helper-family coverage while preserving the lower-level root carrier framing.
- `docs/sdk/measurement.md` - Expanded the deep guide to cover the shipped helper family and narrow support boundaries.
- `packages/occt-core/README.md` - Documented the helper SDK package-first and clarified downstream boundaries.
- `packages/occt-core/package.json` - Published the package-local typing/export contract.
- `packages/occt-core/src/index.d.ts` - Added the explicit TypeScript surface for the public package API.
- `packages/occt-core/test/package-contract.test.mjs` - Added package-governance assertions for docs, metadata, and typings.

## Decisions Made

- Kept the root README intentionally concise so the primary helper docs remain with the package and stable SDK guide, not duplicated in full at the carrier layer.
- Published package-local typings rather than pointing consumers back at `dist/occt-js.d.ts`, which would blur the root/package boundary.
- Narrowed the helper wording to exactly what is shipped today instead of implying generic semantic feature recognition.

## Deviations from Plan

- No substantive deviations. The implementation stayed within the planned root/package/docs/package-metadata scope.

## Issues Encountered

- None at blocker level. The only material choice was whether to reuse root type names directly; package-local declarations were clearer for the package-first contract.

## User Setup Required

None.

## Next Phase Readiness

- Plan `23-02` can now extend the authoritative root release gate and governance suites around a stable helper doc + package typing surface.
- `DOCS-03` is now satisfied on the documentation/package-surface side; the remaining work is root release governance and contract enforcement.

---
*Phase: 23-helper-sdk-docs-governance*
*Completed: 2026-04-18*
