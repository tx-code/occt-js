---
phase: 32-occt-core-sdk-and-governance-for-profile-solids
plan: "02"
subsystem: governance-and-docs
tags: [docs, governance, release-gate, profile-solids]
requirements-completed: [GOV-02]
completed: 2026-04-21
---

# Phase 32 Plan 02 Summary

**Docs, tarball checks, and release governance now lock the shared-profile and extruded-shape contract end to end.**

## Outcome

Completed documentation, governance, and GSD state lock-in for the shared-profile and extruded-shape contract.

- Updated root and package README surfaces to describe the generic `Profile2D` plus extruded-shape contract while keeping tool-library schemas and viewer policy downstream.
- Extended package-contract, tarball-contract, and release-governance tests so drift in shared-profile or extruded-shape docs/typings now fails explicitly.
- Marked Phase 32 complete in `.planning/ROADMAP.md` and advanced `.planning/STATE.md` / `.planning/PROJECT.md` to reflect that `v1.9` implementation scope is complete and ready for milestone closeout.

## Files Changed

- `README.md`
- `packages/occt-core/README.md`
- `test/release_governance_contract.test.mjs`
- `test/package_tarball_contract.test.mjs`
- `.planning/PROJECT.md`
- `.planning/ROADMAP.md`
- `.planning/STATE.md`

## Verification

- `npm --prefix packages/occt-core test`
- `node --test test/release_governance_contract.test.mjs test/package_tarball_contract.test.mjs`
- `npm run test:planning:audit`
- `npm test`
- `npm run test:release:root`

## Notes

- The authoritative release boundary remains unchanged: `npm run test:release:root` stays root-runtime-first, while `.planning` audits remain separate and conditional secondary surfaces stay outside the unconditional gate.
