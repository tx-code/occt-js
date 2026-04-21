---
phase: 32-occt-core-sdk-and-governance-for-profile-solids
verified: 2026-04-21T12:08:06.3064174+08:00
status: passed
score: 3/3 must-haves verified
overrides_applied: 0
---

# Phase 32 Verification Report

**Phase Goal:** Shared profiles and extruded shapes ship package-first through `@tx-code/occt-core`, published typings, docs, and authoritative release coverage.
**Status:** passed

## Must-Have Truths

| # | Truth | Status | Evidence |
| --- | --- | --- | --- |
| 1 | `@tx-code/occt-core` exposes typed wrappers for shared-profile validation and extruded-shape validate, build, and exact-open flows. | ✓ VERIFIED | `packages/occt-core/src/occt-core.js`, `packages/occt-core/src/index.d.ts`, and `packages/occt-core/test/core.test.mjs` cover the package-first wrapper surface. |
| 2 | Normalized package helpers preserve additive `generated-extruded-shape` metadata and geometry bindings for downstream consumers. | ✓ VERIFIED | `packages/occt-core/src/model-normalizer.js` and `packages/occt-core/test/core.test.mjs` preserve `generated-extruded-shape` source format, `extrudedShape` metadata, and `geometryId` attachment. |
| 3 | Root/package docs, tarball checks, and the authoritative release gate fail on drift in the shared-profile or extruded-shape contract without widening unconditional secondary-surface checks. | ✓ VERIFIED | `README.md`, `packages/occt-core/README.md`, `test/package_tarball_contract.test.mjs`, and `test/release_governance_contract.test.mjs` lock the package-first contract and release-boundary wording. |

## Command Verification

| Command | Result |
| --- | --- |
| `npm --prefix packages/occt-core test` | PASS |
| `node --test test/release_governance_contract.test.mjs test/package_tarball_contract.test.mjs` | PASS |
| `npm run test:planning:audit` | PASS |
| `npm test` | PASS |
| `npm run test:release:root` | PASS |

## Requirement Coverage

| Requirement | Status | Evidence |
| --- | --- | --- |
| `SDK-02` | ✓ SATISFIED | `@tx-code/occt-core` ships package-first wrappers and typings for shared profiles plus extruded-shape validate/build/exact-open flows |
| `GOV-02` | ✓ SATISFIED | Docs, typings, tarball coverage, and the authoritative root release gate all fail on profile-solid contract drift |

## Conclusion

Phase 32 is complete and verified. `v1.9` execution is fully complete and ready for milestone audit and archive workflow.
