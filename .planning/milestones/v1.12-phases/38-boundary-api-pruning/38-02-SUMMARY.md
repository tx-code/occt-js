---
phase: 38-boundary-api-pruning
plan: "02"
subsystem: package-contract-hardening
tags: [package, governance, boundary, docs, tdd]
requires:
  - phase: 38-boundary-api-pruning
    provides: Phase 38 context, research, and demo-seam cleanup baseline
  - file: .planning/phases/38-boundary-api-pruning/38-02-PLAN.md
    provides: Package/export hardening requirements for the reduced surface
provides:
  - Stronger package contract coverage against leaked demo-local routing/session semantics
  - Minimal package-facing README wording aligned with the reduced current-result measurement contract
  - Explicit proof that the published occt-core barrel/types stayed minimal without widening the root release gate
affects: [phase-38, package-contract, governance]
tech-stack:
  added: []
  patterns: [negative-contract-coverage, minimal-doc-fix, tdd]
key-files:
  modified:
    - packages/occt-core/README.md
    - packages/occt-core/test/package-contract.test.mjs
    - test/release_governance_contract.test.mjs
key-decisions:
  - "The published `@tx-code/occt-core` JS/type barrel was left unchanged because the audit confirmed it was already minimal and did not leak demo-local helpers."
  - "Phase 38 fixed the remaining package-facing drift through stronger negative contract tests and one minimal README sentence, not through gratuitous API churn."
  - "Package-facing wording now describes `supported exact action routing` and `current-result session behavior` as downstream concerns instead of the older `selection-to-measure mapping` / `transient run history` phrasing."
requirements-completed: [BOUND-01, SDK-04]
duration: n/a
completed: 2026-04-21
---

# Phase 38 Plan 02 Summary

**The package-side boundary cleanup is now complete: `@tx-code/occt-core` keeps the same minimal export surface, while package-facing docs and contract tests now explicitly reject leaked demo-local routing/session semantics.**

## Accomplishments

- Strengthened [packages/occt-core/test/package-contract.test.mjs](/E:/Coding/occt-js/packages/occt-core/test/package-contract.test.mjs:1):
  - added negative coverage against demo-local names such as `deriveDemoMeasurementActions`, `runDemoMeasurementAction`, `currentMeasurement`, and `measurementRuns`
  - added JS barrel assertions proving the published `index.js` surface remains aligned with retained package exports
  - added package README contract assertions for downstream-owned action/session semantics
- Strengthened [test/release_governance_contract.test.mjs](/E:/Coding/occt-js/test/release_governance_contract.test.mjs:1) so governance now also locks the package-facing `occt-core` measurement boundary language without widening `npm run test:release:root`.
- Applied the smallest truthful package-facing fix in [packages/occt-core/README.md](/E:/Coding/occt-js/packages/occt-core/README.md:222):
  - replaced stale `selection-to-measure mapping` / `transient run history` wording
  - clarified that `supported exact action routing` and `current-result session behavior` remain downstream app concerns
- Deliberately left [packages/occt-core/src/index.js](/E:/Coding/occt-js/packages/occt-core/src/index.js:1) and [index.d.ts](/E:/Coding/occt-js/packages/occt-core/src/index.d.ts:1) unchanged because the audit showed they were already minimal and did not publish demo-local helpers.

## Verification

- `npm --prefix packages/occt-core test`
- `node --test test/release_governance_contract.test.mjs`

All commands passed on 2026-04-21.

## Process Notes

- `superpowers:test-driven-development` was followed for this plan: the new package/governance contract expectations were written first, verified red against stale package README wording, then driven green through one minimal package-facing contract fix.
- `superpowers:verification-before-completion` was satisfied with fresh package and governance verification before closeout.
- `superpowers:requesting-code-review` was intentionally skipped because the repository rules require explicit user permission before spawning delegated review agents, and that permission was not granted in this turn.
