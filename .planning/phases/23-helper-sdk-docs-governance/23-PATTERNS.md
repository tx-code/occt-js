# Phase 23: Helper SDK Docs & Governance - Pattern Map

**Mapped:** 2026-04-18
**Files analyzed:** 11 scoped files
**Analogs found:** 11 / 11

Phase 23 does not invent a new product surface. It formalizes the helper family already shipped in Phases 21-22 by extending the existing package-first documentation rhythm, adding a missing package-local typing/export contract for `@tx-code/occt-core`, and widening the current regex-style release-governance suites to cover helper semantics. The safest pattern is: keep `@tx-code/occt-core` as the primary documented entrypoint, keep the root README and `dist/occt-js.d.ts` as lower-level carrier references, and lock drift through focused root/package contract tests instead of broad demo or viewer coverage.

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|-------------------|------|-----------|----------------|---------------|
| `README.md` | root contract docs | lower-level carrier reference | current file (`Import Appearance Contract`, `Exact Measurement SDK`) | exact |
| `packages/occt-core/README.md` | package-first docs | downstream adapter reference | current file | exact |
| `docs/sdk/measurement.md` | deep SDK guide | package-first walkthrough | current file | exact |
| `packages/occt-core/package.json` | package metadata | published package entrypoint surface | current file plus root `package.json` typing/export pattern | partial |
| `packages/occt-core/src/index.d.ts` (or equivalent package-local typings) | package typings | package-first SDK contract | `dist/occt-js.d.ts` | partial |
| `packages/occt-core/src/index.js` | JS barrel | package public surface | current file | exact |
| `test/release_governance_contract.test.mjs` | release-governance assertions | README / release script / typing wording lock | current file | exact |
| `test/package_tarball_contract.test.mjs` | root tarball assertions | published root package contract | current file | exact |
| `test/dist_contract_consumers.test.mjs` | consumer-path assertions | docs and install-path contract | current file | exact |
| `package.json` | authoritative release script surface | root release boundary | current file | exact |
| `packages/occt-core/test/*.test.mjs` | package governance assertions | package README / types / export parity | current file (`core.test.mjs`) plus root governance test style | partial |

## Pattern Assignments

### `README.md`, `packages/occt-core/README.md`, and `docs/sdk/measurement.md`

**Scope:** Required. These are the main documentation surfaces that currently lag the shipped helper family.

**Analog:** existing appearance-contract and exact measurement docs already in the repo

Planner note: extend the existing exact SDK sections in place. Keep the same package-first / lower-level-root split, but update the wording to reflect that supported hole/chamfer/helper semantics now ship while richer feature discovery and viewer UX remain downstream.

---

### `packages/occt-core/package.json` plus package-local `.d.ts`

**Scope:** Required. Phase 23 needs an explicit package typing/export surface.

**Analog 1:** root `package.json` typing/export pattern

**Analog 2:** `dist/occt-js.d.ts` as the repository's existing public typing style

Planner note: publish a package-local type entry for `@tx-code/occt-core` that mirrors the JS barrel and models the package-first helper methods callers actually use. Keep the surface additive and package-owned; do not force consumers to stitch package docs together with root-only carrier types.

---

### Root governance tests in `test/`

**Scope:** Required. Root release governance currently locks appearance and placement/relation wording but not the helper family.

**Analog:** `test/release_governance_contract.test.mjs`, `test/package_tarball_contract.test.mjs`, and `test/dist_contract_consumers.test.mjs`

Planner note: use the existing regex/assertion style rather than inventing a new test harness. Expand these suites to assert helper docs, helper release-gate coverage, and the narrowed downstream-boundary wording.

---

### Package governance tests under `packages/occt-core/test/`

**Scope:** Required if package-local typings/exports are added.

**Analog:** package contract tests in `packages/occt-core/test/core.test.mjs` plus root governance-style package metadata assertions

Planner note: keep package-governance checks in the package lane that already runs inside `npm --prefix packages/occt-core test`. Use them to assert README wording, package metadata, exported type entrypoints, and presence of the helper methods in the typed public surface.

## Shared Patterns

### Extend docs in place rather than forking SDK guides

**Source:** `README.md`, `packages/occt-core/README.md`, `docs/sdk/measurement.md`

The repo already uses a layered doc model: root README for carrier reference, package README for primary downstream entrypoint, and one deeper SDK guide. Phase 23 should preserve that layout and update it in place instead of introducing helper-only doc sprawl.

### Keep governance root-first and secondary surfaces conditional

**Source:** `AGENTS.md`, `package.json`, `test/release_governance_contract.test.mjs`

Helper docs and contracts now belong in the authoritative root release gate, but demo/Babylon/Tauri checks still do not. Governance expansions should stay on root/package surfaces only.

### Regex-style contract assertions are the house pattern

**Source:** `test/release_governance_contract.test.mjs`, `test/package_tarball_contract.test.mjs`, `test/dist_contract_consumers.test.mjs`

This repo already locks docs, scripts, and exported typing surfaces by asserting exact wording or key symbols. Phase 23 should reuse that style for helper semantics instead of inventing snapshot or browser-based docs verification.

## No Analog Found

None. Every planned Phase 23 artifact has a direct in-repo analog from the appearance and exact measurement documentation/governance work.

## Metadata

**Analog search scope:** `README.md`, `packages/occt-core/`, `docs/sdk/measurement.md`, `package.json`, `test/`, `.planning/phases/21-*`, `.planning/phases/22-*`
