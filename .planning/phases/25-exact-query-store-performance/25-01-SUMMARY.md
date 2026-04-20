---
phase: 25-exact-query-store-performance
plan: "01"
subsystem: exact-query-store-hotpath
tags: [exact-query, exact-model-store, lifecycle, performance, root-tests]
requires:
  - phase: 25-exact-query-store-performance
    provides: Phase 25 context, pattern map, and plan artifacts
provides:
  - Non-copy retained geometry lookup path for exact-query hot operations
  - Deterministic retained-query loop contract coverage for lifecycle/performance regression detection
  - Root test routing updated to include the retained-query performance contract lane
affects: [phase-25, src, root-tests]
tech-stack:
  added: []
  patterns: [single-shape-retained-lookup, deterministic-loop-contract-tests, lifecycle-failure-parity]
key-files:
  modified:
    - src/exact-model-store.hpp
    - src/exact-model-store.cpp
    - src/exact-query.cpp
    - test/exact_query_store_performance_contract.test.mjs
    - package.json
key-decisions:
  - "Hot-path optimization is implemented by fetching one retained geometry shape under store lock instead of copying full `ExactModelEntry` payloads."
  - "Lifecycle/query failure semantics remain unchanged (`released-handle`, `invalid-handle`, `invalid-id`) after optimization."
  - "Regression evidence stays deterministic (result invariants) and intentionally avoids wall-clock assertions."
requirements-completed: [PERF-01]
duration: n/a
completed: 2026-04-20
---

# Phase 25 Plan 01 Summary

**Retained exact-query operations now avoid full-entry copy overhead while preserving deterministic lifecycle failure semantics.**

## Accomplishments

- Added `ExactModelStore::GetGeometryShape(...)` to retrieve retained geometry handles without copying the whole `ExactModelEntry` (including `exactGeometryShapes` vector) on every query call.
- Refactored `src/exact-query.cpp` lookup plumbing to consume the non-copy store path directly.
- Added `test/exact_query_store_performance_contract.test.mjs` with:
  - `retained query loop keeps deterministic success payloads for live models`
  - `released-handle after loop stays deterministic for representative exact queries`
  - `deterministic query-loop contract avoids wall-clock thresholds`
- Wired the new contract suite into root `npm test`.

## Verification

- `npm run build:wasm:win`
- `node --test test/exact_model_lifecycle_contract.test.mjs test/exact_query_store_performance_contract.test.mjs`
- `npm test`

All commands passed.
