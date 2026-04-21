---
phase: 32-occt-core-sdk-and-governance-for-profile-solids
plan: "01"
subsystem: occt-core-sdk
tags: [occt-core, package-first, typings, profile2d, extruded-shape]
requirements-completed: [SDK-02]
completed: 2026-04-21
---

# Phase 32 Plan 01 Summary

**`@tx-code/occt-core` now mirrors the shared-profile and extruded-shape runtime contract package-first.**

## Outcome

Completed the package-first SDK layer for shared profiles and extruded shapes in `@tx-code/occt-core`.

- Added `validateProfile2DSpec`, `validateExtrudedShapeSpec`, `buildExtrudedShape`, and `openExactExtrudedShape` wrappers to `OcctCoreClient`.
- Extended `packages/occt-core/src/index.d.ts` so the package surface now mirrors the shipped root `Profile2D` and extruded-shape DTOs additively.
- Taught `normalizeOcctResult(...)` and `normalizeExactOpenResult(...)` to preserve `generated-extruded-shape` source format and additive `extrudedShape` metadata alongside the existing revolved-family path.
- Added package tests that fail on wrapper drift, missing-method behavior, and normalized extruded metadata loss.

## Files Changed

- `packages/occt-core/src/occt-core.js`
- `packages/occt-core/src/index.d.ts`
- `packages/occt-core/src/model-normalizer.js`
- `packages/occt-core/test/core.test.mjs`
- `packages/occt-core/test/package-contract.test.mjs`

## Verification

- `npm --prefix packages/occt-core test`

## Notes

- The package wrapper model remains intentionally thin: build/openExact wrappers still return raw root payloads, while `normalizeOcctResult(...)` and `normalizeExactOpenResult(...)` remain the optional canonical-geometry helpers.
