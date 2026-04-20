---
phase: 26-import-staging-and-long-session-verification
plan: "01"
subsystem: lifecycle-performance-doc-governance
tags: [docs, governance, lifecycle, performance, release-contract]
requires:
  - phase: 26-import-staging-and-long-session-verification
    provides: Phase 26 context, pattern map, and plan artifacts
provides:
  - Package-first lifecycle/performance documentation for root and adapter surfaces
  - Explicit disposal/diagnostics guidance with best-effort finalizer caveat
  - Governance assertions that fail on lifecycle/performance doc and routing drift
affects: [phase-26, docs, governance-tests]
tech-stack:
  added: []
  patterns: [package-first-lifecycle-guidance, regex-governance-lock, explicit-disposal-authority]
key-files:
  modified:
    - README.md
    - packages/occt-core/README.md
    - docs/sdk/measurement.md
    - AGENTS.md
    - test/release_governance_contract.test.mjs
key-decisions:
  - "Lifecycle docs are package-first (`openManagedExact*`, `dispose`, `getExactModelDiagnostics`) with root APIs kept as lower-level references."
  - "Finalizer semantics are documented as best-effort only; explicit dispose/release remains authoritative."
  - "Governance now explicitly locks perf/soak command routing and keeps those lanes outside the authoritative root release gate."
requirements-completed: [DOCS-04]
duration: n/a
completed: 2026-04-20
---

# Phase 26 Plan 01 Summary

**Lifecycle and performance guidance is now explicitly documented package-first and protected by governance drift tests.**

## Accomplishments

- Added explicit lifecycle/performance workflow docs to:
  - `README.md`
  - `packages/occt-core/README.md`
  - `docs/sdk/measurement.md`
  - `AGENTS.md`
- Published explicit semantics for:
  - package-first managed lifecycle (`openManagedExactModel`, `dispose`, `getExactModelDiagnostics`)
  - lower-level root lifecycle APIs (`RetainExactModel`, `ReleaseExactModel`, `GetExactModelDiagnostics`)
  - `FinalizationRegistry` as best-effort only, never the cleanup contract
- Extended `test/release_governance_contract.test.mjs` to lock:
  - optional perf/soak lanes command routing
  - lifecycle/performance docs coverage across root/package/sdk/agent docs
  - authoritative release-gate boundary preservation

## Verification

- `node --test test/release_governance_contract.test.mjs`

Command passed.
