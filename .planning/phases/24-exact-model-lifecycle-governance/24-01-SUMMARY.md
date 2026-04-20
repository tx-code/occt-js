---
phase: 24-exact-model-lifecycle-governance
plan: "01"
subsystem: root-lifecycle-runtime
tags: [exact-lifecycle, diagnostics, wasm, bindings, root-contract]
requires:
  - phase: 24-exact-model-lifecycle-governance
    provides: Phase 24 context, patterns, and plan artifacts
provides:
  - Additive root lifecycle diagnostics snapshot API for retained exact-model handles
  - Deterministic released-handle behavior validation across representative exact-query paths
  - Root lifecycle typings and contract tests aligned with the new diagnostics surface
affects: [phase-24, src, dist, root-tests]
tech-stack:
  added: []
  patterns: [explicit-pull-diagnostics, deterministic-lifecycle-failure-codes, additive-runtime-typing]
key-files:
  modified:
    - src/importer.hpp
    - src/exact-model-store.hpp
    - src/exact-model-store.cpp
    - src/js-interface.cpp
    - dist/occt-js.d.ts
    - test/exact_model_lifecycle_contract.test.mjs
key-decisions:
  - "Diagnostics remain explicit and pull-based through `GetExactModelDiagnostics()` instead of implicit logging or viewer policy."
  - "The authoritative lifecycle contract remains integer `exactModelId` handles plus explicit retain/release."
  - "Released-handle behavior remains deterministic for retained query entry points."
requirements-completed: [LIFE-01, LIFE-02]
duration: n/a
completed: 2026-04-20
---

# Phase 24 Plan 01 Summary

**The root runtime now exposes additive exact-model lifecycle diagnostics while preserving deterministic typed failures for released handles.**

## Accomplishments

- Added root diagnostics DTOs (`OcctExactModelDiagnostics*`) and `ExactModelStore::GetDiagnostics()` with stable sorted live-entry output.
- Bound `GetExactModelDiagnostics()` through Embind and typed it in `dist/occt-js.d.ts`.
- Extended `test/exact_model_lifecycle_contract.test.mjs` with:
  - `GetExactModelDiagnostics reports live retained exact handles with stable metadata`
  - `GetExactModelDiagnostics shrinks after final release and retains released-handle history`
  - `representative exact queries return released-handle after final release`
- Kept lifecycle behavior additive: no replacement of `RetainExactModel` / `ReleaseExactModel`, no viewer/session policy.

## Verification

- `npm run build:wasm:win`
- `node --test test/exact_model_lifecycle_contract.test.mjs`

Both commands passed.

