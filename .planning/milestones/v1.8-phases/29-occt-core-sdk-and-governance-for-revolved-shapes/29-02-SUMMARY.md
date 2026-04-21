---
phase: 29-occt-core-sdk-and-governance-for-revolved-shapes
plan: "02"
subsystem: governance-and-docs
tags: [docs, release-governance, root-runtime, revolved-shape]
requirements-completed: [GOV-01]
completed: 2026-04-21
---

# Phase 29 Plan 02 Summary

**The revolved-shape contract is now documented and governance-locked as a generic runtime/package surface.**

## Accomplishments

- Renamed the exported root runtime surface to `ValidateRevolvedShapeSpec`, `BuildRevolvedShape`, and `OpenExactRevolvedShape`.
- Updated root and package docs to describe the contract generically and keep tool semantics limited to downstream demo usage.
- Added release-governance coverage so `npm run test:release:root` enforces the revolved-shape runtime, package wrappers, typings, and docs together.
- Kept demo/preset checks as conditional secondary-surface verification instead of widening the authoritative root gate.

## Verification

- `npm run build:wasm:win`
- `npm --prefix packages/occt-core test`
- `npm test`
- `npm run test:release:root`

All commands passed.
