---
phase: 29-occt-core-sdk-and-governance-for-revolved-shapes
verified: 2026-04-21T09:37:03.7132817+08:00
status: passed
score: 2/2 must-haves verified
overrides_applied: 0
---

# Phase 29 Verification Report

**Phase Goal:** The revolved-shape surface ships package-first through `@tx-code/occt-core`, published typings, docs, and authoritative release coverage.
**Status:** passed

## Must-Have Truths

| # | Truth | Status | Evidence |
| --- | --- | --- | --- |
| 1 | `@tx-code/occt-core` exposes typed wrappers for revolved-shape validation, build, and exact-open flows. | ✓ VERIFIED | `packages/occt-core/src/occt-core.js`, `packages/occt-core/src/index.d.ts`, and `packages/occt-core/test/core.test.mjs` cover the wrapper surface. |
| 2 | Docs, typings, and the authoritative release gate enforce the generic revolved-shape contract without widening unconditional secondary-surface checks. | ✓ VERIFIED | `README.md`, `packages/occt-core/README.md`, `test/release_governance_contract.test.mjs`, and `package.json` all route through `npm run test:release:root`. |

## Command Verification

| Command | Result |
| --- | --- |
| `npm run build:wasm:win` | PASS |
| `npm --prefix packages/occt-core test` | PASS |
| `npm test` | PASS |
| `npm run test:release:root` | PASS |
| `npm --prefix demo test` | PASS |
| `npm --prefix demo run build` | PASS |
| `npm --prefix demo run test:e2e` | PASS |

## Requirement Coverage

| Requirement | Status | Evidence |
| --- | --- | --- |
| `SDK-01` | ✓ SATISFIED | Package-first wrappers and typings ship through `@tx-code/occt-core` |
| `GOV-01` | ✓ SATISFIED | Root/package docs and release-governance tests lock the revolved-shape contract |

## Conclusion

Phase 29 is complete and verified. `v1.8` execution is complete and the milestone is ready for closeout/archive workflow.
