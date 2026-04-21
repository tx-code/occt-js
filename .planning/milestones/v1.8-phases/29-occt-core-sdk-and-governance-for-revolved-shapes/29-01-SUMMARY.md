---
phase: 29-occt-core-sdk-and-governance-for-revolved-shapes
plan: "01"
subsystem: occt-core-sdk
tags: [occt-core, package-first, typings, revolved-shape]
requirements-completed: [SDK-01]
completed: 2026-04-21
---

# Phase 29 Plan 01 Summary

**`@tx-code/occt-core` now ships package-first wrappers for the revolved-shape runtime contract.**

## Accomplishments

- Added `validateRevolvedShapeSpec`, `buildRevolvedShape`, and `openExactRevolvedShape` to `OcctCoreClient`.
- Published matching generated-shape types in `packages/occt-core/src/index.d.ts`.
- Preserved the canonical `generated-revolved-shape` source format through normalization and exact-open results.
- Added package tests that assert the wrapper calls the correct Wasm methods and fails explicitly when those methods are missing.

## Verification

- `npm --prefix packages/occt-core test`
- `npm test`

Both commands passed.
