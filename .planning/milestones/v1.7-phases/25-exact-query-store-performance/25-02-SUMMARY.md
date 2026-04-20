---
phase: 25-exact-query-store-performance
plan: "02"
subsystem: iges-staging-and-perf-lane
tags: [iges, import-staging, orientation, performance, benchmarking]
requires:
  - phase: 25-exact-query-store-performance
    provides: Phase 25 context, pattern map, and plan artifacts
  - file: .planning/phases/25-exact-query-store-performance/25-01-SUMMARY.md
    provides: Store/query hot-path optimization baseline from Plan 25-01
provides:
  - Shared IGES temp-file staging helper reused by both XDE import and orientation flows
  - Deterministic repeat-run parity checks for IGES import and IGES orientation paths
  - Explicit maintainer-facing performance command with stable JSON metrics schema
affects: [phase-25, src, root-tests, maintainer-workflows]
tech-stack:
  added: []
  patterns: [shared-iges-staging-helper, collision-safe-temp-naming, explicit-perf-lane]
key-files:
  created:
    - src/importer-iges-staging.hpp
    - src/importer-iges-staging.cpp
    - test/test_perf_exact_workflows.mjs
  modified:
    - src/importer-xde.cpp
    - src/orientation.cpp
    - test/test_iges_degenerated_edges.mjs
    - test/test_optimal_orientation_api.mjs
    - package.json
key-decisions:
  - "IGES stays on file-based staging in Phase 25; `ReadStream` migration remains deferred."
  - "Staging deduplication is enforced via one shared helper with collision-safe temp naming and cleanup behavior."
  - "Timing-sensitive visibility is isolated in `npm run test:perf:exact` instead of unconditional release gates."
requirements-completed: [PERF-01, PERF-02]
duration: n/a
completed: 2026-04-20
---

# Phase 25 Plan 02 Summary

**IGES import/orientation now share one staging implementation, and large-model performance visibility is exposed through a dedicated perf lane.**

## Accomplishments

- Added shared IGES staging utility:
  - `src/importer-iges-staging.hpp`
  - `src/importer-iges-staging.cpp`
- Replaced duplicated IGES temp-file staging blocks in both:
  - `src/importer-xde.cpp`
  - `src/orientation.cpp`
- Extended deterministic IGES parity coverage:
  - `test/test_iges_degenerated_edges.mjs` now validates repeat-import topology parity
  - `test/test_optimal_orientation_api.mjs` now validates repeat IGES orientation stability for strategy/unit/bbox fields
- Added explicit performance lane:
  - `test/test_perf_exact_workflows.mjs`
  - `npm run test:perf:exact`
- Perf script emits stable JSON metrics per scenario (`scenario`, `iterations`, `operationCount`, `elapsedMs`, `opsPerSecond`) without threshold-based pass/fail gates.

## Verification

- `npm run build:wasm:win`
- `node test/test_iges_degenerated_edges.mjs`
- `node test/test_optimal_orientation_api.mjs`
- `node test/test_perf_exact_workflows.mjs`
- `npm test`

All commands passed.
