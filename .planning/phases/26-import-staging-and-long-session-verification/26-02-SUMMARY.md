---
phase: 26-import-staging-and-long-session-verification
plan: "02"
subsystem: soak-verification-and-governance-routing
tags: [soak, lifecycle, performance, verification, command-surface]
requires:
  - phase: 26-import-staging-and-long-session-verification
    provides: Phase 26 context, pattern map, and plan artifacts
  - file: .planning/phases/26-import-staging-and-long-session-verification/26-01-SUMMARY.md
    provides: Lifecycle/performance documentation and governance baseline
provides:
  - Explicit long-session soak command for lifecycle/performance evidence
  - Structured soak verification script for repeated open/query/dispose flows
  - Committed phase-scoped soak report artifact for milestone closeout
affects: [phase-26, package-scripts, test-scripts, verification-artifacts]
tech-stack:
  added: []
  patterns: [optional-soak-lane, deterministic-lifecycle-soak, report-backed-closeout-evidence]
key-files:
  created:
    - test/test_exact_lifecycle_soak.mjs
    - .planning/phases/26-import-staging-and-long-session-verification/26-SOAK-REPORT.md
  modified:
    - package.json
    - test/release_governance_contract.test.mjs
    - README.md
    - packages/occt-core/README.md
key-decisions:
  - "Long-session verification is exposed via explicit optional command `test:soak:exact`, not as an unconditional root gate."
  - "Soak evidence is report-backed and phase-scoped to support milestone closure review."
  - "Authoritative root release gate remains runtime-first and unchanged in scope."
requirements-completed: [GOV-05, DOCS-04]
duration: n/a
completed: 2026-04-20
---

# Phase 26 Plan 02 Summary

**Phase 26 now ships an explicit long-session lifecycle/performance soak lane with report-backed evidence while preserving root release-gate boundaries.**

## Accomplishments

- Added explicit soak command routing in `package.json`:
  - `npm run test:soak:exact`
- Added deterministic soak script:
  - `test/test_exact_lifecycle_soak.mjs`
  - exercises repeated open/query/release cycles and checks deterministic released-handle behavior plus diagnostics convergence
- Ran soak and committed report evidence:
  - `.planning/phases/26-import-staging-and-long-session-verification/26-SOAK-REPORT.md`
- Ensured governance keeps perf/soak lanes optional and outside `npm run test:release:root`.

## Verification

- `npm run test:soak:exact`
- `npm run test:perf:exact`
- `node --test test/release_governance_contract.test.mjs`
- `npm test`
- `npm run test:release:root`

All commands passed.
